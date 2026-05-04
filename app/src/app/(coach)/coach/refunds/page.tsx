import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CoachRefundActions } from "@/components/CoachRefundActions";

export const dynamic = "force-dynamic";

export default async function CoachRefundsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/coach/refunds");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "coach" && role !== "system_admin") {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow">
          <h1 className="h1">권한 없음</h1>
        </main>
      </>
    );
  }

  const { data } = await supabase
    .from("refund_requests")
    .select(
      `id, status, calculated_amount_krw, calculated_rate, reason_code,
       student_reason, requested_at, approved_at, reject_reason,
       profiles:requested_by ( display_name ),
       payments:payment_id ( id, amount_krw, paid_at, toss_payment_key ),
       enrollments:enrollment_id ( tracks:track_id ( name ) )`
    )
    .order("status", { ascending: true })
    .order("requested_at", { ascending: false });

  const list = (data as unknown as Array<{
    id: string;
    status: string;
    calculated_amount_krw: number | null;
    calculated_rate: number | null;
    reason_code: string | null;
    student_reason: string | null;
    requested_at: string;
    approved_at: string | null;
    reject_reason: string | null;
    profiles: { display_name: string } | null;
    payments: { id: string; amount_krw: number; paid_at: string | null } | null;
    enrollments: { tracks: { name: string } | null } | null;
  }>) ?? [];

  const pending = list.filter((r) => r.status === "pending");
  const others = list.filter((r) => r.status !== "pending");

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <div className="kicker">Coach · 환불 요청</div>
        <h1 className="h1" style={{ marginTop: 12 }}>환불 요청 관리</h1>

        <section style={{ marginTop: 32 }}>
          <h2 className="h2">검토 대기 ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="body" style={{ marginTop: 16 }}>대기 중인 요청 없음.</p>
          ) : (
            <ul style={{ marginTop: 24, display: "grid", gap: 14 }}>
              {pending.map((r) => (
                <li key={r.id} className="card" style={{ borderColor: "var(--color-amber)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <strong>{r.profiles?.display_name}</strong> · {r.enrollments?.tracks?.name}
                      <div style={{ fontSize: ".82rem", color: "var(--color-ink-soft)", marginTop: 4 }}>
                        신청 {new Date(r.requested_at).toLocaleString("ko-KR")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-green-deep)" }}>
                        {((r.calculated_amount_krw ?? 0) / 10_000).toLocaleString()}만원
                      </div>
                      <div style={{ fontSize: ".82rem", color: "var(--color-ink-soft)" }}>
                        {Math.round((r.calculated_rate ?? 0) * 100)}% · {r.reason_code}
                      </div>
                    </div>
                  </div>
                  {r.student_reason && (
                    <p style={{ marginTop: 12, padding: 12, background: "var(--color-paper-soft)", borderRadius: 8, fontSize: ".92rem" }}>
                      {r.student_reason}
                    </p>
                  )}
                  <CoachRefundActions refundId={r.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ marginTop: 48 }}>
          <h2 className="h2">처리 완료 ({others.length})</h2>
          {others.length === 0 ? (
            <p className="body" style={{ marginTop: 16 }}>처리 이력 없음.</p>
          ) : (
            <ul style={{ marginTop: 24, display: "grid", gap: 12 }}>
              {others.map((r) => (
                <li key={r.id} className="card card--soft">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <strong>{r.profiles?.display_name}</strong> · {r.enrollments?.tracks?.name}
                    </div>
                    <span className={`pill pill--${pillFor(r.status)}`}>{r.status}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: ".88rem", color: "var(--color-ink-soft)" }}>
                    {((r.calculated_amount_krw ?? 0) / 10_000).toLocaleString()}만원 ·
                    {r.approved_at ? ` 처리 ${new Date(r.approved_at).toLocaleString("ko-KR")}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function pillFor(status: string): "ok" | "warn" | "danger" | "mute" {
  if (status === "completed" || status === "approved") return "ok";
  if (status === "pending") return "warn";
  if (status === "rejected" || status === "failed") return "danger";
  return "mute";
}
