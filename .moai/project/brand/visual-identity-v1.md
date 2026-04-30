# Visual Identity v1 — nedabah.org (2026-05-01 정립)

> 사이트 진단 H2 결과로 작성. MoAI 기본 템플릿(visual-identity.md)이 아닌 v1 확정 문서.

## 1. 결정 (Decisions)

### 강조색
- **Primary** : Cobalt Blue `#1E40AF`
- 결정 근거: 2026-04-30 v3.css·warm-tone-v1.css 일괄 코발트 전환됨
- 변수 `--copper`는 변수명만 남고 값은 코발트 — 후속 작업에서 `--c-cobalt`·`--accent`로 마이그레이션

### 서브 색상
- **Secondary** : Cobalt Soft `#3B82F6` (보조 강조·아이콘)
- **Accent**    : Sage `#8a9a7a` (부드러운 강조·자연 톤)

### 페이퍼 톤 (배경)
- **Background**: `#f7f3ec` (paper)
- **Surface**   : `#fdfaf3` (paper-3, 카드)
- **Section**   : `#efe7d6` (paper-2, 섹션 강조)

### 텍스트
| 토큰 | HEX | 대비 |
|---|---|---|
| `--ink`   | `#2a241c` | 11.5:1 ✅ AAA |
| `--ink-2` | `#5a5048` | 4.5:1 ✅ AA  (a11y-fixes-v1.css에서 보정) |

## 2. Neutral Scale

```
50  : #fafaf7
100 : #f3f1ed
200 : #e8e6e0
300 : #d8cdb8
400 : #c4b88f
500 : #8a7a64
600 : #6b6155
700 : #5a5048
800 : #3a322a
900 : #2a241c
950 : #16110a
```

## 3. 타이포그래피

```
primary_font   : Pretendard Variable
secondary_font : same
mono_font      : ui-monospace, Menlo, Consolas, monospace
serif_font     : Noto Serif KR (인용·세리프 강조)
font_source    : local + google-fonts (Noto Serif KR)
```

## 4. 로고

```
logo_file      : (텍스트 로고 사용 — "네다바웨이")
logo_dark_file : same
logo_max_height: 32px
```

## 5. Layout Preferences

```
hero_layout       : centered (메인) / split-left (programs·iden)
section_rhythm    : alternating-bg (paper · paper-2 · paper)
border_radius_style: rounded (6px 카드 · 12px 큰 카드 · 2px 배지)
```

## 6. Dark Mode

```
dark_mode_support: none (현재 미지원, 후속 H4 작업)
```

## 7. Do's

- 따뜻한 페이퍼 톤 배경 + 코발트 강조의 차분한 조합
- 한국어 타이포그래피 (Pretendard) 가독성 우선
- 여백 충분히 (8px 그리드)
- 1차 좌표 메시지 ("직업의 속성은 이타성이다") 모든 메인 hero 자리잡음
- 카드 배경 `#fdfaf3` (페이지 대비 살짝 밝게)

## 8. Don'ts

- ❌ 노란색 사용 (사용자 영구 지시: "노란색 쓰지마")
- ❌ 너무 밝은 흰 배경 (사용자 영구 지시: "너무 밝을 필요 없다")
- ❌ 보라-파랑 그라디언트 (트렌디 SaaS 스타일 회피)
- ❌ 흰 카드 + 흰 배경 (분리 안 됨) — 항상 `--paper-3`로
- ❌ 일반 stock 아이콘 (1차 좌표에 맞는 시각 표현 우선)
- ❌ "그분이 메일 보냈다" 같은 클리셰 시각 (가상 인물 시각화 회피)

## 9. 1차 좌표 시각 표현

### 핵심 메시지
> "직업의 속성은 이타성이다. 한 사람의 일을 다시 디자인합니다."

### 시각 패턴
- "이타성" 단어 = 코발트 강조
- "한 사람" = 본문 톤 유지 (강조 안 함, 평등성 표현)
- og-default.svg에 동일 메시지 새김

## 10. Last Updated

- 2026-05-01: v1 정립 (사이트 진단 H2 결과)
- 작성: Claude Code (사용자 71건 순차 진행 지시)
