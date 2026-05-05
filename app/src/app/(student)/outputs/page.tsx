import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OutputsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/outputs");

  const { data } = await supabase
    .from("outputs")
    .select(
      `id, kind, title, version, created_at,
       enrollments:enrollment_id ( id, tracks:track_id ( name ) )`
    )
    .order("created_at", { ascending: false });

  const outputs = (data as unknown as Array<{
    id: string;
    kind: string;
    title: string;
    version: number;
    created_at: string;
    enrollments: { id: string; tracks: { name: string } | null } | null;
  }>) ?? [];

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <h1 className="h1">내 산출물</h1>
        <p className="lead" style={{ marginTop: 12 }}>
          회기에서 만든 결과물이 여기 모입니다. 시그니처·매뉴얼·MVP 보고서.
        </p>

        {outputs.length === 0 ? (
          <p className="body" style={{ marginTop: 32 }}>
            아직 산출물이 없습니다. 회기를 진행하면 자동으로 생성됩니다.
          </p>
        ) : (
          <ul style={{ marginTop: 32, display: "grid", gap: 14 }}>
            {outputs.map((o) => (
              <li key={o.id} className="card">
                <div className="kicker">{o.kind}</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: 4 }}>{o.title}</div>
                <div style={{ fontSize: ".82rem", color: "var(--color-ink-soft)", marginTop: 4 }}>
                  {o.enrollments?.tracks?.name} · v{o.version} · {new Date(o.created_at).toLocaleDateString("ko-KR")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
