/**
 * 담벼락(wall) UI 전용 인라인 SVG 아이콘 모음.
 * 순수 컴포넌트(훅 없음) — 서버·클라이언트 컴포넌트 모두에서 사용 가능.
 * 모든 아이콘은 currentColor를 상속해 텍스트 색을 따라가며,
 * aria-hidden·focusable=false로 장식 요소로만 동작한다.
 */
import type { SVGProps } from "react";

/** 모든 아이콘 공통 props */
interface IconProps {
  /** 픽셀 크기 (가로·세로 동일). 기본 18 */
  size?: number;
  className?: string;
}

/** 공통 svg 속성 — 장식용·currentColor 상속 */
function baseSvgProps(size: number, className?: string): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
    className,
  };
}

/** 글 카드 — 텍스트 줄 */
export function IconText({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <line x1="5" y1="7" x2="19" y2="7" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="17" x2="13" y2="17" />
    </svg>
  );
}

/** 이미지 카드 — 사진 액자 */
export function IconImage({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 17l-5-5-9 9" />
    </svg>
  );
}

/** 파일 카드 — 문서 */
export function IconFile({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

/** 링크 카드 — 사슬 */
export function IconLink({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  );
}

/** 공유 — 노드 연결 */
export function IconShare({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </svg>
  );
}

/** 추가 — 플러스 */
export function IconPlus({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/** 다운로드 — 아래 화살표 + 받침 */
export function IconDownload({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/** 복사 — 겹친 문서 */
export function IconCopy({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** 삭제 — 휴지통 */
export function IconTrash({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/** 잠금 — 닫힌 자물쇠 */
export function IconLock({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** 잠금 해제 — 열린 자물쇠 */
export function IconUnlock({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.6-1.7" />
    </svg>
  );
}

/** QR — 코드 격자 */
export function IconQr({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <line x1="14" y1="14" x2="14" y2="17" />
      <line x1="14" y1="21" x2="17" y2="21" />
      <line x1="21" y1="14" x2="21" y2="21" />
      <line x1="17" y1="17" x2="21" y2="17" />
    </svg>
  );
}

/** 담벼락 — 보드 격자 (네비 진입점) */
export function IconWall({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="6.5" y="6.5" width="4.5" height="4.5" rx="0.8" />
      <rect x="13" y="6.5" width="4.5" height="4.5" rx="0.8" />
      <rect x="6.5" y="13" width="4.5" height="4.5" rx="0.8" />
      <rect x="13" y="13" width="4.5" height="4.5" rx="0.8" />
    </svg>
  );
}

/** 닫기 — X */
export function IconClose({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/** 외부 링크 — 새 창으로 열림 */
export function IconExternalLink({ size = 18, className }: IconProps) {
  return (
    <svg {...baseSvgProps(size, className)}>
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
