/**
 * 공개 담벼락 보드. 로그인 불필요 (누구나 열람·카드 추가 가능).
 * 소유자는 잠금 토글 + 카드 삭제 가능.
 */
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { getWallBySlug, listCards } from "@/server/walls/queries";
import { env } from "@/lib/env";
import { WallBoardClient } from "@/components/wall/WallBoardClient";
import { IconLock, IconUnlock } from "@/components/wall/icons";
import { toggleLockAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function WallBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!env.supabase.isConfigured) {
    return (
      <>
        <Nav />
        <main id="main" className="page page--narrow">
          <h1 className="h1">담벼락</h1>
          <p className="lead" style={{ marginTop: 16 }}>
            Supabase가 설정되지 않았습니다. .env.local을 확인하십시오.
          </p>
        </main>
      </>
    );
  }

  const wall = await getWallBySlug(slug);
  if (!wall) {
    notFound();
  }

  const [cards, supabase] = await Promise.all([listCards(wall.id), createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = Boolean(user && user.id === wall.owner_id);
  const canContribute = !wall.contributions_locked || isOwner;

  return (
    <>
      <Nav />
      <main id="main" className="page">
        {/* 커버 배너 */}
        <header
          style={{
            background: wall.cover_color || "var(--color-green-soft)",
            borderRadius: "var(--radius-lg)",
            padding: "32px 28px",
            marginBottom: 28,
          }}
        >
          <div className="kicker">Wall · 협업 담벼락</div>
          <h1 className="h1" style={{ marginTop: 10, overflowWrap: "anywhere" }}>
            {wall.title}
          </h1>
          {wall.description && (
            <p
              className="body"
              style={{ marginTop: 10, color: "var(--color-ink)", maxWidth: "60ch" }}
            >
              {wall.description}
            </p>
          )}
          {isOwner && (
            <form action={toggleLockAction} style={{ marginTop: 18 }}>
              <input type="hidden" name="slug" value={wall.slug} />
              <input
                type="hidden"
                name="locked"
                value={wall.contributions_locked ? "false" : "true"}
              />
              <button type="submit" className="btn btn--ghost">
                {wall.contributions_locked ? (
                  <IconLock size={16} />
                ) : (
                  <IconUnlock size={16} />
                )}
                {wall.contributions_locked ? "기여 잠금 해제" : "기여 잠그기"}
              </button>
            </form>
          )}
        </header>

        <WallBoardClient
          wall={wall}
          initialCards={cards}
          isOwner={isOwner}
          canContribute={canContribute}
        />
      </main>
    </>
  );
}
