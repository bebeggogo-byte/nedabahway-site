"use client";

/**
 * 담벼락 보드 클라이언트 래퍼.
 * 툴바(공유·카드 추가) + 모달 + MasonryBoard 의 상호작용 상태를 관리.
 * - 카드 삭제: 낙관적 제거(로컬 state)
 * - 카드 추가: 성공 시 router.refresh()로 서버에서 최신 목록 재요청
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CardRow, WallRow } from "@/types/database";
import { MasonryBoard } from "./MasonryBoard";
import { AddCardComposer } from "./AddCardComposer";
import { ShareQrModal } from "./ShareQrModal";
import { IconShare, IconPlus } from "./icons";

interface WallBoardClientProps {
  wall: WallRow;
  initialCards: CardRow[];
  isOwner: boolean;
  /** 게스트이고 기여가 잠긴 경우 — 카드 추가 버튼 숨김 */
  canContribute: boolean;
}

export function WallBoardClient({
  wall,
  initialCards,
  isOwner,
  canContribute,
}: WallBoardClientProps) {
  const router = useRouter();
  const [cards, setCards] = useState<CardRow[]>(initialCards);
  const [composerOpen, setComposerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  function handleCardDeleted(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function handleCardAdded() {
    setComposerOpen(false);
    // 서버 Component를 다시 실행해 최신 카드 목록을 받아온다
    router.refresh();
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setShareOpen(true)}
        >
          <IconShare size={16} />
          공유
        </button>
        {canContribute ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setComposerOpen(true)}
          >
            <IconPlus size={16} />
            카드 추가
          </button>
        ) : (
          <span className="pill pill--mute" style={{ alignSelf: "center" }}>
            기여가 잠겨 있습니다
          </span>
        )}
      </div>

      <MasonryBoard
        cards={cards}
        isOwner={isOwner}
        onCardDeleted={handleCardDeleted}
      />

      {composerOpen && (
        <AddCardComposer
          wallSlug={wall.slug}
          wallId={wall.id}
          onClose={() => setComposerOpen(false)}
          onCardAdded={handleCardAdded}
        />
      )}

      {shareOpen && (
        <ShareQrModal
          slug={wall.slug}
          wallTitle={wall.title}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}
