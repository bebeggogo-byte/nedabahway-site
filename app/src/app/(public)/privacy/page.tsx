import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BUSINESS_INFO, DATA_PROCESSORS } from "@/lib/business-info";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "네다바웨이 코칭 SaaS 개인정보처리방침.",
};

export default function PrivacyPage() {
  const b = BUSINESS_INFO;
  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <div className="kicker">Privacy · 개인정보처리방침</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          개인정보처리방침
        </h1>
        <p className="body" style={{ color: "var(--color-mute)", marginTop: 8 }}>
          시행일: {b.privacyVersion} · 버전 v1
        </p>

        <article className="prose" style={{ marginTop: 32, lineHeight: 1.8 }}>
          <p>
            {b.legalName}(이하 &ldquo;회사&rdquo;)은 개인정보보호법(이하 &ldquo;PIPA&rdquo;)을 비롯한 관련 법령에 따라
            이용자의 개인정보를 보호하기 위해 본 개인정보처리방침을 수립·공개합니다.
          </p>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">1. 개인정보의 처리 목적</h2>
            <p>회사는 다음 목적을 위해 개인정보를 처리합니다.</p>
            <ol>
              <li>회원 가입·관리 (본인 확인, 부정 이용 방지)</li>
              <li>서비스 제공 (트랙 등록, 워크시트 작성, 코치 매칭, AI 가이드 생성)</li>
              <li>결제 및 환불 처리</li>
              <li>안내 메일 발송 (회원가입 인증 · 결제 완료 · 환불 처리 · 세션 알림)</li>
              <li>분쟁 해결 및 민원 처리</li>
            </ol>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">2. 처리하는 개인정보 항목</h2>
            <h3 className="h3">필수 수집 항목</h3>
            <ul>
              <li>이메일 (회원 식별 및 로그인)</li>
              <li>비밀번호 (해시 처리, 원본 미저장)</li>
              <li>이름 (코치·학생 표시)</li>
              <li>생년월일 (만 14세 미만 식별용)</li>
            </ul>
            <h3 className="h3">선택 수집 항목</h3>
            <ul>
              <li>전화번호 (긴급 연락용)</li>
              <li>마케팅 수신 동의</li>
              <li>보호자 이메일 (만 14세 미만 가입 시 필수)</li>
            </ul>
            <h3 className="h3">서비스 이용 중 자동 수집 항목</h3>
            <ul>
              <li>워크시트 응답 텍스트 (이용자 본인이 작성한 코칭 입력)</li>
              <li>워크시트 작성 행동 로그 (포커스·아이들·붙여넣기 등 이상 패턴 탐지용)</li>
              <li>접속 IP, User-Agent (보안·감사 목적)</li>
            </ul>
            <p>
              결제 카드 정보는 회사가 직접 수집·저장하지 않으며,
              결제대행사(토스페이먼츠)가 PCI-DSS 기준에 따라 처리합니다.
            </p>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">3. 개인정보의 보유·이용 기간</h2>
            <ul>
              <li>회원 정보: 회원 탈퇴 시까지</li>
              <li>결제·환불 기록: <strong>전자상거래법 제6조에 따라 5년</strong></li>
              <li>접속 로그: 통신비밀보호법에 따라 3개월</li>
              <li>워크시트 응답: 회원 탈퇴 시까지 (탈퇴 후 30일 내 삭제)</li>
              <li>이상 행동 로그: 6개월</li>
            </ul>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">4. 제3자 제공</h2>
            <p>
              회사는 이용자의 개인정보를 본 처리방침에서 명시한 경우 외에는 외부에 제공하지 않습니다.
              다만 다음의 경우는 예외로 합니다.
            </p>
            <ol>
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차에 따라 수사기관의 요구가 있는 경우</li>
            </ol>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">5. 개인정보 처리 위탁</h2>
            <p>회사는 서비스 제공을 위해 다음 업체에 개인정보 처리를 위탁하고 있습니다.</p>
            <table style={{ marginTop: 16, width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-line)" }}>
                  <th style={{ padding: 12, textAlign: "left" }}>수탁자</th>
                  <th style={{ padding: 12, textAlign: "left" }}>위탁 업무</th>
                  <th style={{ padding: 12, textAlign: "left" }}>보관 국가</th>
                </tr>
              </thead>
              <tbody>
                {DATA_PROCESSORS.map((p) => (
                  <tr key={p.name} style={{ borderBottom: "1px solid var(--color-line)" }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: 12 }}>{p.purpose}</td>
                    <td style={{ padding: 12 }}>{p.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 16, fontSize: ".88rem", color: "var(--color-mute)" }}>
              위탁업체 변경 시 본 처리방침 시행일을 갱신하여 공지합니다.
            </p>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">6. 정보주체의 권리</h2>
            <p>이용자는 회사에 대해 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ol>
              <li>개인정보 열람 요구 (대시보드 → 내 정보)</li>
              <li>개인정보 정정·삭제 요구 (대시보드 → 내 정보 → 수정)</li>
              <li>개인정보 처리정지 요구 (이메일 신청)</li>
              <li>회원 탈퇴 요구 (대시보드 → 회원 탈퇴)</li>
            </ol>
            <p>위 권리 행사는 회사의 개인정보 보호책임자에게 이메일로 신청할 수 있으며, 회사는 지체없이 조치합니다.</p>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">7. 만 14세 미만 아동의 개인정보 처리 (PIPA 22조)</h2>
            <p>
              회사는 만 14세 미만 아동의 개인정보를 수집하기 전에 법정대리인(보호자)의 동의를 받습니다.
              동의 절차는 다음과 같이 진행됩니다.
            </p>
            <ol>
              <li>아동이 회원가입 시 보호자 이메일을 입력합니다.</li>
              <li>회사는 보호자 이메일로 동의 요청 링크를 발송합니다.</li>
              <li>보호자가 링크를 통해 동의 의사를 표시하면 동의가 성립됩니다.</li>
              <li>동의 기록(보호자 이메일·동의 방법·동의 시각·접속 IP)은 별도 테이블에 저장됩니다.</li>
              <li>보호자 동의가 완료되지 않은 아동은 회원가입이 제한됩니다.</li>
            </ol>
            <p>
              회사는 보호자가 아동의 개인정보 열람·정정·삭제·처리정지를 요구할 수 있으며,
              회사는 지체없이 조치합니다.
            </p>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">8. 개인정보 안전성 확보 조치</h2>
            <ul>
              <li>비밀번호 단방향 해시 처리 (bcrypt)</li>
              <li>개인정보 암호화 (저장 시 AES-256 / 전송 시 TLS 1.2 이상)</li>
              <li>접근 권한 관리 (Role-Based Access Control + Row-Level Security)</li>
              <li>접속 기록 보관 및 위·변조 방지</li>
              <li>외부 침입 방지 (DDoS 방어, WAF, 보안 패치 정기 적용)</li>
            </ul>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">9. 개인정보 보호책임자</h2>
            <ul>
              <li>성명: {b.privacyOfficerName}</li>
              <li>이메일: <a href={`mailto:${b.privacyOfficerEmail}`}>{b.privacyOfficerEmail}</a></li>
              <li>전화: {b.phone}</li>
            </ul>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 className="h2">10. 권익침해 구제 방법</h2>
            <p>개인정보 침해로 인한 신고나 상담이 필요하신 경우 아래 기관에 문의하시기 바랍니다.</p>
            <ul>
              <li>
                개인정보분쟁조정위원회 — <a href="https://www.kopico.go.kr" target="_blank" rel="noopener">www.kopico.go.kr</a> · 1833-6972
              </li>
              <li>
                개인정보침해신고센터 — <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener">privacy.kisa.or.kr</a> · 118
              </li>
              <li>
                대검찰청 사이버범죄수사단 — <a href="https://www.spo.go.kr" target="_blank" rel="noopener">www.spo.go.kr</a> · 1301
              </li>
              <li>
                경찰청 사이버수사국 — <a href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener">ecrm.cyber.go.kr</a> · 182
              </li>
            </ul>
          </section>

          <p style={{ marginTop: 48, color: "var(--color-mute)", fontSize: ".9rem" }}>
            최종 변경: {b.privacyVersion}
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
