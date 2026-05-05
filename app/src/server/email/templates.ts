/**
 * 4종 트랜잭션 메일 템플릿.
 *
 * 모두 인라인 CSS — 이메일 클라이언트(Gmail·Outlook·Apple Mail) 호환.
 * 디자인: 흰 배경 + max-width 600 + 짙은 텍스트 + 푸터에 사업자 정보.
 *
 * React 컴포넌트 대신 단순 HTML 함수 — Resend는 string HTML을 받음.
 */
import { BUSINESS_INFO } from "@/lib/business-info";

const BRAND = BUSINESS_INFO.legalName;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.nedabahway.com";

function shell(bodyHtml: string, opts?: { hideFooter?: boolean }): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,'Pretendard',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:8px;margin:24px;">
        <tr><td style="padding:32px 32px 16px 32px;border-bottom:1px solid #e5e5e5;">
          <div style="font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:-0.01em;">${BRAND}</div>
        </td></tr>
        <tr><td style="padding:32px;line-height:1.7;font-size:15px;">
          ${bodyHtml}
        </td></tr>
        ${opts?.hideFooter ? "" : `<tr><td style="padding:24px 32px;border-top:1px solid #e5e5e5;color:#888;font-size:12px;line-height:1.6;">
          <div>${BUSINESS_INFO.legalName} · 대표 ${BUSINESS_INFO.representativeName}</div>
          <div>사업자등록번호 ${BUSINESS_INFO.businessNumber} · 통신판매업신고 ${BUSINESS_INFO.ecommerceNumber}</div>
          <div>${BUSINESS_INFO.address} · ${BUSINESS_INFO.phone}</div>
          <div style="margin-top:8px;">
            <a href="${SITE_URL}/terms" style="color:#888;margin-right:8px;">이용약관</a>
            <a href="${SITE_URL}/privacy" style="color:#888;margin-right:8px;">개인정보처리방침</a>
            <a href="${SITE_URL}/refund-policy" style="color:#888;">환불정책</a>
          </div>
        </td></tr>`}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr><td style="background:#1a1a1a;border-radius:6px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>
    </td></tr>
  </table>`;
}

function fmtKrw(amount: number): string {
  return `${(amount / 10000).toLocaleString("ko-KR")}만원`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

// ============================================================
// 1. 회원가입 이메일 인증
// ============================================================
export interface SignupVerificationVars {
  displayName: string;
  verifyUrl: string;
}

export function signupVerificationHtml(v: SignupVerificationVars): string {
  return shell(`
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;">${escape(v.displayName)} 님, 환영합니다.</h1>
    <p style="margin:0 0 16px 0;">아래 버튼을 눌러 이메일 인증을 완료해 주십시오.</p>
    ${button("이메일 인증하기", v.verifyUrl)}
    <p style="margin:24px 0 0 0;color:#666;font-size:13px;">링크는 24시간 동안 유효합니다. 본인이 가입 신청을 한 적이 없다면 이 메일을 무시하시면 됩니다.</p>
  `);
}

// ============================================================
// 2. 결제 완료
// ============================================================
export interface PaymentSuccessVars {
  displayName: string;
  trackName: string;
  amountKrw: number;
  firstSessionDate?: string;
  dashboardUrl: string;
}

export function paymentSuccessHtml(v: PaymentSuccessVars): string {
  const first = v.firstSessionDate
    ? `<p style="margin:0 0 8px 0;">첫 세션: <strong>${fmtDate(v.firstSessionDate)}</strong></p>`
    : "";
  return shell(`
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;">${escape(v.displayName)} 님, 결제가 완료되었습니다.</h1>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-top:1px solid #e5e5e5;">
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;"><span style="color:#666;">트랙</span></td><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;">${escape(v.trackName)}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;"><span style="color:#666;">결제 금액</span></td><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;">${fmtKrw(v.amountKrw)}</td></tr>
    </table>
    ${first}
    ${button("대시보드로 이동", v.dashboardUrl)}
    <p style="margin:24px 0 0 0;color:#666;font-size:13px;">
      환불은 <a href="${SITE_URL}/refund-policy" style="color:#666;">환불정책</a>에 따라 처리됩니다.
      세금계산서·영수증은 <a href="https://www.tosspayments.com" style="color:#666;">토스페이먼츠</a>에서 별도로 안내됩니다.
    </p>
  `);
}

// ============================================================
// 3. 환불 처리 완료
// ============================================================
export interface RefundProcessedVars {
  displayName: string;
  originalAmountKrw: number;
  refundAmountKrw: number;
  refundRate: number;
  reasonCode: string;
  processedAt: string;
}

export function refundProcessedHtml(v: RefundProcessedVars): string {
  const reasonLabel: Record<string, string> = {
    within_24h: "결제 후 24시간 이내",
    before_first_session: "1회차 시작 전",
    after_first_session: "1회차 종료 ~ 2회차 시작 전",
    not_eligible: "환불 불가 구간",
  };
  return shell(`
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;">${escape(v.displayName)} 님, 환불이 처리되었습니다.</h1>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-top:1px solid #e5e5e5;">
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;"><span style="color:#666;">원 결제액</span></td><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;text-align:right;">${fmtKrw(v.originalAmountKrw)}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;"><span style="color:#666;">환불 구간</span></td><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;text-align:right;">${reasonLabel[v.reasonCode] ?? v.reasonCode}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;"><span style="color:#666;">환불 비율</span></td><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;text-align:right;">${Math.round(v.refundRate * 100)}%</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;"><span style="color:#666;">환불 금액</span></td><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:700;">${fmtKrw(v.refundAmountKrw)}</td></tr>
      <tr><td style="padding:12px 0;"><span style="color:#666;">처리 일시</span></td><td style="padding:12px 0;text-align:right;">${fmtDate(v.processedAt)}</td></tr>
    </table>
    <p style="margin:24px 0 0 0;color:#666;font-size:13px;">
      환불 금액은 결제하신 카드사를 통해 반영됩니다. 카드사에 따라 영업일 기준 3~7일 소요될 수 있습니다.
      문의는 ${BUSINESS_INFO.email}로 주십시오.
    </p>
  `);
}

// ============================================================
// 4. 세션 알림 (24시간 전)
// ============================================================
export interface SessionReminderVars {
  displayName: string;
  sessionTitle: string;
  sessionDate: string;
  meetingUrl?: string;
  worksheetUrl?: string;
  worksheetIncomplete?: boolean;
}

export function sessionReminderHtml(v: SessionReminderVars): string {
  const meeting = v.meetingUrl
    ? `<p style="margin:0 0 8px 0;">화상 링크: <a href="${v.meetingUrl}" style="color:#1a1a1a;">${v.meetingUrl}</a></p>`
    : "";
  const worksheetWarn = v.worksheetIncomplete && v.worksheetUrl
    ? `<div style="background:#fff8e1;border:1px solid #f0c060;border-radius:6px;padding:12px 16px;margin:16px 0;">
        <strong>아직 워크시트를 작성하지 않으셨습니다.</strong> 코칭 효과를 위해 세션 전 작성을 부탁드립니다.
        <div style="margin-top:8px;"><a href="${v.worksheetUrl}" style="color:#1a1a1a;">→ 워크시트 작성하러 가기</a></div>
      </div>`
    : "";
  return shell(`
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;">${escape(v.displayName)} 님, 24시간 후 세션이 예정되어 있습니다.</h1>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-top:1px solid #e5e5e5;">
      <tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;"><span style="color:#666;">세션</span></td><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;">${escape(v.sessionTitle)}</td></tr>
      <tr><td style="padding:12px 0;"><span style="color:#666;">일시</span></td><td style="padding:12px 0;text-align:right;">${fmtDate(v.sessionDate)}</td></tr>
    </table>
    ${meeting}
    ${worksheetWarn}
    <p style="margin:24px 0 0 0;color:#666;font-size:13px;">불참이 부득이하시면 ${BUSINESS_INFO.email}로 미리 알려주십시오.</p>
  `);
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c] ?? c;
  });
}
