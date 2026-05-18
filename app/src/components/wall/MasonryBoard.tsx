"use client";

/**
 * 반응형 CSS 마소너리 보드.
 * CSS columns 사용 — JS 마소너리 라이브러리 없음.
 * 모바일 1열 / 태블릿 2열 / 데스크톱 3~4열.
 */
import { Card } from "./Card";
import type { CardRow } from "@/types/database";

interface MasonryBoardProps {
  cards: CardRow[];
  isOwner: boolean;
  onCardDeleted: (id: string) => void;
}

export function MasonryBoard({ cards, isOwner, onCardDeleted }: MasonryBoardProps) {
  if (cards.length === 0) {
    return (
      <div
        className="card card--soft"
        style={{ textAlign: "center", padding: 48, color: "var(--color-ink-soft)" }}
      >
        <p className="body">아직 카드가 없습니다. 첫 카드를 추가해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="wall-masonry">
      {cards.map((card) => (
        <Card key={card.id} card={card} isOwner={isOwner} onDeleted={onCardDeleted} />
      ))}
      {/* CSS columns 기반 반응형 마소너리 — 컴포넌트 로컬 스타일 */}
      <style>{`
        .wall-masonry {
          column-count: 1;
          column-gap: 16px;
        }
        @media (min-width: 640px) {
          .wall-masonry { column-count: 2; }
        }
        @media (min-width: 960px) {
          .wall-masonry { column-count: 3; }
        }
        @media (min-width: 1280px) {
          .wall-masonry { column-count: 4; }
        }
      `}</style>
    </div>
  );
}
