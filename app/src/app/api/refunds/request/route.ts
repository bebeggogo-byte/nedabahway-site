import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/refunds/request
 * body: { paymentId, studentReason }
 * → calculate_refund() 호출 → refund_requests insert (pending)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { paymentId?: string; studentReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const paymentId = body.paymentId;
  const studentReason = (body.studentReason ?? "").trim();
  if (!paymentId) {
    return NextResponse.json({ error: "missing_payment_id" }, { status: 400 });
  }
  if (studentReason.length < 10) {
    return NextResponse.json(
      { error: "reason_too_short", message: "사유는 10자 이상으로 입력해 주십시오." },
      { status: 400 }
    );
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, user_id, enrollment_id, status, amount_krw")
    .eq("id", paymentId)
    .single();

  const p = payment as { id: string; user_id: string; enrollment_id: string; status: string; amount_krw: number } | null;
  if (!p) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  if (p.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (p.status !== "paid") {
    return NextResponse.json({ error: "payment_not_eligible" }, { status: 409 });
  }

  // 이미 pending 요청이 있는지 확인
  const { count: existing } = await supabase
    .from("refund_requests")
    .select("*", { count: "exact", head: true })
    .eq("payment_id", paymentId)
    .in("status", ["pending", "approved"]);
  if ((existing ?? 0) > 0) {
    return NextResponse.json(
      { error: "already_requested", message: "이미 환불 요청이 진행 중입니다." },
      { status: 409 }
    );
  }

  // 비율 계산
  const { data: calc } = await supabase.rpc("calculate_refund", { p_payment_id: paymentId });
  const row = (calc as Array<{ rate: number; amount_krw: number; reason_code: string }>)?.[0];
  if (!row || row.reason_code === "not_eligible") {
    return NextResponse.json(
      { error: "not_eligible", message: "환불 가능 기간이 지났습니다." },
      { status: 409 }
    );
  }

  const { data: req, error } = await supabase
    .from("refund_requests")
    .insert({
      payment_id: paymentId,
      enrollment_id: p.enrollment_id,
      requested_by: user.id,
      student_reason: studentReason,
      calculated_rate: row.rate,
      calculated_amount_krw: row.amount_krw,
      reason_code: row.reason_code as "within_24h",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, refundRequestId: (req as { id: string }).id });
}
