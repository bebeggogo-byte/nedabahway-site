/**
 * Daily cron — 24시간 후 세션이 예정된 학생에게 알림 메일 발송.
 *
 * Vercel Cron: vercel.json의 "/api/cron/session-reminder" schedule "0 23 * * *"
 *   = 매일 KST 08:00 (UTC 23:00) 발송
 *
 * 인증: Vercel Cron이 자동으로 호출 (Authorization: Bearer $CRON_SECRET)
 * 또는 수동 호출은 service_role 키로
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { sendSessionReminder } from "@/server/email/send";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  // Vercel Cron uses CRON_SECRET; fallback to service_role for manual calls
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token === cronSecret) return true;
  if (token === env.supabase.serviceRoleKey && token !== "") return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createAdminClient();

  // 24시간 후 (±1h window) 시작될 세션 (status=open)
  const now = new Date();
  const start = new Date(now.getTime() + 23 * 3600_000).toISOString();
  const end = new Date(now.getTime() + 25 * 3600_000).toISOString();

  // session_progress + enrollments + session_templates + profiles 조인
  // (DB 함수로 빼는 게 더 깔끔하지만 cron 1회/day라 직접 쿼리)
  const { data: rows, error } = await sb
    .from("session_progress")
    .select(`
      id,
      status,
      scheduled_at,
      session_templates!inner(title, seq),
      enrollments!inner(
        user_id,
        track_id,
        profiles!inner(id, display_name, email)
      )
    `)
    .eq("status", "open")
    .gte("scheduled_at", start)
    .lt("scheduled_at", end)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    scheduled_at: string;
    session_templates: { title: string; seq: number };
    enrollments: {
      user_id: string;
      profiles: { id: string; display_name: string; email: string };
    };
  };

  const dispatched: Array<{ user_id: string; result: string }> = [];

  for (const r of (rows ?? []) as unknown as Row[]) {
    try {
      const profile = r.enrollments.profiles;
      const result = await sendSessionReminder(profile.email, profile.id, {
        displayName: profile.display_name,
        sessionTitle: r.session_templates.title,
        sessionDate: r.scheduled_at,
      });
      dispatched.push({ user_id: profile.id, result: result.id });
    } catch (e) {
      dispatched.push({
        user_id: r.enrollments.user_id,
        result: `failed: ${e instanceof Error ? e.message : "unknown"}`,
      });
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    window: { start, end },
    found: rows?.length ?? 0,
    dispatched,
  });
}
