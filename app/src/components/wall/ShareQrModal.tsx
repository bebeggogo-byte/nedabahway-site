"use client";

/**
 * 담벼락 공유 모달 — 전체 URL · 복사 버튼 · QR 코드.
 * QR은 qrcode 패키지로 canvas에 렌더링, PNG 다운로드 지원.
 */
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface ShareQrModalProps {
  /** 담벼락 slug — URL은 클라이언트의 origin 기준으로 조립 */
  slug: string;
  wallTitle: string;
  onClose: () => void;
}

export function ShareQrModal({ slug, wallTitle, onClose }: ShareQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState(false);

  // origin은 클라이언트에서만 알 수 있음
  useEffect(() => {
    setUrl(`${window.location.origin}/wall/${slug}`);
  }, [slug]);

  // QR 렌더링
  useEffect(() => {
    if (!url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 1 }, (err) => {
      if (err) setQrError(true);
    });
  }, [url]);

  // 진입 시 닫기 버튼에 포커스 + Escape 닫기
  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `wall-${slug}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="담벼락 공유"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 380, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <h2 className="h3">담벼락 공유</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "1.3rem",
              lineHeight: 1,
              color: "var(--color-ink-soft)",
            }}
          >
            ✕
          </button>
        </div>

        <p className="body" style={{ marginBottom: 16 }}>
          {wallTitle}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
            minHeight: 220,
            alignItems: "center",
          }}
        >
          {qrError ? (
            <p className="body" style={{ color: "var(--color-danger)" }}>
              QR 코드를 만들지 못했습니다.
            </p>
          ) : (
            <canvas ref={canvasRef} aria-label="담벼락 QR 코드" />
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            alignItems: "stretch",
          }}
        >
          <input
            type="text"
            readOnly
            value={url}
            aria-label="담벼락 주소"
            onFocus={(e) => e.currentTarget.select()}
            style={{ flex: 1, fontSize: ".86rem" }}
          />
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleCopy}
            style={{ whiteSpace: "nowrap" }}
          >
            {copied ? "복사됨" : "복사"}
          </button>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={handleDownload}
          disabled={qrError}
          style={{ width: "100%" }}
        >
          QR 다운로드
        </button>
      </div>
    </div>
  );
}
