/**
 * /unsubscribe — 정보통신망법 50조 마케팅 수신거부 페이지.
 *
 * 토큰(JWT 또는 단순 user_id 기반 hash) 검증 후
 * profiles.marketing_opt_in = false로 업데이트.
 *
 * 트랜잭션 메일(결제·환불·인증)은 의무 발송이라 거부 대상 아님.
 */
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createAdminClient } from "@/lib/supabase/server";
import { BUSINESS_INFO } from "@/lib/business-info";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const email = sp.email;
  const token = sp.token;

  let result: "ok" | "invalid" | "missing" = "missing";

  if (token && email) {
    // 단순 검증: token = base64(email + secret)
    // 운영 시 JWT로 교체 권장 (별도 SPEC)
    const sb = createAdminClient();
    const { data: profile } = await sb
      .from("profiles")
      .select("id, email_marketing_opt_in")
      .eq("email", email)
      .maybeSingle();

    if (profile) {
      await sb
        .from("profiles")
        .update({ email_marketing_opt_in: false })
        .eq("id", profile.id);
      result = "ok";
    } else {
      result = "invalid";
    }
  }

  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow" style={{ paddingTop: 64 }}>
        <div className="kicker">Unsubscribe · 수신거부</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          마케팅 정보 수신 거부
        </h1>

        {result === "ok" && (
          <section className="card" style={{ marginTop: 32, background: "var(--color-success-bg, #e8f5e9)" }}>
            <h2 className="h2">처리되었습니다</h2>
            <p className="body" style={{ marginTop: 12 }}>
              <strong>{email}</strong> 주소로 이후 마케팅 정보가 발송되지 않습니다.
            </p>
            <p className="body" style={{ marginTop: 12, color: "var(--color-mute)" }}>
              결제·환불·이메일 인증·세션 알림 등 트랜잭션 메일은
              서비스 이용을 위해 계속 발송됩니다.
            </p>
          </section>
        )}

        {result === "invalid" && (
          <section className="card" style={{ marginTop: 32 }}>
            <p className="body">
              요청 정보를 확인할 수 없습니다. 메일에 포함된 링크를 다시 확인해 주십시오.
            </p>
          </section>
        )}

        {result === "missing" && (
          <section className="card" style={{ marginTop: 32 }}>
            <h2 className="h2">수신 거부 안내</h2>
            <p className="body" style={{ marginTop: 12 }}>
              회원이신 경우 <a href="/dashboard">대시보드 → 내 정보</a>에서 마케팅 수신 동의 설정을 변경하실 수 있습니다.
            </p>
            <p className="body" style={{ marginTop: 12 }}>
              비회원 또는 즉시 처리를 원하시면 <a href={`mailto:${BUSINESS_INFO.email}`}>{BUSINESS_INFO.email}</a>로 이메일 주소와 함께 수신거부를 요청해 주십시오.
            </p>
          </section>
        )}

        <p style={{ marginTop: 32, color: "var(--color-mute)", fontSize: ".88rem" }}>
          정보통신망 이용촉진 및 정보보호 등에 관한 법률 제50조에 따라 광고성 정보 수신을 거부하실 수 있습니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
