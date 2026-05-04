/**
 * 사업자 정보 단일 소스 (Single Source of Truth).
 * 푸터, /business-info, /terms, /privacy 모두 여기서 가져온다.
 *
 * 변경은 반드시 이 파일에서. 다른 곳에 하드코딩 금지.
 */

export const BUSINESS_INFO = {
  // ── 사업자 등록 정보 ───────────────────────────────────────
  legalName: "네다바웨이",
  englishName: "Nedabahway",
  representativeName: "김창환",
  businessNumber: "신청 진행 중", // 사업자등록번호 — 확정 후 갱신
  ecommerceNumber: "신청 진행 중", // 통신판매업신고번호 — 정부24 신청 후 갱신

  // ── 연락처 ─────────────────────────────────────────────────
  address: "제주특별자치도 서귀포시", // 정확한 사업장 주소 확정 후 갱신
  phone: "확정 예정", // 고객센터 전화번호
  email: "[email protected]", // 대표 이메일
  privacyOfficerEmail: "[email protected]", // 개인정보 보호책임자
  privacyOfficerName: "김창환",

  // ── 도메인 ─────────────────────────────────────────────────
  domain: "nedabahway.com",
  appDomain: "app.nedabahway.com", // SaaS 앱 도메인 (예정)

  // ── 호스팅 / 위탁업체 ──────────────────────────────────────
  hostingProvider: {
    name: "Vercel Inc.",
    country: "미국·EU",
  },

  // ── 정책 시행일 ────────────────────────────────────────────
  termsVersion: "2026-05-05",
  privacyVersion: "2026-05-05",
  refundVersion: "2026-05-05",

  // ── 분쟁 관할 ──────────────────────────────────────────────
  jurisdiction: "제주지방법원",
  governingLaw: "대한민국 법률",
} as const;

/**
 * 개인정보 처리 위탁업체 (PIPA 표준 처리방침 5조).
 * 신규 위탁 시 이 배열에 추가 + 처리방침 시행일 갱신.
 */
export const DATA_PROCESSORS = [
  {
    name: "Vercel Inc.",
    purpose: "웹 호스팅 · CDN",
    country: "미국 · EU",
  },
  {
    name: "Supabase Inc.",
    purpose: "데이터베이스 · 인증 · 파일 스토리지",
    country: "미국 · EU",
  },
  {
    name: "Resend",
    purpose: "트랜잭션 메일 발송 (회원가입 인증 · 결제 안내 · 환불 안내)",
    country: "미국",
  },
  {
    name: "Toss Payments",
    purpose: "결제 처리 · 환불 처리",
    country: "대한민국",
  },
  {
    name: "Anthropic PBC",
    purpose: "AI 학습 가이드 생성 (학생 워크시트 입력 기반)",
    country: "미국",
  },
] as const;

export type DataProcessor = (typeof DATA_PROCESSORS)[number];
