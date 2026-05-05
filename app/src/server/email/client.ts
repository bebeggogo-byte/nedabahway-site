/**
 * Resend 클라이언트 + 발송 추상 레이어.
 * dev 모드에서 키 없으면 콘솔 출력만 (개발 편의).
 */
import { Resend } from "resend";
import { env } from "@/lib/env";
import { BUSINESS_INFO } from "@/lib/business-info";

const resend = env.resend.isConfigured ? new Resend(env.resend.apiKey) : null;

export const FROM = `${BUSINESS_INFO.legalName} <${env.resend.fromEmail}>`;
export const REPLY_TO = BUSINESS_INFO.email;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  tags?: { name: string; value: string }[];
  /** 같은 키의 메일은 24h 내 1회만 발송 (중복 방지) */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  id: string;
  mocked: boolean;
}

/**
 * 트랜잭션 메일 발송.
 *
 * - dev / RESEND_API_KEY 미설정: 콘솔 출력만 (mocked: true)
 * - 운영: Resend SDK 호출
 * - 발송 실패 시 throw (호출자가 try/catch + 로깅)
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY 미설정 — dev 모드, 발송 안 함");
    console.log("[email]", JSON.stringify(opts, null, 2));
    return { id: "dev-noop", mocked: true };
  }

  const headers: Record<string, string> = {};
  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    tags: opts.tags,
    headers,
  });

  if (error) {
    throw new Error(`[resend] 발송 실패: ${error.message}`);
  }
  return { id: data?.id ?? "unknown", mocked: false };
}

/**
 * 운영 알림용 — 사장님에게 직접 메일.
 * 시스템 에러·결제 실패·환불 신청 등 운영 신호 통지.
 */
export async function notifyOps(subject: string, body: string): Promise<void> {
  await sendEmail({
    to: BUSINESS_INFO.email,
    subject: `[운영] ${subject}`,
    html: `<pre style="font-family:-apple-system,Helvetica,sans-serif">${escapeHtml(body)}</pre>`,
    tags: [{ name: "type", value: "ops-notify" }],
  });
}

function escapeHtml(s: string): string {
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
