/**
 * 보호자 동의 처리 API.
 * /auth/parental-consent 페이지의 form action.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const token = String(fd.get("token") ?? "");
  const ip = String(fd.get("ip") ?? "") || (req.headers.get("x-forwarded-for") ?? "");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { data: rec, error: findErr } = await sb
    .from("signup_guardian_consents")
    .select("id, child_user_id, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (findErr || !rec) {
    return NextResponse.redirect(new URL("/auth/parental-consent?error=invalid", env.site.url));
  }

  if (rec.status === "consented") {
    return NextResponse.redirect(new URL("/auth/parental-consent/done?already=1", env.site.url));
  }

  const expired = new Date(rec.expires_at).getTime() < Date.now();
  if (expired) {
    await sb
      .from("signup_guardian_consents")
      .update({ status: "expired" })
      .eq("id", rec.id);
    return NextResponse.redirect(new URL("/auth/parental-consent?error=expired", env.site.url));
  }

  // 동의 확정
  await sb
    .from("signup_guardian_consents")
    .update({
      status: "consented",
      consented_at: new Date().toISOString(),
      consented_ip: ip || null,
    })
    .eq("id", rec.id);

  return NextResponse.redirect(new URL("/auth/parental-consent/done", env.site.url));
}
