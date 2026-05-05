import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 헬스체크 — UptimeRobot · Vercel · 외부 모니터링용.
 *
 * 200 ok: DB 연결 + 기본 시드 데이터 (tracks 테이블) 정상.
 * 503 fail: DB 또는 환경 문제.
 */
export async function GET() {
  const start = Date.now();
  let dbOk = false;
  let dbError: string | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("tracks").select("id").limit(1);
    if (error) {
      dbError = error.message;
    } else {
      dbOk = true;
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown";
  }

  const elapsed = Date.now() - start;

  return NextResponse.json(
    {
      ok: dbOk,
      timestamp: new Date().toISOString(),
      db: dbOk ? "ok" : "fail",
      dbError,
      latency_ms: elapsed,
      region: process.env.VERCEL_REGION ?? "local",
      env: process.env.NODE_ENV ?? "development",
    },
    {
      status: dbOk ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
