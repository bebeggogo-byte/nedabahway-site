/**
 * 담벼락 소유자 대시보드. 로그인 필수.
 * 내가 만든 담벼락 목록 + "새 담벼락 만들기" CTA.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { listWallsByOwner } from "@/server/walls/queries";
import { env } from "@/lib/env";
import type { WallRow } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "내 담벼락",
};

export default async function WallDashboardPage() {
  if (!env.supabase.isConfigured) {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow">
          <h1 className="h1">내 담벼락</h1>
          <p className="lead" style={{ marginTop: 16 }}>
            Supabase가 설정되지 않았습니다. .env.local을 확인하십시오.
          </p>
        </main>
      </>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/wall");
  }

  const walls: WallRow[] = await listWallsByOwner(user.id);

  return (
    <>
      <Nav />
      <main id="main" className="page">
        <header
          style={{
            marginBottom: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="kicker">Wall · 협업 담벼락</div>
            <h1 className="h1" style={{ marginTop: 12 }}>
              내 담벼락
            </h1>
            <p className="lead" style={{ marginTop: 12, maxWidth: "52ch" }}>
              링크 하나로 누구나 글·이미지·파일·링크 카드를 붙일 수 있는 공유 담벼락입니다.
            </p>
          </div>
          <Link href="/wall/new" className="btn btn--primary">
            + 새 담벼락 만들기
          </Link>
        </header>

        {walls.length === 0 ? (
          <div
            className="card card--soft"
            style={{ textAlign: "center", padding: 56, color: "var(--color-ink-soft)" }}
          >
            <p className="h3" style={{ color: "var(--color-ink)" }}>
              아직 만든 담벼락이 없습니다.
            </p>
            <p className="body" style={{ marginTop: 8 }}>
              첫 담벼락을 만들고 링크를 공유해 보세요.
            </p>
            <Link
              href="/wall/new"
              className="btn btn--primary"
              style={{ marginTop: 20 }}
            >
              + 새 담벼락 만들기
            </Link>
          </div>
        ) : (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {walls.map((wall) => (
              <Link
                key={wall.id}
                href={`/wall/${wall.slug}`}
                className="card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  overflow: "hidden",
                  padding: 0,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    height: 12,
                    background: wall.cover_color || "var(--color-green-soft)",
                  }}
                />
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "space-between",
                    }}
                  >
                    <h2 className="h3" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      {wall.title}
                    </h2>
                    {wall.contributions_locked && (
                      <span className="pill pill--mute" aria-label="기여 잠김">
                        잠김
                      </span>
                    )}
                  </div>
                  {wall.description && (
                    <p
                      className="body"
                      style={{
                        marginTop: 8,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {wall.description}
                    </p>
                  )}
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: ".8rem",
                      color: "var(--color-ink-soft)",
                    }}
                  >
                    {new Date(wall.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    생성
                  </p>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
