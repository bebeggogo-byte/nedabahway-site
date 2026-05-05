/**
 * 토스페이먼츠 환불 호출.
 * 키 미설정 시 mock 응답.
 */
import { env } from "@/lib/env";

interface CancelArgs {
  paymentKey: string;
  cancelAmount: number;
  cancelReason: string;
}

interface CancelResult {
  ok: boolean;
  status: string;
  raw: unknown;
  errorMessage?: string;
}

export async function cancelPayment({
  paymentKey,
  cancelAmount,
  cancelReason,
}: CancelArgs): Promise<CancelResult> {
  if (!env.toss.isConfigured || !paymentKey) {
    console.warn("[TOSS-MOCK-REFUND]", { paymentKey, cancelAmount, cancelReason });
    return {
      ok: true,
      status: "CANCELED",
      raw: {
        mocked: true,
        paymentKey,
        cancelAmount,
        cancelReason,
        canceledAt: new Date().toISOString(),
      },
    };
  }

  const auth = Buffer.from(`${env.toss.secretKey}:`).toString("base64");
  try {
    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cancelReason, cancelAmount }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        status: data?.code ?? `HTTP_${res.status}`,
        raw: data,
        errorMessage: data?.message ?? "토스 환불 실패",
      };
    }
    return { ok: true, status: data?.status ?? "CANCELED", raw: data };
  } catch (err) {
    return {
      ok: false,
      status: "NETWORK_ERROR",
      raw: { error: String(err) },
      errorMessage: String(err),
    };
  }
}
