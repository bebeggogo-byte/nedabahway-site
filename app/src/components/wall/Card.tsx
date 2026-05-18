"use client";

/**
 * 단일 카드 렌더링. kind(text/image/file/link)별 레이아웃 분기.
 * isOwner면 삭제 버튼 노출 — DELETE /api/wall/cards/[id], 낙관적 제거.
 */
import { useState } from "react";
import type { CardRow } from "@/types/database";
import {
  DEFAULT_CARD_COLOR,
  formatBytes,
  formatRelativeTime,
  type OgResult,
} from "./wall-constants";

interface CardProps {
  card: CardRow;
  isOwner: boolean;
  /** 삭제 성공 시 부모에게 알림 (낙관적 제거) */
  onDeleted: (id: string) => void;
}

/** link_meta(jsonb)를 OgResult 형태로 안전하게 해석 */
function readLinkMeta(meta: CardRow["link_meta"]): OgResult {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    return {
      title: typeof m.title === "string" ? m.title : null,
      image: typeof m.image === "string" ? m.image : null,
      description: typeof m.description === "string" ? m.description : null,
    };
  }
  return { title: null, image: null, description: null };
}

export function Card({ card, isOwner, onDeleted }: CardProps) {
  const [deleting, setDeleting] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const background = card.color || DEFAULT_CARD_COLOR;

  async function handleDelete() {
    if (deleting) return;
    if (!window.confirm("이 카드를 삭제하시겠습니까?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/wall/cards/${card.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(card.id);
        return;
      }
      if (res.status === 401) setError("로그인이 필요합니다.");
      else if (res.status === 404) setError("이미 삭제된 카드입니다.");
      else setError("삭제에 실패했습니다.");
    } catch {
      setError("네트워크 오류로 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article
      className="card"
      style={{
        background,
        padding: 18,
        breakInside: "avoid",
        marginBottom: 16,
        boxShadow: "0 1px 3px rgba(17,24,39,0.06)",
        opacity: deleting ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {card.kind === "text" && (
        <>
          {card.title && (
            <h3 className="h3" style={{ marginBottom: 6 }}>
              {card.title}
            </h3>
          )}
          {card.body && (
            <p className="body" style={{ whiteSpace: "pre-wrap", color: "var(--color-ink)" }}>
              {card.body}
            </p>
          )}
        </>
      )}

      {card.kind === "image" && card.media_url && (
        <>
          {card.title && (
            <h3 className="h3" style={{ marginBottom: 8 }}>
              {card.title}
            </h3>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.media_url}
            alt={card.title || card.media_name || "첨부 이미지"}
            onClick={() => setImageOpen(true)}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "var(--radius-sm)",
              cursor: "zoom-in",
              display: "block",
            }}
          />
        </>
      )}

      {card.kind === "file" && (
        <>
          {card.title && (
            <h3 className="h3" style={{ marginBottom: 8 }}>
              {card.title}
            </h3>
          )}
          <a
            href={card.media_url ?? "#"}
            download={card.media_name ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 10,
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-paper)",
            }}
          >
            <span aria-hidden style={{ fontSize: "1.4rem" }}>
              📄
            </span>
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {card.media_name ?? "첨부 파일"}
              </span>
              <span style={{ fontSize: ".8rem", color: "var(--color-ink-soft)" }}>
                {formatBytes(card.media_size)} · 다운로드
              </span>
            </span>
          </a>
        </>
      )}

      {card.kind === "link" && card.link_url && (
        <LinkPreview url={card.link_url} meta={readLinkMeta(card.link_meta)} title={card.title} />
      )}

      <footer
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontSize: ".78rem",
          color: "var(--color-ink-soft)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.author_name || "익명"} · {formatRelativeTime(card.created_at)}
        </span>
        {isOwner && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="카드 삭제"
            style={{
              border: "none",
              background: "transparent",
              color: "var(--color-danger)",
              cursor: "pointer",
              padding: "2px 6px",
              fontSize: ".78rem",
              fontWeight: 600,
            }}
          >
            삭제
          </button>
        )}
      </footer>

      {error && (
        <p role="alert" style={{ marginTop: 6, fontSize: ".78rem", color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      {imageOpen && card.media_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이미지 크게 보기"
          onClick={() => setImageOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setImageOpen(false);
          }}
          tabIndex={-1}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 100,
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.media_url}
            alt={card.title || card.media_name || "첨부 이미지"}
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "var(--radius)" }}
          />
        </div>
      )}
    </article>
  );
}

/** 링크 카드 미리보기 — link_meta(OG) 이미지·제목·설명 표시 */
function LinkPreview({
  url,
  meta,
  title,
}: {
  url: string;
  meta: OgResult;
  title: string | null;
}) {
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* URL 파싱 실패 시 원문 사용 */
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        background: "var(--color-paper)",
      }}
    >
      {meta.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.image}
          alt=""
          style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
        />
      )}
      <div style={{ padding: 12 }}>
        <span
          style={{
            display: "block",
            fontWeight: 700,
            color: "var(--color-ink)",
            marginBottom: 4,
          }}
        >
          {meta.title || title || host}
        </span>
        {meta.description && (
          <span
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontSize: ".84rem",
              color: "var(--color-ink-soft)",
              marginBottom: 6,
            }}
          >
            {meta.description}
          </span>
        )}
        <span style={{ fontSize: ".76rem", color: "var(--color-green-deep)" }}>{host}</span>
      </div>
    </a>
  );
}
