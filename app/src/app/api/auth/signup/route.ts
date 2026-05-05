/**
 * 회원가입 API — signup 페이지의 클라이언트 form이 호출.
 *
 * 처리 순서:
 *   1) Supabase Auth signUp (email_confirm: true 필요 시 메일 발송)
 *   2) profiles 테이블 upsert (display_name, birth_year, email_marketing_opt_in)
 *   3) consents 테이블 INSERT (약관 동의 기록 + 버전 추적)
 *   4) 만 14세 미만이면 signup_guardian_consents 테이블 INSERT (status: pending)
 *      → 보호자 이메일로 동의 링크 발송
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { BUSINESS_INFO } from "@/lib/business-info";
import { sendEmail } from "@/server/email/client";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!env.supabase.isConfigured) {
    return NextResponse.json({ error: "Supabase 설정 누락" }, { status: 500 });
  }

  const fd = await req.formData();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const displayName = String(fd.get("display_name") ?? "").trim();
  const birthYearRaw = String(fd.get("birth_year") ?? "");
  const birthYear = parseInt(birthYearRaw, 10) || null;
  const guardianEmail = String(fd.get("guardian_email") ?? "").trim().toLowerCase() || null;
  const marketing = fd.get("marketing") === "1";

  // 필수 동의 검증
  if (
    fd.get("terms") !== "1" ||
    fd.get("privacy") !== "1" ||
    fd.get("refund") !== "1"
  ) {
    return NextResponse.json({ error: "필수 약관에 동의해 주십시오." }, { status: 400 });
  }

  if (!email || !password || !displayName || !birthYear) {
    return NextResponse.json({ error: "모든 항목을 입력하십시오." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const isMinor = new Date().getFullYear() - birthYear < 14;
  if (isMinor && !guardianEmail) {
    return NextResponse.json(
      { error: "만 14세 미만은 보호자 이메일이 필요합니다." },
      { status: 400 }
    );
  }

  // 1) Supabase Auth signUp
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${env.site.url}/auth/callback`,
    },
  });

  if (authErr || !authData.user) {
    return NextResponse.json(
      { error: `가입 실패: ${authErr?.message ?? "알 수 없음"}` },
      { status: 400 }
    );
  }

  const userId = authData.user.id;
  const adminSb = createAdminClient();

  // 2) profiles upsert
  await adminSb.from("profiles").upsert({
    id: userId,
    display_name: displayName,
    role: "student",
    email,
    birth_year: birthYear,
    email_marketing_opt_in: marketing,
  });

  // 3) consents 기록
  const ip = req.headers.get("x-forwarded-for") ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  await adminSb.from("consents").insert({
    user_id: userId,
    terms_version: BUSINESS_INFO.termsVersion,
    privacy_version: BUSINESS_INFO.privacyVersion,
    refund_version: BUSINESS_INFO.refundVersion,
    parental: isMinor,
    marketing,
    age_over_14: !isMinor,
    ip,
    user_agent: ua,
  });

  // 4) 만 14세 미만 → 보호자 동의 흐름
  if (isMinor && guardianEmail) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString(); // 7일 유효

    await adminSb.from("signup_guardian_consents").insert({
      child_user_id: userId,
      guardian_email: guardianEmail,
      consent_method: "email_link",
      status: "pending",
      token,
      expires_at: expiresAt,
      requested_at: new Date().toISOString(),
    });

    const consentUrl = `${env.site.url}/auth/parental-consent?token=${token}`;

    try {
      await sendEmail({
        to: guardianEmail,
        subject: `[네다바웨이] 자녀 회원가입 동의 요청 — ${displayName}`,
        html: `
          <h1>자녀 회원가입 동의 요청</h1>
          <p>안녕하세요. ${displayName} 님의 보호자께,</p>
          <p>자녀가 ${BUSINESS_INFO.legalName} 회원가입을 신청하였습니다.
          만 14세 미만 아동의 가입에는 보호자 동의가 필요합니다 (PIPA 22조).</p>
          <p>아래 링크를 통해 동의해 주십시오 (7일 이내):</p>
          <p><a href="${consentUrl}">동의하기</a></p>
          <p>본인이 동의하지 않으시면 이 메일을 무시하시면 됩니다.
          7일 이내 동의가 없으면 자녀의 가입은 취소됩니다.</p>
          <p>문의: ${BUSINESS_INFO.email}</p>
        `,
        tags: [
          { name: "type", value: "parental_consent_request" },
          { name: "child_user_id", value: userId },
        ],
      });
    } catch (e) {
      console.error("[signup] 보호자 동의 메일 발송 실패:", e);
      // 메일 발송 실패해도 가입 자체는 성공 처리 (재발송 가능)
    }
  }

  return NextResponse.json({ ok: true, userId, isMinor });
}
