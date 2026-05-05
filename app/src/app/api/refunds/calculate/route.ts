import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/refunds/calculate
 * body: { paymentId }
 * → calculate_refund() 호출, 미리보기 반환
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { paymentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const paymentId = body.paymentId;
  if (!paymentId) {
    return NextResponse.json({ error: "missing_payment_id" }, { status: 400 });
  }

  // 본인 결제인지 확인 (RLS가 막아주지만 명시적 체크)
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .select("id, user_id, amount_krw, status")
    .eq("id", paymentId)
    .single();

  if (payErr || !payment) {
    return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  }
  const p = payment as { id: string; user_id: string; amount_krw: number; status: string };
  if (p.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: rpc, error: rpcErr } = await supabase.rpc("calculate_refund", {
    p_payment_id: paymentId,
  });

  if (rpcErr) {
    return NextResponse.json({ error: "calc_failed", detail: rpcErr.message }, { status: 500 });
  }

  // RPC가 table 형태로 반환되어 첫 row 사용
  const row = (rpc as Array<{ rate: number; amount_krw: number; reason_code: string }>)?.[0];
  if (!row) {
    return NextResponse.json({ error: "no_result" }, { status: 500 });
  }

  return NextResponse.json({
    rate: row.rate,
    amount_krw: row.amount_krw,
    reason_code: row.reason_code,
    payment_amount_krw: p.amount_krw,
    eligible: row.reason_code !== "not_eligible",
  });
}
