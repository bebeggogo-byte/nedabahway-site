# SBM Observatory — 방법론·메타 표준 명세 (v1.0)

> 단일 소스(Single Source of Truth). `magazine/` 각 장 콘텐츠와 `sbm.html` 방법론 페이지는 이 명세를 따른다. 요한계시록까지 66권 확장 시 일관성의 기준 문서.

최종 갱신: 2026-05-29

---

## 1. 약어 정의 (확정)

> **발견된 문제**: 약어가 세 갈래로 불일치한다.
> - `sbm.html` 타이틀: **Self Bible Meditation for Maturity**
> - `sbm.html` description: **Sense·Build·Measure**
> - `sbm.html` FAQ(JSON-LD): **Scripture-Based Meditation**

**확정안 (택1 권장):**
- **정식 명칭**: `SBM — Self Bible Meditation for Maturity` (성숙을 위한 셀프 성경 묵상)
- **부제 슬로건**으로만 `Sense · Build · Measure`를 쓰되, 약어 풀이로 혼용 금지
- FAQ의 `Scripture-Based Meditation`은 정식 명칭으로 교체

근거: 콘텐츠 전반과 마스트헤드가 "Self Bible Meditation"을 채택하고, 비영리 정관 연계 FAQ만 다른 표기를 써서 SEO·브랜드 혼선을 일으킨다.

---

## 2. 9단계 — 두 정의의 통합

> **발견된 문제**: `sbm.html`의 9단계와 실제 콘텐츠(magazine)의 9단계가 다르다.

| # | sbm.html 방법론(공개 설명) | magazine 콘텐츠(관찰 transcript) | 관계 |
|---|---|---|---|
| 1 | 본문 받아 적기 | 무대·배경·소품·소재 | 받아적으며 무대를 본다 |
| 2 | 단락 가르기 | 첫 느낌·분위기 | 정서 → 단락 인식 |
| 3 | 반복 어절 세기 | 시작과 끝 | 반복으로 수미 구조 파악 |
| 4 | 인물·장소·시간 | 등장인물·사물·상황·사상 | 동일 축 |
| 5 | 원어 단서 | 장면 컷 분절 | 별개 축(원어는 콘텐츠 6단계로 이동) |
| 6 | 맞은편 본문 | 의문·발견·정보(원어 카드·문학구조·ANE·교차참조) | 콘텐츠가 더 넓음 |
| 7 | 열린 질문 | 동영상 — 컷 이어 붙이기 | 별개 |
| 8 | 30분 가이드 | 초벌 제목·부제 | 별개 |
| 9 | 관찰자의 후기 | 기도·내면 떠오름 | 후기 ↔ 기도 |

**확정안**: 콘텐츠용 9단계를 **canonical(정본)** 으로 삼는다. 이미 114장이 이 순서로 작성됐고 LOCKED s2 구조가 이를 따른다. `sbm.html`의 9단계 카드는 콘텐츠 9단계와 **동일 라벨로 교체**하거나, "방법(공개 입문) ↔ Observatory(심화 관찰)"의 **두 트랙임을 명시**한다. 라벨 불일치를 방치하면 독자가 같은 SBM의 9단계를 두 번 다르게 학습한다.

### Canonical 9단계 (콘텐츠 정본)
1. 무대·배경·소품·소재
2. 첫 느낌·분위기
3. 시작과 끝
4. 등장인물·사물·상황·사상
5. 장면 컷 분절
6. 의문·발견·정보 — (1) 원어 카드 (2) 문학 구조 (3) ANE 배경 (4) 교차 참조
7. 동영상 — 컷 이어 붙이기
8. 초벌 제목·부제
9. 기도·내면 떠오름

---

## 3. 콘텐츠 페이지 구조 (장 index.html)

장마다 다음 골격을 고정한다 (골든 예시: `magazine/GEN/1/index.html`).

```
obs-mast (crumb · h1 · "BOOK-0NN · 정경구분 · 원어" · essence 한 줄)
├─ details#s1  단계 1   "관찰 시뮬레이션 raw transcript"
│    └─ YAML 메타블록 + 면책 blockquote + 진행자·6인 9단계 대화
├─ details#s2  단계 2~7 "관찰된 사실 (LOCKED v2.0 9단계 형식)"
│    └─ 1️⃣~7️⃣ 항목 정리 + 품질 자가감사(6/6) + 9단계 자가감사 + 드리프트 관찰
├─ details#s8  단계 8~9 "미해결 질문" Q1~Q6 + "답을 구하지 않고 머문다"
└─ section#synthesis  "종합 정리" 산문 + <table>
next-row (이전 장 · 권 차례 · 다음 장)
```

보존 요소(절대 변경 금지): head/CSS, gnav, script(resume·toc), footer, 후원 aside.

---

## 4. YAML 메타블록 스키마 (s1 상단)

| 필드 | 의미 | 예 |
|---|---|---|
| `sim_id` | 장 고유 ID | `GEN-001` / `JHN-006` |
| `book` / `book_en` | 책 이름 | 창세기 / Genesis |
| `chapter` / `verse_count` | 장·절 수 | 1 / 31 |
| `bible_block` / `canon` | 정경 구분 | 오경 / 구약 |
| `genre` | 장르 | 내러티브 / 시 / 법 / 족보 / 담화 |
| `language` | 원어 | 히브리어 / 헬라어 / 아람어 |
| `hebrew_terms` / `greek_terms` / `aramaic_terms` | 핵심 원어 음역 배열 | `[bereshit, bara, ...]` |
| `lxx_divergences` | 70인역 차이 | 배열 |
| `ane_refs` / `rabbinic_refs` | 고대근동·랍비 배경(해석 아님) | 배열 |
| `literary_devices` / `repeated_words` / `cross_refs` | 문학 장치·반복어·교차참조 | 배열 |
| `facilitator` | 항상 `성령일_선교사` | 고정 |
| `participants` | 항상 `[P01, P02, P04, P05, P07, P11]` | 고정 |
| `observed_facts_count` | 관찰 사실 수 | 20~28 |
| `silence_moments` | 의도된 침묵 수 | 3~6 |
| `quality_passed` / `drift_flag` | 품질 게이트 | true / false |
| `track` | deep / light | deep |
| `date` | 작성일 | ISO |

페르소나 정의는 `magazine/_meta/personas.json` 참조.

---

## 5. 품질 게이트 (작성 후 자가검증)

- [ ] details 3개(s1/s2/s8) + synthesis 1개 존재
- [ ] 면책 blockquote 존재
- [ ] participants = `[P01,P02,P04,P05,P07,P11]`, facilitator = `성령일_선교사`
- [ ] title·canonical·essence·sim_id 장 고유
- [ ] 원어는 표준 음역만, 불확실은 미해결 질문으로 보류 (drift_flag=false)
- [ ] next-row 이전·다음 장 링크 정확
- [ ] `npx htmlhint <파일>` no errors
- [ ] 책 인덱스 카드 `--pending`→`--done` 갱신 + essence 반영
- [ ] `sbm-progress.json` 진행 수치 동기화

---

## 6. 품질 채점 루브릭 (100점 만점 — 통과 게이트)

> **규칙**: 각 장은 제작 후 `python3 magazine/_meta/score_chapter.py <파일>` 로 채점하여 **100점 만점일 때만 커밋·발행**한다. 100점 미만이면 부족 항목을 보강해 재작성한다. 골든 예시 GEN/1·GEN/16은 100점으로 캘리브레이션됨.

| 영역 | 항목 | 배점 |
|---|---|---|
| 구조(40) | details#s1 / #s2 / #s8 존재 | 8 / 8 / 8 |
| | section#synthesis 존재 | 8 |
| | 종합 정리 본문 충실(≥400자) | 8 |
| 메타(20) | title 고유(— + Observatory) | 4 |
| | canonical 존재 | 4 |
| | essence 고유(placeholder 아님) | 4 |
| | sim_id 고유(BOOK-0NN) | 4 |
| | 정경·원어 배지 | 4 |
| 시뮬레이션(20) | 진행자 성령일_선교사 등장 | 4 |
| | 6인 전원(P01·P02·P04·P05·P07·P11) 발화 | 16 |
| 형식(10) | 면책 blockquote | 5 |
| | 원어 음역(hebrew/greek_terms 채움) | 5 |
| 검증(10) | drift_flag false | 2 |
| | htmlhint 0오류 | 8 |
| **합계** | | **100** |

자동 채점이 다루지 않는 **본문 사실성·원어 정확성·관찰의 깊이**는 작성 에이전트의 책임이자 사람 검토 영역이며, 위 100점은 *형식·구조·완전성의 하한선*이다.

### 보강 대기(회귀 항목)
초기 약식 발행분 14장(GEN 3·4·5·6·7·8·9·10·11·12, JHN 1·2·3·4)은 synthesis 본문이 251자로 짧아 92/100이다. 향후 종합 정리를 보강해 100점화한다.

---

## 7. PDF·공유 산출물 정책 [HARD]

- **PDF·공유는 100점 통과(관찰 완료)한 장/권에 대해서만 생성·배포한다.** 100점 미달이거나 placeholder인 장의 PDF는 만들지 않는다.
- 권이 100점으로 전권 완성되면: ① 권별 PDF(`build_pdf.py CODE`) ② 장별 PDF(`build_pdf_chapter.py CODE`) ③ 권 index에 권 PDF 다운로드 버튼 ④ 각 장 페이지에 `sbm-share.js`(장 PDF + 공유 버튼)를 일괄 적용한 뒤 배포한다.
- 도구: `magazine/_meta/build_pdf.py`(권별), `build_pdf_chapter.py`(장별), `assets/sbm-share.js`(장 공유/PDF 버튼).
- 승인·배포 흐름: 9단계 관찰 생산 → `score_chapter.py` 100점 → 커밋 → 권 완성 시 PDF·버튼 → main 머지(배포).
