/**
 * 담벼락(wall) 공용 상수·헬퍼.
 * 토큰 팔레트(tokens.css)에서 파생한 색상만 사용 — 새 팔레트 도입 금지.
 */
import type { CardKind } from "@/types/database";

/** 카드·커버에 쓰는 프리셋 색상. 종이톤 위에서 가벼운 파스텔만 사용. */
export const WALL_COLORS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "#ffffff", label: "흰색" },
  { value: "#f9fafb", label: "연회색" },
  { value: "#e8f3ee", label: "연녹색" },
  { value: "#fef3c7", label: "연노랑" },
  { value: "#fef2f2", label: "연분홍" },
  { value: "#e0f2fe", label: "연파랑" },
  { value: "#ede9fe", label: "연보라" },
];

/** 카드 기본 배경 (color 미지정 시) */
export const DEFAULT_CARD_COLOR = "#ffffff";
/** 담벼락 기본 커버 색 */
export const DEFAULT_COVER_COLOR = "#e8f3ee";

/** 업로드 제한 — 백엔드 계약과 일치 (10MB) */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** 허용 업로드 MIME (백엔드 계약과 일치) */
export const ALLOWED_UPLOAD_MIME: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/x-hwp",
  "application/haansofthwp",
  "application/zip",
  "application/x-zip-compressed",
]);

/** localStorage 키 — 마지막 사용 닉네임 */
export const NICKNAME_STORAGE_KEY = "nedabah:wall:nickname";

/** 카드 종류 한글 라벨 */
export const KIND_LABELS: Record<CardKind, string> = {
  text: "글",
  image: "이미지",
  file: "파일",
  link: "링크",
};

/** OG 미리보기 결과 (api/wall/og 응답 형태) */
export interface OgResult {
  title: string | null;
  image: string | null;
  description: string | null;
}

/** 바이트 크기를 사람이 읽는 문자열로 변환 */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(value >= 10 || exp === 0 ? 0 : 1)} ${units[exp]}`;
}

/** ISO 시각을 상대 시간 한글 문자열로 변환 */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "방금 전";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return new Date(then).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
