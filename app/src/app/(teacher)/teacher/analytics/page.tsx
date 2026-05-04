import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClassChart } from "@/components/ClassChart";

export const dynamic = "force-dynamic";

export default async function TeacherAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/teacher/analytics");

  // is_iden_teacher RPC 호출 — 가드
  const { data: isTeacher } = await supabase.rpc("is_iden_teacher", { uid: user.id });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = (profile as { role?: string } | null)?.role === "system_admin";

  if (!isTeacher && !isAdmin) {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow">
          <h1 className="h1">권한 없음</h1>
          <p className="lead" style={{ marginTop: 12 }}>
            이 페이지는 IDEN 교사 트랙 활성 등록자만 볼 수 있습니다.
          </p>
        </main>
      </>
    );
  }

  // v_class_iden_summary 조회
  const { data: classSummaries } = await supabase
    .from("v_class_iden_summary")
    .select("*");

  const summaries = (classSummaries as Array<{
    class_id: string;
    class_name: string;
    grade: number | null;
    student_count: number;
    analysis_consent_count: number;
    analysis_consent_pct: number | null;
    last_consultation_date: string | null;
  }>) ?? [];

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <div className="kicker">Teacher · 분석</div>
        <h1 className="h1" style={{ marginTop: 12 }}>반별 IDEN 좌표 현황</h1>
        <p className="body" style={{ marginTop: 12 }}>
          AI 분석 동의를 받은 학생만 집계됩니다. 동의는 보호자 동의 기록(parental_consents)으로 관리됩니다.
        </p>

        {summaries.length === 0 ? (
          <p className="body" style={{ marginTop: 32 }}>
            아직 데이터가 없습니다. 학교·반·학생을 등록하고 상담 기록을 누적하면 여기서 보입니다.
          </p>
        ) : (
          <>
            <section style={{ marginTop: 32 }}>
              <h2 className="h2">반별 동의율</h2>
              <ClassChart
                data={summaries.map((s) => ({
                  name: s.class_name,
                  consentPct: s.analysis_consent_pct ?? 0,
                  studentCount: s.student_count,
                }))}
              />
            </section>

            <section style={{ marginTop: 48 }}>
              <h2 className="h2">반 상세</h2>
              <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse", fontSize: ".94rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-line-strong)", textAlign: "left" }}>
                    <th style={{ padding: 10 }}>반</th>
                    <th style={{ padding: 10 }}>학년</th>
                    <th style={{ padding: 10 }}>학생 수</th>
                    <th style={{ padding: 10 }}>분석 동의</th>
                    <th style={{ padding: 10 }}>마지막 상담</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr key={s.class_id} style={{ borderBottom: "1px solid var(--color-line)" }}>
                      <td style={{ padding: 10 }}>{s.class_name}</td>
                      <td style={{ padding: 10 }}>{s.grade ?? "-"}</td>
                      <td style={{ padding: 10 }}>{s.student_count}</td>
                      <td style={{ padding: 10 }}>
                        {s.analysis_consent_count} / {s.student_count} ({s.analysis_consent_pct ?? 0}%)
                      </td>
                      <td style={{ padding: 10 }}>
                        {s.last_consultation_date
                          ? new Date(s.last_consultation_date).toLocaleDateString("ko-KR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </>
  );
}
