import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cancelPayment } from "@/server/payments/toss-refund";

/**
 * POST /api/refunds/[id]/approve
 * 코치만 호출 가능. 토스 환불 → payments·enrollments 갱신.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "coach" && role !== "system_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // service role client for transactional updates
  const admin = createAdminClient();

  // refund_request 조회 + 잠금 (pending인지 체크)
  const { data: refund } = await admin
    .from("refund_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (!refund) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const r = refund as {
    id: string;
    payment_id: string;
    enrollment_id: string;
    status: string;
  };
  if (r.status !== "pending") {
    return NextResponse.json({ error: "not_pending" }, { status: 409 });
  }

  // payment 조회
  const { data: payment } = await admin
    .from("payments")
    .select("id, toss_payment_key, amount_krw, refunded_amount_krw, status")
    .eq("id", r.payment_id)
    .single();
  if (!payment) return NextResponse.json({ error: "payment_missing" }, { status: 404 });
  const p = payment as {
    id: string;
    toss_payment_key: string | null;
    amount_krw: number;
    refunded_amount_krw: number;
    status: string;
  };

  // 비율 재계산 (시간 흘렀을 수 있으므로 더 보수적)
  const { data: calc } = await admin.rpc("calculate_refund", { p_payment_id: p.id });
  const row = (calc as Array<{ rate: number; amount_krw: number; reason_code: string }>)?.[0];
  if (!row || row.reason_code === "not_eligible") {
    await admin.from("refund_requests").update({
      status: "rejected",
      reject_reason: "재계산 결과 환불 불가 시점.",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", id);
    return NextResponse.json({
      ok: false,
      error: "not_eligible_now",
      message: "재계산 결과 환불 가능 기간이 지났습니다.",
    });
  }

  // 토스 환불 호출
  const cancelResult = await cancelPayment({
    paymentKey: p.toss_payment_key ?? `mock-${p.id}`,
    cancelAmount: row.amount_krw,
    cancelReason: "고객 요청 환불",
  });

  if (!cancelResult.ok) {
    await admin.from("refund_requests").update({
      status: "failed",
      toss_refund_response: cancelResult.raw as never,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", id);
    return NextResponse.json({ ok: false, error: "toss_failed", detail: cancelResult.errorMessage });
  }

  // refund_requests · payments · enrollments 갱신
  const refundedTotal = (p.refunded_amount_krw ?? 0) + row.amount_krw;
  const isFullRefund = refundedTotal >= p.amount_krw;

  await admin.from("refund_requests").update({
    status: "completed",
    calculated_rate: row.rate,
    calculated_amount_krw: row.amount_krw,
    reason_code: row.reason_code as "within_24h",
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    refunded_at: new Date().toISOString(),
    toss_refund_response: cancelResult.raw as never,
  }).eq("id", id);

  await admin.from("payments").update({
    status: isFullRefund ? "refunded" : "partial_refunded",
    refunded_amount_krw: refundedTotal,
    refunded_at: new Date().toISOString(),
    refund_reason: "고객 요청 환불 (코치 승인)",
  }).eq("id", p.id);

  if (isFullRefund) {
    await admin.from("enrollments").update({
      status: "refunded",
    }).eq("id", r.enrollment_id);
  }

  // 알림 (in_app)
  const { data: refundReq } = await admin
    .from("refund_requests")
    .select("requested_by")
    .eq("id", id)
    .single();
  if (refundReq) {
    await admin.from("notifications").insert({
      user_id: (refundReq as { requested_by: string }).requested_by,
      kind: "refund_completed",
      payload: { refund_request_id: id, amount_krw: row.amount_krw },
      channel: "in_app",
      status: "queued",
    });
  }

  return NextResponse.json({
    ok: true,
    refunded_amount_krw: row.amount_krw,
    payment_status: isFullRefund ? "refunded" : "partial_refunded",
  });
}
