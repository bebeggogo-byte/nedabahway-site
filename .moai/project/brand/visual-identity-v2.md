# Visual Identity v2 — nedabah.org (2026-09-25 정립)

> 대표님이 보내주신 NEDABAHWAY 브랜드 보드를 로고 원본으로 확정(2026-09-25).
> v1(`visual-identity-v1.md`)의 "코발트 엣지 포인트 전용", "UI 노란색 금지" 규칙은 이 문서로 대체됩니다(사용자 결정: "새 팔레트로 전면 교체").

## 1. 로고

- 원본: 브랜드 보드의 메인 로고(심볼 + `NEDABAHWAY` 워드마크 + `JEJU · EDUCATION · LIFE`)
- 사이트용 파일 (`assets/brand/`, 배경 투명 PNG)
  - `nw-logo.png` — 전체 로고(제안서·인쇄물용)
  - `nw-symbol.png` — 6색 심볼 + 별표(헤더)
  - `nw-wordmark.png` — 워드마크(헤더·푸터)
- 로고 옆에 한글 "네다바웨이"는 붙이지 않습니다.
- 로고는 보드 그대로 사용하며, 색이나 모양을 다시 그리지 않습니다.

## 2. 슬로건

- 다른 사람들이 만들어내는, 더 넓은 세상 *
- Different People, Bigger World *
- 서로 다른 6가지 시선이 만나는 순간, 세상은 더 넓어집니다.

## 3. 6 TYPES 팔레트

| 타입 | 한글 | HEX | CSS 변수 |
|---|---|---|---|
| Explorer | 탐험하는 사람 | `#FF6B3D` | `--explorer` |
| Maker | 만드는 사람 | `#FFC857` | `--maker` |
| Connector | 연결하는 사람 | `#3B82F6` | `--connector` |
| Supporter | 돕는 사람 | `#10B981` | `--supporter` |
| Thinker | 생각하는 사람 | `#8B5CF6` | `--thinker` |
| Enjoyer | 즐기는 사람 | `#F472B6` | `--enjoyer` |

- 타입 아이콘: `assets/brand/type-*.png`
- 6색은 면, 오프셋 그림자, 점 마커, 일러스트에 씁니다.
- 글자색·버튼 배경은 명도 대비(WCAG AA)를 위해 Connector 계열의 진한 파랑 `#1D4ED8`(`--cobalt`)을 씁니다. 노란색·분홍색 위에는 흰 글씨를 올리지 않습니다.

## 4. 바탕과 글씨

| 토큰 | HEX | 용도 |
|---|---|---|
| `--bg` | `#f1ede5` | 페이지 바탕(보드 종이색) |
| `--bg-2` | `#e8e2d5` | 섹션 강조 |
| `--card` | `#faf8f3` | 카드 |
| `--ink` | `#1b1b1b` | 본문 글씨 |
| `--text-3` | `#55504a` | 보조 글씨 |

## 5. 캐릭터

- 메인 히어로: 귤 캐릭터가 한라산 뒤에서 얼굴을 내민 제주 배너 전체(`assets/brand/nw-hero-banner.jpg`, 1728×910, 휴대폰용 900px 버전 포함)

## 6. 사이트 전체 적용 (2026-09-25)

- 공용 CSS(`v3.css`, `warm-tone-v1.css`, `global-nav.css`, `nedabah.bundle.css`, `mobile-v1.css`, `typography-v4.css`, `back-to-top.css`, `deck-toggle.css`)의 색 값을 v2로 바꿨습니다. 변수 이름(`--copper`, `--c-cobalt` 등)은 기존 페이지 호환을 위해 그대로 두었습니다.
- 모든 페이지 헤더(`.gnav__logo`)의 글자 로고를 심볼과 워드마크 이미지로 바꿨고, 페이지를 만드는 빌드 스크립트의 헤더 템플릿도 함께 바꿨습니다.
- 페이지 안에 직접 적은 색(inline style)은 페이지별 디자인으로 보고 그대로 두었습니다.
