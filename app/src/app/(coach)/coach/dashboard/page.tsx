import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/coach/dashboard");

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
          <p className="lead" style={{ marginTop: 12 }}>
            이 페이지는 코치만 볼 수 있습니다.
          </p>
        </main>
      </>
    );
  }

  // 담당 학생 등록 목록
  const { data: enrols } = await supabase
    .from("enrollments")
    .select(
      `id, status, started_at,
       profiles:user_id ( id, display_name ),
       tracks:track_id ( name ),
       cohorts:cohort_id ( name )`
    )
    .eq("coach_id", user.id)
    .in("status", ["active", "paused"])
    .order("started_at", { ascending: false });

  const list = (enrols as unknown as Array<{
    id: string;
    status: string;
    started_at: string | null;
    profiles: { id: string; display_name: string } | null;
    tracks: { name: string } | null;
    cohorts: { name: string } | null;
  }>) ?? [];

  // pending 환불 요청 카운트
  const { count: pendingRefunds } = await supabase
    .from("refund_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <div className="kicker">Coach</div>
        <h1 className="h1" style={{ marginTop: 12 }}>코칭 대시보드</h1>

        <section style={{ marginTop: 32, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/coach/refunds" className="card" style={{ flex: "1 1 200px", textDecoration: "none" }}>
            <div className="kicker">환불 요청</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>{pendingRefunds ?? 0}</div>
            <div className="body" style={{ fontSize: ".88rem", marginTop: 4 }}>처리 대기</div>
          </Link>
          <Link href="/coach/cohorts" className="card" style={{ flex: "1 1 200px", textDecoration: "none" }}>
            <div className="kicker">기수 운영</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>{list.length}</div>
            <div className="body" style={{ fontSize: ".88rem", marginTop: 4 }}>활성 등록</div>
          </Link>
        </section>

        <section style={{ marginTop: 48 }}>
          <h2 className="h2">담당 학생</h2>
          {list.length === 0 ? (
            <p className="body" style={{ marginTop: 16 }}>아직 담당 학생이 없습니다.</p>
          ) : (
            <ul style={{ marginTop: 24, display: "grid", gap: 14 }}>
              {list.map((e) => (
                <li key={e.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{e.profiles?.display_name}</div>
                      <div style={{ fontSize: ".88rem", color: "var(--color-ink-soft)", marginTop: 4 }}>
                        {e.tracks?.name} · {e.cohorts?.name} · {e.status === "active" ? "진행" : e.status}
                      </div>
                    </div>
                    <Link href={`/coach/students/${e.id}`} className="btn btn--ghost">코칭 →</Link>
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
