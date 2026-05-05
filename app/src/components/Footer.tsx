import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/business-info";

/**
 * 사이트 공통 푸터.
 * 전자상거래법 시행령 13조 — 사업자 정보 + 약관 4종 링크 의무.
 */
export function Footer() {
  const b = BUSINESS_INFO;
  return (
    <footer
      style={{
        marginTop: 64,
        padding: "32px 24px 48px",
        borderTop: "1px solid var(--color-line, #e0e0e0)",
        background: "var(--color-bg-soft, #f8f8f8)",
        fontSize: ".88rem",
        lineHeight: 1.7,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 600 }}>{b.legalName} · {b.englishName}</div>

        <div style={{ color: "var(--color-mute, #666)", display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
          <span>대표 {b.representativeName}</span>
          <span aria-hidden="true">·</span>
          <span>사업자등록번호 {b.businessNumber}</span>
          <span aria-hidden="true">·</span>
          <span>통신판매업신고 {b.ecommerceNumber}</span>
          <span aria-hidden="true">·</span>
          <span>{b.address}</span>
          <span aria-hidden="true">·</span>
          <span>고객센터 {b.phone}</span>
          <span aria-hidden="true">·</span>
          <span>
            <a href={`mailto:${b.email}`} style={{ color: "inherit" }}>
              {b.email}
            </a>
          </span>
        </div>

        <nav
          aria-label="법적 정보"
          style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 8 }}
        >
          <Link href="/terms" style={{ color: "inherit" }}>
            이용약관
          </Link>
          <Link href="/privacy" style={{ color: "inherit", fontWeight: 600 }}>
            개인정보처리방침
          </Link>
          <Link href="/refund-policy" style={{ color: "inherit" }}>
            환불정책
          </Link>
          <Link href="/business-info" style={{ color: "inherit" }}>
            사업자정보
          </Link>
        </nav>

        <div style={{ color: "var(--color-mute, #666)", fontSize: ".82rem" }}>
          © {new Date().getFullYear()} {b.legalName}. 호스팅: {b.hostingProvider.name}.
        </div>
      </div>
    </footer>
  );
}
