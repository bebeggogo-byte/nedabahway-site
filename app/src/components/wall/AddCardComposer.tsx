"use client";

/**
 * 카드 추가 컴포저 모달.
 * 종류 선택(글/이미지/파일/링크) → 입력 → 제출.
 * media: /api/wall/upload → /api/wall/cards
 * link:  /api/wall/og(선택) → /api/wall/cards
 * 닉네임은 localStorage에 마지막 값 저장.
 */
import { useEffect, useRef, useState } from "react";
import type { CardKind } from "@/types/database";
import {
  ALLOWED_UPLOAD_MIME,
  KIND_LABELS,
  MAX_UPLOAD_BYTES,
  NICKNAME_STORAGE_KEY,
  WALL_COLORS,
  DEFAULT_CARD_COLOR,
  formatBytes,
  type OgResult,
} from "./wall-constants";
import {
  IconText,
  IconImage,
  IconFile,
  IconLink,
  IconPlus,
  IconClose,
  IconDownload,
} from "./icons";

/** 카드 종류별 아이콘 매핑 */
const KIND_ICONS: Record<CardKind, () => React.ReactNode> = {
  text: () => <IconText size={16} />,
  image: () => <IconImage size={16} />,
  file: () => <IconFile size={16} />,
  link: () => <IconLink size={16} />,
};

interface AddCardComposerProps {
  wallSlug: string;
  wallId: string;
  onClose: () => void;
  /** 카드 생성 성공 시 호출 — 부모가 보드 새로고침 */
  onCardAdded: () => void;
}

const KIND_ORDER: CardKind[] = ["text", "image", "file", "link"];

/** 업로드 응답 */
interface UploadResult {
  url: string;
  name: string;
  size: number;
}

export function AddCardComposer({
  wallSlug,
  wallId,
  onClose,
  onCardAdded,
}: AddCardComposerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const [kind, setKind] = useState<CardKind>("text");
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState(DEFAULT_CARD_COLOR);

  // text 필드
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // media(image/file) 필드
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // link 필드
  const [linkUrl, setLinkUrl] = useState("");
  const [ogResult, setOgResult] = useState<OgResult | null>(null);
  const [ogLoading, setOgLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 진입 시 닉네임 복원 + 포커스 + Escape 닫기
  useEffect(() => {
    const saved = window.localStorage.getItem(NICKNAME_STORAGE_KEY);
    if (saved) setNickname(saved);
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  // 이미지 미리보기 objectURL 정리
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const picked = e.target.files?.[0] ?? null;
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setError(`파일이 너무 큽니다. 최대 ${formatBytes(MAX_UPLOAD_BYTES)}까지 가능합니다.`);
      setFile(null);
      e.target.value = "";
      return;
    }
    if (picked.type && !ALLOWED_UPLOAD_MIME.has(picked.type)) {
      setError("허용되지 않는 파일 형식입니다. (이미지·문서·압축 파일만 가능)");
      setFile(null);
      e.target.value = "";
      return;
    }
    setFile(picked);
    if (picked.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(picked));
    }
  }

  async function handleFetchOg() {
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      setError("링크 주소를 먼저 입력하세요.");
      return;
    }
    setError(null);
    setOgLoading(true);
    setOgResult(null);
    try {
      const res = await fetch("/api/wall/og", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (res.ok) {
        const data = (await res.json()) as OgResult;
        setOgResult({
          title: data.title ?? null,
          image: data.image ?? null,
          description: data.description ?? null,
        });
      } else {
        setError("미리보기를 가져오지 못했습니다. 링크는 그대로 등록할 수 있습니다.");
      }
    } catch {
      setError("미리보기 요청에 실패했습니다. 링크는 그대로 등록할 수 있습니다.");
    } finally {
      setOgLoading(false);
    }
  }

  /** 업로드 → {url,name,size}. 실패 시 throw */
  async function uploadFile(picked: File): Promise<UploadResult> {
    const fd = new FormData();
    fd.append("file", picked);
    fd.append("wallId", wallId);
    const res = await fetch("/api/wall/upload", { method: "POST", body: fd });
    if (res.ok) {
      return (await res.json()) as UploadResult;
    }
    if (res.status === 413) throw new Error("파일이 너무 큽니다. (최대 10MB)");
    if (res.status === 415) throw new Error("허용되지 않는 파일 형식입니다.");
    if (res.status === 429) throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도하세요.");
    throw new Error("파일 업로드에 실패했습니다.");
  }

  function validate(): string | null {
    if (!nickname.trim()) return "닉네임을 입력하세요.";
    if (nickname.trim().length > 60) return "닉네임은 60자 이내로 입력하세요.";
    if (kind === "text" && !title.trim() && !body.trim()) {
      return "제목이나 내용을 입력하세요.";
    }
    if ((kind === "image" || kind === "file") && !file) {
      return "파일을 선택하세요.";
    }
    if (kind === "link" && !linkUrl.trim()) {
      return "링크 주소를 입력하세요.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // 카드 페이로드 조립
      const payload: Record<string, unknown> = {
        wallSlug,
        kind,
        author_name: nickname.trim(),
        color,
      };
      if (title.trim()) payload.title = title.trim();

      if (kind === "text") {
        if (body.trim()) payload.body = body.trim();
      } else if (kind === "image" || kind === "file") {
        const uploaded = await uploadFile(file as File);
        payload.media_url = uploaded.url;
        payload.media_name = uploaded.name;
        payload.media_size = uploaded.size;
      } else if (kind === "link") {
        payload.link_url = linkUrl.trim();
        if (ogResult) payload.link_meta = ogResult;
      }

      const res = await fetch("/api/wall/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        window.localStorage.setItem(NICKNAME_STORAGE_KEY, nickname.trim());
        onCardAdded();
        return;
      }
      if (res.status === 403) {
        setError("이 담벼락은 기여가 잠겨 있어 카드를 추가할 수 없습니다.");
      } else if (res.status === 404) {
        setError("담벼락을 찾을 수 없습니다.");
      } else if (res.status === 429) {
        setError("요청이 너무 많습니다. 잠시 후 다시 시도하세요.");
      } else if (res.status === 400) {
        setError("입력값을 확인해 주세요.");
      } else {
        setError("카드를 추가하지 못했습니다. 다시 시도해 주세요.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="카드 추가"
      onClick={() => !submitting && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
        zIndex: 100,
      }}
    >
      <form
        className="card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          maxWidth: 460,
          width: "100%",
          marginTop: 32,
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 className="h3">카드 추가</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            disabled={submitting}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              lineHeight: 1,
              color: "var(--color-ink-soft)",
            }}
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* 종류 선택 — 세그먼트 컨트롤 */}
        <div role="radiogroup" aria-label="카드 종류" style={{ display: "flex", gap: 6 }}>
          {KIND_ORDER.map((k) => {
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setKind(k);
                  setError(null);
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 4px",
                  borderRadius: "var(--radius-sm)",
                  border: active
                    ? "1px solid var(--color-green-deep)"
                    : "1px solid var(--color-line-strong)",
                  background: active ? "var(--color-green-soft)" : "var(--color-paper)",
                  color: active ? "var(--color-green-deep)" : "var(--color-ink-soft)",
                  fontWeight: 600,
                  fontSize: ".9rem",
                  cursor: "pointer",
                }}
              >
                {KIND_ICONS[k]()}
                {KIND_LABELS[k]}
              </button>
            );
          })}
        </div>

        {/* 닉네임 — 공통 */}
        <label>
          <span style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: ".9rem" }}>
            닉네임 <span style={{ color: "var(--color-danger)" }}>*</span>
          </span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={60}
            required
            placeholder="표시될 이름"
            autoComplete="nickname"
          />
        </label>

        {/* 제목 — 공통(선택) */}
        <label>
          <span style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: ".9rem" }}>
            제목 <span style={{ color: "var(--color-ink-soft)" }}>(선택)</span>
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="카드 제목"
          />
        </label>

        {/* 종류별 입력 */}
        {kind === "text" && (
          <label>
            <span style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: ".9rem" }}>
              내용
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="담벼락에 남길 내용을 적어 주세요."
            />
          </label>
        )}

        {(kind === "image" || kind === "file") && (
          <div>
            <label>
              <span
                style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: ".9rem" }}
              >
                {kind === "image" ? "이미지 파일" : "파일"}{" "}
                <span style={{ color: "var(--color-ink-soft)" }}>(최대 10MB)</span>
              </span>
              <input
                type="file"
                accept={kind === "image" ? "image/*" : undefined}
                onChange={handleFileChange}
                style={{ border: "none", padding: 0, fontSize: ".9rem" }}
              />
            </label>
            {filePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={filePreview}
                alt="미리보기"
                style={{
                  marginTop: 10,
                  width: "100%",
                  maxHeight: 200,
                  objectFit: "contain",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-line)",
                }}
              />
            )}
            {file && !filePreview && (
              <p
                className="body"
                style={{ marginTop: 8, fontSize: ".84rem" }}
              >
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>
        )}

        {kind === "link" && (
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              <span
                style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: ".9rem" }}
              >
                링크 주소
              </span>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setOgResult(null);
                }}
                placeholder="https://example.com"
              />
            </label>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleFetchOg}
              disabled={ogLoading || !linkUrl.trim()}
              style={{ justifySelf: "start" }}
            >
              <IconDownload size={16} />
              {ogLoading ? "불러오는 중…" : "미리보기 가져오기"}
            </button>
            {ogResult && (
              <div
                style={{
                  border: "1px solid var(--color-line)",
                  borderRadius: "var(--radius-sm)",
                  padding: 10,
                  background: "var(--color-paper-soft)",
                }}
              >
                {ogResult.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ogResult.image}
                    alt=""
                    style={{
                      width: "100%",
                      height: 110,
                      objectFit: "cover",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: 6,
                    }}
                  />
                )}
                <p style={{ fontWeight: 700, fontSize: ".9rem" }}>
                  {ogResult.title || "제목 없음"}
                </p>
                {ogResult.description && (
                  <p className="body" style={{ fontSize: ".82rem", marginTop: 2 }}>
                    {ogResult.description}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 색상 — 공통 */}
        <div>
          <span
            style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: ".9rem" }}
          >
            카드 색상
          </span>
          <div role="radiogroup" aria-label="카드 색상" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {WALL_COLORS.map((c) => {
              const active = color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "999px",
                    background: c.value,
                    border: active
                      ? "3px solid var(--color-green-deep)"
                      : "1px solid var(--color-line-strong)",
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: "var(--color-danger)", fontSize: ".88rem" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting}
          style={{ width: "100%" }}
        >
          <IconPlus size={16} />
          {submitting ? "추가하는 중…" : "카드 추가"}
        </button>
      </form>
    </div>
  );
}
