import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { WorksheetForm } from "@/components/WorksheetForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ progressId: string }>;
}

export default async function SessionPage({ params }: PageProps) {
  const { progressId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/sessions/${progressId}`);

  // session_progress + template + enrollment + worksheet_template
  const { data: progress } = await supabase
    .from("session_progress")
    .select(
      `id, status, opened_at, submitted_at,
       enrollment_id,
       session_template_id`
    )
    .eq("id", progressId)
    .single();

  if (!progress) return notFound();

  const p = progress as { id: string; status: string; enrollment_id: string; session_template_id: string };

  // 상태가 locked이면 진입 차단
  if (p.status === "locked") {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow">
          <h1 className="h1">아직 잠긴 회기</h1>
          <p className="lead" style={{ marginTop: 12 }}>
            이전 회기를 완료해야 다음으로 넘어갈 수 있습니다.
          </p>
        </main>
      </>
    );
  }

  // session_template 정보
  const { data: tmpl } = await supabase
    .from("session_templates")
    .select("title, theme, seq, track_id")
    .eq("id", p.session_template_id)
    .single();

  // 워크시트 템플릿 (해당 session_template_id에 묶인 첫 worksheet)
  const { data: ws } = await supabase
    .from("worksheet_templates")
    .select("id, code, title, schema, ui_schema")
    .eq("session_template_id", p.session_template_id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  // 기존 응답 (있으면 재개)
  const { data: existingResp } = await supabase
    .from("worksheet_responses")
    .select("id, content, status, time_spent_seconds")
    .eq("session_progress_id", p.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const t = tmpl as { title: string; theme: string | null; seq: number; track_id: string } | null;
  const w = ws as { id: string; code: string; title: string; schema: Record<string, unknown>; ui_schema: Record<string, unknown> | null } | null;
  const existing = existingResp as
    | { id: string; content: Record<string, unknown>; status: string; time_spent_seconds: number }
    | null;

  return (
    <>
      <Nav />
      <main id="main" className="page page--narrow">
        <div className="kicker">Session · {t?.seq}회차</div>
        <h1 className="h1" style={{ marginTop: 12 }}>{t?.title}</h1>
        {t?.theme && <p className="body" style={{ marginTop: 8 }}>{t.theme}</p>}

        {!w ? (
          <div className="card" style={{ marginTop: 32, background: "var(--color-amber-soft)" }}>
            <strong style={{ color: "var(--color-amber)" }}>이번 회기는 워크시트 없이 1on1 코칭으로 진행됩니다.</strong>
            <p className="body" style={{ marginTop: 8 }}>
              코치가 회기 후 본 회기 상태를 reviewed로 갱신합니다.
            </p>
          </div>
        ) : (
          <WorksheetForm
            templateId={w.id}
            templateCode={w.code}
            sessionProgressId={p.id}
            schema={w.schema}
            uiSchema={w.ui_schema}
            existingResponseId={existing?.id ?? null}
            initialContent={(existing?.content as Record<string, string>) ?? {}}
            initialTimeSpent={existing?.time_spent_seconds ?? 0}
            isSubmitted={existing?.status === "submitted"}
          />
        )}
      </main>
    </>
  );
}
