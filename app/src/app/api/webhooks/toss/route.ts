import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * 토스페이먼츠 결제 승인 webhook.
 * 클라이언트 결제 성공 후 `paymentKey`·`orderId`·`amount`를 받아 토스 API로 confirm.
 *
 * 키 미설정 시 mock 응답 (ok=true).
 */
export async function POST(request: Request) {
  let body: { paymentKey?: string; orderId?: string; amount?: number; enrollmentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { paymentKey, orderId, amount, enrollmentId } = body;
  if (!paymentKey || !orderId || !amount || !enrollmentId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // mock 모드
  if (!env.toss.isConfigured) {
    console.warn("[TOSS-MOCK] confirm", { paymentKey, orderId, amount });
    return await persistPaid({
      paymentKey,
      orderId,
      amount,
      enrollmentId,
      raw: { mocked: true },
    });
  }

  // 실 토스 confirm
  const auth = Buffer.from(`${env.toss.secretKey}:`).toString("base64");
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: "toss_confirm_failed", detail: data }, { status: 400 });
  }

  return await persistPaid({ paymentKey, orderId, amount, enrollmentId, raw: data });
}

async function persistPaid(opts: {
  paymentKey: string;
  orderId: string;
  amount: number;
  enrollmentId: string;
  raw: unknown;
}) {
  const admin = createAdminClient();
  const { data: enr } = await admin
    .from("enrollments")
    .select("user_id")
    .eq("id", opts.enrollmentId)
    .single();
  if (!enr) {
    return NextResponse.json({ error: "enrollment_not_found" }, { status: 404 });
  }
  const e = enr as { user_id: string };

  await admin.from("payments").upsert(
    {
      enrollment_id: opts.enrollmentId,
      user_id: e.user_id,
      amount_krw: opts.amount,
      original_amount_krw: opts.amount,
      toss_payment_key: opts.paymentKey,
      toss_order_id: opts.orderId,
      status: "paid",
      paid_at: new Date().toISOString(),
      refund_policy_version: "v1",
      raw_response: opts.raw as never,
    },
    { onConflict: "toss_order_id" }
  );

  await admin.from("enrollments").update({ status: "active", started_at: new Date().toISOString() }).eq("id", opts.enrollmentId);

  return NextResponse.json({ ok: true });
}
