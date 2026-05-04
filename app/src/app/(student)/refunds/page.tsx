import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MyRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/refunds");

  const { data } = await supabase
    .from("refund_requests")
    .select(
      `id, status, calculated_rate, calculated_amount_krw, reason_code, student_reason,
       requested_at, approved_at, refunded_at, reject_reason`
    )
    .eq("requested_by", user.id)
    .order("requested_at", { ascending: false });

  const list = (data as Array<{
    id: string;
    status: string;
    calculated_rate: number | null;
    calculated_amount_krw: number | null;
    reason_code: string | null;
    student_reason: string | null;
    requested_at: string;
    approved_at: string | null;
    refunded_at: string | null;
    reject_reason: string | null;
  }>) ?? [];

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <h1 className="h1">내 환불 이력</h1>

        {sp.ok && (
          <p
            role="status"
            className="card"
            style={{ marginTop: 16, background: "var(--color-green-soft)", color: "var(--color-green-deep)", borderColor: "var(--color-green-deep)" }}
          >
            환불 요청이 접수되었습니다. 코치(사장님) 검토 후 결과가 알림으로 전달됩니다.
          </p>
        )}

        {list.length === 0 ? (
          <p className="body" style={{ marginTop: 32 }}>아직 환불 요청 기록이 없습니다.</p>
        ) : (
          <ul style={{ marginTop: 32, display: "grid", gap: 14 }}>
            {list.map((r) => (
              <li key={r.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                  <span>{new Date(r.requested_at).toLocaleString("ko-KR")}</span>
                  <span className={`pill pill--${pillFor(r.status)}`}>{statusLabel(r.status)}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: "1.05rem", fontWeight: 700 }}>
                  {r.calculated_amount_krw != null
                    ? `${(r.calculated_amount_krw / 10_000).toLocaleString()}만원 (${Math.round(
                        (r.calculated_rate ?? 0) * 100
                      )}%)`
                    : "—"}
                </div>
                {r.student_reason && (
                  <div style={{ marginTop: 10, fontSize: ".92rem", color: "var(--color-ink-soft)" }}>
                    사유: {r.student_reason}
                  </div>
                )}
                {r.status === "rejected" && r.reject_reason && (
                  <div style={{ marginTop: 10, fontSize: ".92rem", color: "var(--color-danger)" }}>
                    반려 사유: {r.reject_reason}
                  </div>
                )}
                {r.status === "completed" && r.refunded_at && (
                  <div style={{ marginTop: 10, fontSize: ".82rem", color: "var(--color-green-deep)" }}>
                    환불 완료 · {new Date(r.refunded_at).toLocaleString("ko-KR")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function pillFor(status: string): "ok" | "warn" | "danger" | "mute" {
  if (status === "completed") return "ok";
  if (status === "pending" || status === "approved") return "warn";
  if (status === "rejected" || status === "failed") return "danger";
  return "mute";
}

function statusLabel(status: string): string {
  return ({
    pending: "검토 중",
    approved: "승인됨",
    completed: "환불 완료",
    rejected: "반려",
    failed: "처리 실패",
  } as const)[status as "pending"] ?? status;
}
