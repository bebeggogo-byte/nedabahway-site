import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BUSINESS_INFO } from "@/lib/business-info";

export const metadata: Metadata = {
  title: "이용약관",
  description: "네다바웨이 코칭 SaaS 이용약관.",
};

export default function TermsPage() {
  const b = BUSINESS_INFO;
  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <div className="kicker">Terms · 이용약관</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          {b.legalName} 이용약관
        </h1>
        <p className="body" style={{ color: "var(--color-mute)", marginTop: 8 }}>
          시행일: {b.termsVersion} · 버전 v1
        </p>

        <article className="prose" style={{ marginTop: 32, lineHeight: 1.8 }}>
          <section>
            <h2 className="h2">제1장 총칙</h2>

            <h3 className="h3">제1조 (목적)</h3>
            <p>
              본 약관은 {b.legalName}(이하 &ldquo;회사&rdquo;)이 제공하는 코칭 SaaS
              서비스(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여 회사와
              이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>

            <h3 className="h3">제2조 (정의)</h3>
            <ol>
              <li>&ldquo;이용자&rdquo;란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
              <li>&ldquo;회원&rdquo;이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 서비스를 지속적으로 이용할 수 있는 자를 말합니다.</li>
              <li>&ldquo;코치&rdquo;란 회사를 대표하여 1:1 코칭 세션을 수행하는 자를 말합니다.</li>
              <li>&ldquo;트랙&rdquo;이란 회사가 제공하는 5개 코칭 프로그램 단위(STARCP · IDEN 교사 · IDEN 진로 · 창직 · 5S 리더십)를 말합니다.</li>
            </ol>

            <h3 className="h3">제3조 (약관의 효력 및 변경)</h3>
            <ol>
              <li>본 약관은 서비스를 이용하고자 하는 모든 이용자에게 공시함으로써 효력이 발생합니다.</li>
              <li>회사는 합리적 사유가 있는 경우 약관을 변경할 수 있으며, 변경된 약관은 시행일로부터 7일 전에 공지합니다.</li>
              <li>이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 회원 탈퇴를 신청할 수 있습니다.</li>
            </ol>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">제2장 서비스</h2>

            <h3 className="h3">제4조 (서비스의 내용)</h3>
            <p>회사는 다음 각 호의 서비스를 제공합니다.</p>
            <ol>
              <li>5개 트랙 코칭 프로그램 (STARCP · IDEN 교사 · IDEN 진로 · 창직 · 5S 리더십)</li>
              <li>회기별 워크시트 작성 및 자동 저장</li>
              <li>코치 검토 및 피드백</li>
              <li>AI 기반 학습 가이드 (Anthropic Claude)</li>
              <li>IDEN 교사 트랙 한정 — 학교·반·학생 분석 도구</li>
            </ol>

            <h3 className="h3">제5조 (이용계약의 성립)</h3>
            <ol>
              <li>이용계약은 이용자가 본 약관에 동의하고 회원가입을 완료한 시점에 성립합니다.</li>
              <li>회원가입 후 트랙 등록 및 결제가 완료된 시점부터 해당 트랙의 코칭 서비스가 제공됩니다.</li>
            </ol>

            <h3 className="h3">제6조 (회원자격)</h3>
            <ol>
              <li>회원가입은 만 14세 이상부터 가능합니다.</li>
              <li>만 14세 미만 아동의 경우 법정대리인의 동의가 반드시 필요합니다 (제7장 참조).</li>
              <li>회사는 다음 각 호에 해당하는 신청에 대하여는 가입을 거절할 수 있습니다.
                <ol>
                  <li>실명이 아니거나 타인의 명의를 도용한 경우</li>
                  <li>허위 정보를 기재한 경우</li>
                  <li>서비스 이용 자격 정지 후 재가입을 신청한 경우</li>
                </ol>
              </li>
            </ol>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">제3장 의무</h2>

            <h3 className="h3">제7조 (회사의 의무)</h3>
            <ol>
              <li>회사는 안정적인 서비스 제공을 위해 노력합니다.</li>
              <li>회사는 이용자의 개인정보를 별도의 개인정보처리방침에 따라 보호합니다.</li>
              <li>회사는 이용자가 안전하게 서비스를 이용할 수 있도록 보안 시스템을 갖춥니다.</li>
            </ol>

            <h3 className="h3">제8조 (이용자의 의무)</h3>
            <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ol>
              <li>타인의 정보 도용</li>
              <li>서비스를 이용하여 얻은 정보를 회사 동의 없이 복제·유통하는 행위</li>
              <li>회사 또는 제3자의 저작권 등 지적재산권을 침해하는 행위</li>
              <li>외설 또는 폭력적인 콘텐츠를 게시하는 행위</li>
            </ol>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">제4장 결제 및 환불</h2>

            <h3 className="h3">제9조 (요금 및 결제)</h3>
            <ol>
              <li>각 트랙의 가격은 서비스 페이지에 명시된 금액으로 합니다.</li>
              <li>결제는 토스페이먼츠를 통해 처리되며, 회사는 카드 정보를 직접 저장하지 않습니다.</li>
              <li>분할 결제는 트랙별로 별도 안내합니다.</li>
            </ol>

            <h3 className="h3">제10조 (환불)</h3>
            <p>
              환불 정책은 별도 페이지(<a href="/refund-policy">환불 정책</a>)에 상세히 기재되어 있으며,
              4개 구간(24시간 이내 100% / 1회차 시작 전 50% / 1회차 종료 ~ 2회차 시작 전 30% / 그 외 0%)으로
              운영됩니다.
            </p>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">제5장 콘텐츠</h2>

            <h3 className="h3">제11조 (저작권)</h3>
            <ol>
              <li>회사가 제공하는 서비스 내 모든 콘텐츠(코칭 자료·워크시트 양식·AI 가이드 결과물 등)의 저작권은 회사에 귀속됩니다.</li>
              <li>이용자가 작성한 워크시트 응답의 저작권은 이용자에게 귀속됩니다. 다만 회사는 서비스 제공 및 개선을 위해 익명화된 형태로 활용할 수 있습니다.</li>
              <li>이용자는 회사 콘텐츠를 회사 동의 없이 외부에 복제·배포할 수 없습니다.</li>
            </ol>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">제6장 책임</h2>

            <h3 className="h3">제12조 (면책)</h3>
            <ol>
              <li>회사는 천재지변, 전쟁, 통신 장애 등 불가항력에 의한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>코칭 서비스 결과(취업·진로 결정 등)는 이용자 본인의 노력과 외부 환경에 좌우되며, 회사는 특정 결과를 보장하지 않습니다.</li>
            </ol>

            <h3 className="h3">제13조 (손해배상)</h3>
            <p>
              회사의 고의 또는 중과실로 이용자에게 손해가 발생한 경우 관련 법령에 따라 배상합니다.
              배상 한도는 이용자가 회사에 지급한 금액을 초과하지 않습니다.
            </p>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">제7장 미성년자 보호</h2>

            <h3 className="h3">제14조 (만 14세 미만 아동)</h3>
            <ol>
              <li>회사는 만 14세 미만 아동의 회원가입 시 법정대리인(이하 &ldquo;보호자&rdquo;)의 동의를 받습니다.</li>
              <li>보호자 동의는 가입 신청 시 입력한 보호자 이메일로 별도 동의 링크를 발송하여 받으며, 보호자가 링크를 통해 동의 의사를 표시한 시점에 동의가 성립합니다.</li>
              <li>회사는 보호자 동의 기록을 별도 테이블에 저장하며, 분쟁 발생 시 증거로 활용됩니다.</li>
              <li>보호자 동의가 완료되지 않은 경우 회원가입 및 서비스 이용이 제한됩니다.</li>
            </ol>

            <h3 className="h3">제15조 (만 14세 이상 ~ 18세 미만)</h3>
            <p>
              만 14세 이상 18세 미만의 회원이 결제를 진행하는 경우 보호자 동의를 권장합니다.
              회사는 결제 시 보호자 정보 입력란을 제공하나 의무는 아닙니다.
            </p>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">제8장 분쟁</h2>

            <h3 className="h3">제16조 (관할 법원 및 준거법)</h3>
            <p>
              본 약관과 관련된 분쟁은 {b.governingLaw}을 준거법으로 하며,
              관할 법원은 {b.jurisdiction}으로 합니다.
            </p>
          </section>

          <p style={{ marginTop: 48, color: "var(--color-mute)", fontSize: ".9rem" }}>
            최종 변경: {b.termsVersion}
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
