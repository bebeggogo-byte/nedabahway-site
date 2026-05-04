import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `id, status, started_at,
       tracks:track_id ( id, name, duration_weeks ),
       cohorts:cohort_id ( name )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const enrols = (enrollments as unknown as Array<{
    id: string;
    status: string;
    started_at: string | null;
    tracks: { id: string; name: string; duration_weeks: number } | null;
    cohorts: { name: string } | null;
  }>) ?? [];

  // 현재 회기 (open 상태인 첫 회기)
  let currentSession: { id: string; title: string; seq: number; enrollmentId: string } | null = null;
  if (enrols.length > 0 && enrols[0]) {
    const enr = enrols[0];
    const { data: progress } = await supabase
      .from("session_progress")
      .select("id, session_template_id")
      .eq("enrollment_id", enr.id)
      .eq("status", "open")
      .limit(1)
      .single();
    if (progress) {
      const tmplId = (progress as { session_template_id: string }).session_template_id;
      const { data: tmpl } = await supabase
        .from("session_templates")
        .select("title, seq")
        .eq("id", tmplId)
        .single();
      if (tmpl) {
        const t = tmpl as { title: string; seq: number };
        currentSession = {
          id: (progress as { id: string }).id,
          enrollmentId: enr.id,
          title: t.title,
          seq: t.seq,
        };
      }
    }
  }

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <div className="kicker">My Learning · 내 학습</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          {currentSession ? `다음 회기: ${currentSession.title}` : "안녕하세요"}
        </h1>

        {currentSession && (
          <Link
            href={`/sessions/${currentSession.id}`}
            className="btn btn--primary"
            style={{ marginTop: 24 }}
          >
            {currentSession.seq}회차 워크시트 작성하기 →
          </Link>
        )}

        <section style={{ marginTop: 48 }}>
          <h2 className="h2">내 등록</h2>
          {enrols.length === 0 ? (
            <p className="body" style={{ marginTop: 16 }}>
              아직 등록된 트랙이 없습니다. <Link href="/">5트랙 보기</Link>
            </p>
          ) : (
            <ul style={{ marginTop: 24, display: "grid", gap: 14 }}>
              {enrols.map((e) => (
                <li key={e.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <div className="kicker">{e.tracks?.name}</div>
                      <div style={{ fontSize: ".94rem", color: "var(--color-ink-soft)", marginTop: 4 }}>
                        {e.cohorts?.name} · {e.status === "active" ? "진행 중" : e.status}
                      </div>
                    </div>
                    <Link href={`/enrollments/${e.id}`} className="nav__link">
                      관리 →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ marginTop: 48 }}>
          <h2 className="h2">빠른 메뉴</h2>
          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/outputs" className="btn btn--ghost">내 산출물</Link>
            <Link href="/refunds" className="btn btn--ghost">환불 이력</Link>
            <Link href="/refund-policy" className="btn btn--ghost">환불 정책 확인</Link>
          </div>
        </section>
      </main>
    </>
  );
}
