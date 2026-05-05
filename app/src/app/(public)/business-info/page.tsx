import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BUSINESS_INFO } from "@/lib/business-info";

export const metadata: Metadata = {
  title: "사업자 정보",
  description: "전자상거래법 시행령 13조에 따른 사업자 정보 표시.",
};

export default function BusinessInfoPage() {
  const b = BUSINESS_INFO;
  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <div className="kicker">Business · 사업자 정보</div>
        <h1 className="h1" style={{ marginTop: 12 }}>사업자 정보</h1>
        <p className="body" style={{ color: "var(--color-mute)", marginTop: 8 }}>
          전자상거래 등에서의 소비자보호에 관한 법률 시행령 제13조에 따라 표시합니다.
        </p>

        <section className="card" style={{ marginTop: 32 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["상호", b.legalName],
                ["영문 상호", b.englishName],
                ["대표자", b.representativeName],
                ["사업자등록번호", b.businessNumber],
                ["통신판매업신고번호", b.ecommerceNumber],
                ["사업장 주소", b.address],
                ["고객센터 전화", b.phone],
                ["대표 이메일", b.email],
                ["호스팅 사업자", `${b.hostingProvider.name} (${b.hostingProvider.country})`],
                ["서비스 도메인", b.domain],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid var(--color-line)" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      width: "40%",
                      fontWeight: 600,
                      verticalAlign: "top",
                    }}
                  >
                    {label}
                  </th>
                  <td style={{ padding: "12px 16px" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 className="h2">개인정보 보호책임자</h2>
          <p style={{ marginTop: 12 }}>
            {b.privacyOfficerName} · <a href={`mailto:${b.privacyOfficerEmail}`}>{b.privacyOfficerEmail}</a>
          </p>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 className="h2">관련 페이지</h2>
          <ul style={{ marginTop: 12, lineHeight: 2 }}>
            <li><a href="/terms">이용약관</a></li>
            <li><a href="/privacy">개인정보처리방침</a></li>
            <li><a href="/refund-policy">환불 정책</a></li>
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
