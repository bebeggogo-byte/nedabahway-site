import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { RefundRequestForm } from "@/components/RefundRequestForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paymentId?: string }>;
}

export default async function RefundFormPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const paymentId = sp.paymentId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/enrollments/${id}/refund`);
  if (!paymentId) redirect(`/enrollments/${id}`);

  // payment 정보 + 환불 미리보기 (RPC)
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount_krw, paid_at, status")
    .eq("id", paymentId)
    .eq("user_id", user.id)
    .single();
  if (!payment) return notFound();

  const { data: calc } = await supabase.rpc("calculate_refund", { p_payment_id: paymentId });
  const preview = (calc as Array<{ rate: number; amount_krw: number; reason_code: string }>)?.[0];

  const p = payment as { id: string; amount_krw: number; paid_at: string | null; status: string };

  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <div className="kicker">Refund · 환불 신청</div>
        <h1 className="h1" style={{ marginTop: 12 }}>환불 미리보기</h1>

        <section className="card" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span>결제 금액</span>
            <strong>{(p.amount_krw / 10_000).toLocaleString()}만원</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <span>결제 일시</span>
            <span>{p.paid_at ? new Date(p.paid_at).toLocaleString("ko-KR") : "—"}</span>
          </div>
          {preview && (
            <>
              <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--color-line)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span>환불 구간</span>
                <span className={`pill pill--${preview.reason_code === "not_eligible" ? "danger" : "ok"}`}>
                  {labelForReason(preview.reason_code)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                  fontSize: "1.2rem",
                  fontWeight: 700,
                }}
              >
                <span>예상 환불액</span>
                <span style={{ color: preview.reason_code === "not_eligible" ? "var(--color-danger)" : "var(--color-green-deep)" }}>
                  {(preview.amount_krw / 10_000).toLocaleString()}만원 ({Math.round(preview.rate * 100)}%)
                </span>
              </div>
            </>
          )}
        </section>

        {preview?.reason_code === "not_eligible" ? (
          <section style={{ marginTop: 32 }}>
            <p className="lead" style={{ color: "var(--color-danger)" }}>
              환불 가능 기간이 지났습니다. 자세한 사항은 사장님께 직접 문의 주십시오.
            </p>
            <Link href={`/enrollments/${id}`} className="btn btn--ghost" style={{ marginTop: 16 }}>
              ← 등록 상세로
            </Link>
          </section>
        ) : (
          <RefundRequestForm
            paymentId={paymentId}
            enrollmentId={id}
            previewAmountKrw={preview?.amount_krw ?? 0}
          />
        )}
      </main>
    </>
  );
}

function labelForReason(code: string): string {
  switch (code) {
    case "within_24h":
      return "24시간 이내 (100%)";
    case "before_first_session":
      return "1회차 시작 전 (50%)";
    case "after_first_session":
      return "1회차 종료 ~ 2회차 시작 전 (30%)";
    default:
      return "환불 불가";
  }
}
