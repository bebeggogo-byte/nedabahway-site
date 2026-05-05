/**
 * /auth/parental-consent?token=xxx
 *
 * 만 14세 미만 자녀의 가입에 대한 보호자 동의 페이지.
 * 메일 링크 클릭 → 토큰 검증 → 동의 확정 (signup_guardian_consents.status = 'consented')
 */
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createAdminClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ParentalConsentPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const token = sp.token ?? "";

  if (!token) {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow" style={{ paddingTop: 64 }}>
          <h1 className="h1">동의 링크 오류</h1>
          <p className="lead" style={{ marginTop: 12 }}>
            토큰이 없습니다. 메일에 포함된 정확한 링크를 사용해 주십시오.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const sb = createAdminClient();
  const { data: rec } = await sb
    .from("signup_guardian_consents")
    .select("id, child_user_id, status, expires_at, guardian_email")
    .eq("token", token)
    .maybeSingle();

  if (!rec) {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow" style={{ paddingTop: 64 }}>
          <h1 className="h1">동의 요청을 찾을 수 없습니다</h1>
          <p className="body" style={{ marginTop: 12 }}>
            토큰이 유효하지 않거나 이미 만료되었습니다. 자녀가 다시 가입을 신청하면 새 동의 링크가 발송됩니다.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const expired = new Date(rec.expires_at).getTime() < Date.now();
  if (expired) {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow" style={{ paddingTop: 64 }}>
          <h1 className="h1">동의 링크 만료</h1>
          <p className="body" style={{ marginTop: 12 }}>
            동의 링크가 만료되었습니다 (7일). 자녀가 다시 가입을 신청해 주십시오.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  if (rec.status === "consented") {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow" style={{ paddingTop: 64 }}>
          <h1 className="h1">이미 동의되었습니다</h1>
          <p className="body" style={{ marginTop: 12 }}>
            자녀의 가입이 정상 처리되었습니다.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  // 동의 처리 (POST submit form)
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? null;

  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow" style={{ paddingTop: 64 }}>
        <div className="kicker">Parental Consent · 보호자 동의</div>
        <h1 className="h1" style={{ marginTop: 12 }}>자녀 회원가입 동의</h1>

        <section className="card" style={{ marginTop: 32 }}>
          <p>
            자녀가 <strong>네다바웨이</strong> 코칭 서비스 회원가입을 신청하였습니다.
          </p>
          <p style={{ marginTop: 12 }}>
            만 14세 미만 아동의 개인정보 처리에는 보호자 동의가 법적으로 필요합니다
            (개인정보보호법 제22조).
          </p>
          <p style={{ marginTop: 12 }}>
            보호자께서는 다음 사항에 동의하시는지 확인해 주십시오:
          </p>
          <ul style={{ marginTop: 12, lineHeight: 1.8 }}>
            <li>자녀의 회원가입 및 서비스 이용 동의</li>
            <li>자녀의 개인정보 (이메일·이름·출생연도·워크시트 응답) 처리 동의</li>
            <li>자녀의 코칭 세션 진행 및 AI 학습 가이드 생성 동의</li>
          </ul>

          <form
            action="/api/auth/parental-consent"
            method="POST"
            style={{ marginTop: 24, display: "flex", gap: 12 }}
          >
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="ip" value={ip ?? ""} />
            <button className="btn btn--primary" type="submit">
              동의합니다 →
            </button>
            <a className="btn btn--ghost" href="/">
              거절
            </a>
          </form>

          <p style={{ marginTop: 24, fontSize: ".88rem", color: "var(--color-mute)" }}>
            보호자 이메일: {rec.guardian_email} · 만료: {new Date(rec.expires_at).toLocaleString("ko-KR")}
          </p>
        </section>

        <p style={{ marginTop: 32, color: "var(--color-mute)", fontSize: ".88rem" }}>
          개인정보보호법 제22조 및 시행령 제17조에 따른 법정대리인 동의 절차입니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
