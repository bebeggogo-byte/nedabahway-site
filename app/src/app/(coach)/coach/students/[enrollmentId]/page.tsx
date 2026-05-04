import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { CoachNoteForm } from "@/components/CoachNoteForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ enrollmentId: string }>;
}

export default async function CoachStudentPage({ params }: PageProps) {
  const { enrollmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/coach/students/${enrollmentId}`);

  // role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "coach" && role !== "system_admin") return notFound();

  const { data: enr } = await supabase
    .from("enrollments")
    .select(
      `id, status,
       profiles:user_id ( display_name ),
       tracks:track_id ( id, name )`
    )
    .eq("id", enrollmentId)
    .single();
  if (!enr) return notFound();

  const e = enr as unknown as {
    id: string;
    status: string;
    profiles: { display_name: string } | null;
    tracks: { id: string; name: string } | null;
  };

  // 회기 진행 + 응답
  const { data: progressRows } = await supabase
    .from("session_progress")
    .select(
      `id, status, scheduled_at, opened_at, submitted_at, reviewed_at,
       session_templates:session_template_id ( seq, title )`
    )
    .eq("enrollment_id", enrollmentId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const progress = (progressRows as unknown as Array<{
    id: string;
    status: string;
    scheduled_at: string | null;
    opened_at: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    session_templates: { seq: number; title: string } | null;
  }>) ?? [];

  // 응답들
  const { data: responses } = await supabase
    .from("worksheet_responses")
    .select("session_progress_id, content, status, time_spent_seconds, submitted_at")
    .in(
      "session_progress_id",
      progress.map((p) => p.id)
    );

  const respMap = new Map<string, { content: Record<string, unknown>; status: string; time_spent_seconds: number }>();
  ((responses ?? []) as Array<{ session_progress_id: string; content: Record<string, unknown>; status: string; time_spent_seconds: number }>).forEach(
    (r) => respMap.set(r.session_progress_id, r)
  );

  // 메모
  const { data: notes } = await supabase
    .from("coach_notes")
    .select("id, body, visibility, tags, created_at")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false });

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <div className="kicker">Coach · 1:1 코칭</div>
        <h1 className="h1" style={{ marginTop: 12 }}>{e.profiles?.display_name}</h1>
        <p className="body" style={{ marginTop: 8 }}>
          {e.tracks?.name} · 상태 {e.status}
        </p>

        <section style={{ marginTop: 48 }}>
          <h2 className="h2">회기별 답변</h2>
          {progress.length === 0 ? (
            <p className="body" style={{ marginTop: 16 }}>회기 데이터가 없습니다.</p>
          ) : (
            <ul style={{ marginTop: 24, display: "grid", gap: 12 }}>
              {progress.map((p) => {
                const r = respMap.get(p.id);
                return (
                  <li key={p.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        <span className={`pill pill--${pillForStatus(p.status)}`}>
                          {p.status}
                        </span>{" "}
                        <strong>{p.session_templates?.seq}회차</strong> · {p.session_templates?.title}
                      </div>
                      {r && (
                        <span style={{ fontSize: ".82rem", color: "var(--color-ink-soft)" }}>
                          {Math.floor((r.time_spent_seconds ?? 0) / 60)}분 작성
                        </span>
                      )}
                    </div>
                    {r?.content && (
                      <pre
                        style={{
                          marginTop: 14,
                          padding: 14,
                          background: "var(--color-paper-soft)",
                          borderRadius: 8,
                          fontSize: ".88rem",
                          overflow: "auto",
                          fontFamily: "var(--font-sans)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {Object.entries(r.content)
                          .map(([k, v]) => `[${k}]\n${String(v ?? "")}\n`)
                          .join("\n")}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section style={{ marginTop: 48 }}>
          <h2 className="h2">코치 메모</h2>
          <CoachNoteForm enrollmentId={enrollmentId} />
          <ul style={{ marginTop: 24, display: "grid", gap: 12 }}>
            {((notes ?? []) as Array<{ id: string; body: string; visibility: string; created_at: string; tags: string[] }>).map((n) => (
              <li key={n.id} className="card card--soft">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem", color: "var(--color-ink-soft)" }}>
                  <span>{new Date(n.created_at).toLocaleString("ko-KR")}</span>
                  <span className="pill pill--mute">{n.visibility}</span>
                </div>
                <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{n.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

function pillForStatus(status: string): "ok" | "warn" | "danger" | "mute" {
  if (status === "submitted" || status === "reviewed") return "ok";
  if (status === "open") return "warn";
  if (status === "closed") return "mute";
  return "mute";
}
