/**
 * 운영 검증용 메일 테스트 라우트.
 *
 * 호출 방법:
 *   curl -X POST 'http://localhost:3000/api/_internal/email-test?type=signup_verification' \
 *     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
 *
 * 또는:
 *   GET /api/_internal/email-test?all=1 → 4종 모두 발송
 *
 * service_role 키 검증 후 사장님 본인 메일로 발송.
 * 운영 환경 1회 호출하여 4종 메일이 사장님 메일에 도착하는지 확인.
 */
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { BUSINESS_INFO } from "@/lib/business-info";
import {
  sendSignupVerification,
  sendPaymentSuccess,
  sendRefundProcessed,
  sendSessionReminder,
} from "@/server/email/send";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return token === env.supabase.serviceRoleKey && token !== "";
}

const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"; // 가짜 UUID (notifications row 미기록)

async function runTest(type: string, to: string) {
  switch (type) {
    case "signup_verification":
      return sendSignupVerification(to, "", {
        displayName: "테스트 사용자",
        verifyUrl: "https://app.nedabahway.com/auth/verify?token=test_token_xxx",
      });
    case "payment_success":
      return sendPaymentSuccess(to, "", {
        displayName: "테스트 사용자",
        trackName: "STARCP 마스터",
        amountKrw: 4_000_000,
        firstSessionDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
        dashboardUrl: "https://app.nedabahway.com/dashboard",
      });
    case "refund_processed":
      return sendRefundProcessed(to, "", {
        displayName: "테스트 사용자",
        originalAmountKrw: 4_000_000,
        refundAmountKrw: 2_000_000,
        refundRate: 0.5,
        reasonCode: "before_first_session",
        processedAt: new Date().toISOString(),
      });
    case "session_reminder":
      return sendSessionReminder(to, "", {
        displayName: "테스트 사용자",
        sessionTitle: "STARCP S — 학생의 상황 듣기",
        sessionDate: new Date(Date.now() + 86400_000).toISOString(),
        meetingUrl: "https://meet.example.com/test",
        worksheetUrl: "https://app.nedabahway.com/sessions/test",
        worksheetIncomplete: true,
      });
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const all = url.searchParams.get("all") === "1";
  const to = url.searchParams.get("to") ?? BUSINESS_INFO.email;

  const results: Array<{ type: string; result: unknown; error?: string }> = [];

  if (all) {
    for (const t of [
      "signup_verification",
      "payment_success",
      "refund_processed",
      "session_reminder",
    ]) {
      try {
        const r = await runTest(t, to);
        results.push({ type: t, result: r });
      } catch (e) {
        results.push({ type: t, result: null, error: e instanceof Error ? e.message : "unknown" });
      }
    }
  } else if (type) {
    try {
      const r = await runTest(type, to);
      results.push({ type, result: r });
    } catch (e) {
      results.push({ type, result: null, error: e instanceof Error ? e.message : "unknown" });
    }
  } else {
    return NextResponse.json(
      { error: "Provide ?type=... or ?all=1" },
      { status: 400 }
    );
  }

  void TEST_USER_ID; // suppress unused warning while keeping documentation
  return NextResponse.json({ to, results });
}

export const POST = GET;
