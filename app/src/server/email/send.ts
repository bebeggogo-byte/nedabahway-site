/**
 * 4종 트랜잭션 메일 발송 wrapper.
 *
 * 각 함수:
 *   1) 템플릿 HTML 렌더링
 *   2) Resend SDK 호출 (또는 dev mock)
 *   3) notifications 테이블에 발송 이력 기록
 *   4) 실패 시에도 row INSERT (status: failed) — 운영 디버깅
 */
import { sendEmail, type SendEmailResult } from "./client";
import {
  signupVerificationHtml,
  paymentSuccessHtml,
  refundProcessedHtml,
  sessionReminderHtml,
  type SignupVerificationVars,
  type PaymentSuccessVars,
  type RefundProcessedVars,
  type SessionReminderVars,
} from "./templates";
import { createAdminClient } from "@/lib/supabase/server";

type EmailType =
  | "signup_verification"
  | "payment_success"
  | "refund_processed"
  | "session_reminder";

interface DispatchOpts {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  userId?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
}

async function dispatch(opts: DispatchOpts): Promise<SendEmailResult> {
  let result: SendEmailResult;
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | undefined;

  try {
    result = await sendEmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      tags: [{ name: "type", value: opts.type }],
      idempotencyKey: opts.idempotencyKey,
    });
  } catch (e) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : "unknown";
    result = { id: "failed", mocked: false };
  }

  // notifications 기록 (userId 있으면)
  if (opts.userId) {
    try {
      const sb = createAdminClient();
      await sb.from("notifications").insert({
        user_id: opts.userId,
        kind: opts.type,
        channel: "email",
        status: status === "sent" ? "sent" : "failed",
        payload: {
          message_id: result.id,
          to: opts.to,
          subject: opts.subject,
          ...(errorMessage ? { error: errorMessage } : {}),
          ...(opts.payload ?? {}),
        },
        sent_at: status === "sent" ? new Date().toISOString() : null,
      });
    } catch (e) {
      // notifications INSERT 실패는 발송 자체를 막지 않음
      console.error("[email] notifications INSERT 실패:", e);
    }
  }

  if (status === "failed") {
    throw new Error(`[email:${opts.type}] ${errorMessage}`);
  }
  return result;
}

// ============================================================
// 1. 회원가입 이메일 인증
// ============================================================
export async function sendSignupVerification(
  to: string,
  userId: string,
  vars: SignupVerificationVars
): Promise<SendEmailResult> {
  return dispatch({
    to,
    userId,
    subject: `[네다바웨이] 이메일 인증을 완료해 주십시오`,
    html: signupVerificationHtml(vars),
    type: "signup_verification",
    payload: { displayName: vars.displayName },
  });
}

// ============================================================
// 2. 결제 완료
// ============================================================
export async function sendPaymentSuccess(
  to: string,
  userId: string,
  vars: PaymentSuccessVars
): Promise<SendEmailResult> {
  return dispatch({
    to,
    userId,
    subject: `[네다바웨이] ${vars.trackName} 결제가 완료되었습니다`,
    html: paymentSuccessHtml(vars),
    type: "payment_success",
    payload: { trackName: vars.trackName, amountKrw: vars.amountKrw },
    idempotencyKey: `payment-success-${userId}-${vars.trackName}`,
  });
}

// ============================================================
// 3. 환불 처리 완료
// ============================================================
export async function sendRefundProcessed(
  to: string,
  userId: string,
  vars: RefundProcessedVars
): Promise<SendEmailResult> {
  return dispatch({
    to,
    userId,
    subject: `[네다바웨이] 환불이 처리되었습니다`,
    html: refundProcessedHtml(vars),
    type: "refund_processed",
    payload: {
      refundAmountKrw: vars.refundAmountKrw,
      reasonCode: vars.reasonCode,
    },
    idempotencyKey: `refund-${userId}-${vars.processedAt}`,
  });
}

// ============================================================
// 4. 세션 알림 (24시간 전, daily cron이 트리거)
// ============================================================
export async function sendSessionReminder(
  to: string,
  userId: string,
  vars: SessionReminderVars
): Promise<SendEmailResult> {
  return dispatch({
    to,
    userId,
    subject: `[네다바웨이] 24시간 후 세션: ${vars.sessionTitle}`,
    html: sessionReminderHtml(vars),
    type: "session_reminder",
    payload: { sessionTitle: vars.sessionTitle, sessionDate: vars.sessionDate },
    idempotencyKey: `session-reminder-${userId}-${vars.sessionDate}`,
  });
}
