import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EnrollmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/enrollments/${id}`);

  const { data: enr } = await supabase
    .from("enrollments")
    .select(
      `id, status, started_at, completed_at,
       tracks:track_id ( id, name, duration_weeks, price_krw ),
       cohorts:cohort_id ( name, start_date )`
    )
    .eq("id", id)
    .single();
  if (!enr) return notFound();

  const e = enr as unknown as {
    id: string;
    status: string;
    started_at: string | null;
    tracks: { id: string; name: string; duration_weeks: number; price_krw: number } | null;
    cohorts: { name: string; start_date: string | null } | null;
  };

  // 결제 내역
  const { data: paymentsData } = await supabase
    .from("payments")
    .select("id, amount_krw, original_amount_krw, status, paid_at, refunded_amount_krw")
    .eq("enrollment_id", id)
    .order("paid_at", { ascending: false });

  const payments = (paymentsData as Array<{
    id: string;
    amount_krw: number;
    original_amount_krw: number;
    status: string;
    paid_at: string | null;
    refunded_amount_krw: number;
  }>) ?? [];

  const paidPayment = payments.find((p) => p.status === "paid" || p.status === "partial_refunded");

  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <div className="kicker">{e.tracks?.name}</div>
        <h1 className="h1" style={{ marginTop: 12 }}>{e.cohorts?.name ?? "기수"} 등록</h1>
        <p className="body" style={{ marginTop: 12 }}>
          상태: <span className={`pill pill--${e.status === "active" ? "ok" : "mute"}`}>{e.status}</span>
          {e.cohorts?.start_date && (
            <> · 시작 {new Date(e.cohorts.start_date).toLocaleDateString("ko-KR")}</>
          )}
        </p>

        <section style={{ marginTop: 40 }}>
          <h2 className="h2">결제 내역</h2>
          {payments.length === 0 ? (
            <p className="body" style={{ marginTop: 16 }}>결제 기록이 없습니다.</p>
          ) : (
            <ul style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {payments.map((p) => (
                <li key={p.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{p.paid_at ? new Date(p.paid_at).toLocaleString("ko-KR") : "—"}</span>
                    <span className={`pill pill--${p.status === "paid" ? "ok" : p.status === "partial_refunded" ? "warn" : "mute"}`}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: 8 }}>
                    {(p.amount_krw / 10_000).toLocaleString()}만원
                    {p.original_amount_krw > p.amount_krw && (
                      <span style={{ fontSize: ".82rem", color: "var(--color-ink-soft)", marginLeft: 8, textDecoration: "line-through" }}>
                        {(p.original_amount_krw / 10_000).toLocaleString()}만원
                      </span>
                    )}
                  </div>
                  {p.refunded_amount_krw > 0 && (
                    <div style={{ fontSize: ".88rem", color: "var(--color-amber)", marginTop: 4 }}>
                      환불됨 {(p.refunded_amount_krw / 10_000).toLocaleString()}만원
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {paidPayment && e.status !== "refunded" && (
          <section style={{ marginTop: 40 }}>
            <h2 className="h2">환불 신청</h2>
            <p className="body" style={{ marginTop: 12 }}>
              <Link href="/refund-policy">환불 정책</Link>을 먼저 확인하십시오.
              구간별 환불 비율이 달라집니다.
            </p>
            <Link
              href={`/enrollments/${id}/refund?paymentId=${paidPayment.id}`}
              className="btn btn--ghost"
              style={{ marginTop: 16 }}
            >
              환불 신청 →
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
