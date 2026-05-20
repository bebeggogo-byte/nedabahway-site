# Wikidata 등록 초안 — 김창환 / 네다바웨이

> **목적**: Google 지식패널 트리거의 1차 신호인 Wikidata 항목을 등록한다.
> **출처 데이터**: `knowledge-graph.jsonld`, `people.json` (2026-05-20 기준)
> **작성일**: 2026-05-20
> **작성자**: MoAI (draft only — 등록·수정은 사용자 본인 수동)

---

## 0. 먼저 읽을 것 — Wikidata Notability 현실

Wikidata는 신청제가 아니지만 **삭제 토론(WD:RFD)**이 활발합니다. 등록 자체는 누구나 가능하나, 다음 중 **최소 1개**를 충족하지 못하면 며칠~몇 주 안에 삭제될 수 있습니다.

| 기준 (WD:N) | 본 케이스 충족 여부 |
|---|---|
| ① 어느 위키미디어 사이트(위키백과/위키문헌/커먼즈)에 sitelink가 있다 | **미충족** — 위키백과 한국어/영어판 문서 없음 |
| ② 명확히 식별 가능한 실체이며 **외부 신뢰출처**로 설명 가능 | **부분 충족** — 자체 사이트 외 제3자 출처 부족 |
| ③ 다른 항목의 속성 채움(structural need)에 필요 | **약함** — 책 출간 후 ISBN 항목 등에서 발생 가능 |

### 권장 진행 순서

1. **선결**: 책(`AI시대, 진로직업가치관 필독서`) ISBN 확정 & 국립중앙도서관 납본 → 외부 출처 1건 확보
2. **선결**: 언론 인용 또는 학술 발표 자료 1건 확보 (블로그/SNS는 신뢰 출처로 인정 안 됨)
3. 그 후 항목 등록 — 삭제 토론에서 외부 출처 제시 가능
4. 등록 직후 1주일은 매일 토론 페이지 모니터링

**대안 (병행 가능)**: 위키백과 한국어판 인물 문서 초안 사용자공간(User:)에서 먼저 작성 → 게재 → Wikidata는 자동 생성. 단, 한국어 위키백과 인물 등재 기준이 별도로 까다로움.

---

## 1. Item A — Person: 김창환 (Kim Changhwan)

### 1.1 라벨·설명·별칭

| 필드 | 한국어 | 영어 |
|---|---|---|
| Label | 김창환 | Kim Changhwan |
| Description (≤250자) | 한국의 교육자·코치, 네다바웨이 창립자, 제주 거주 | Korean educator and founder of Nedabahway, a one-person education studio in Jeju |
| Aliases | 창환 김 | Changhwan Kim |

### 1.2 Statements (P-code → Value)

| Property | 값 | 출처(Reference) 필요 |
|---|---|---|
| **P31** instance of | Q5 (human) | — |
| **P21** sex or gender | (본인이 직접 입력 권장 — 사생활) | — |
| **P27** country of citizenship | Q884 (South Korea) | 본인 사이트 about.html |
| **P19** place of birth | (선택) | — |
| **P551** residence | Q43483 (Jeju) 또는 Q487115 (Seogwipo) | about.html |
| **P106** occupation | Q1234713 (educator), Q21208215 (coach), Q482980 (author) | 책·사이트 |
| **P108** employer | (Item B Q-id 입력) | 사이트 |
| **P112** founder of | (Item B Q-id 입력) | 사이트, foundingDate 2025-03-20 |
| **P1559** name in native language | 김창환 (mul: ko) | — |
| **P735** given name | Q-id of 창환 (없으면 미등록) | — |
| **P734** family name | Q15625609 (김) | — |
| **P800** notable work | (책 항목 — 출간 후 등록) | ISBN, 납본 기록 |
| **P856** official website | https://www.nedabah.org | — |
| **P2397** YouTube channel ID | UCWnbno58Hrtiu8fPjrCCTfQ | — |
| **P6634** LinkedIn personal profile ID | nedabah-way-3605413aa | — |
| **P3013** Naver blog ID | nedabah | — |

### 1.3 QuickStatements 포맷 (등록 후 일괄 입력용)

승인된 QuickStatements 도구(https://quickstatements.toolforge.org/)에 다음 텍스트를 붙여넣으면 일괄 추가됩니다. **`LAST`는 항목 생성 직후 자동으로 그 항목을 가리키는 변수입니다.**

```
CREATE
LAST	Lko	"김창환"
LAST	Len	"Kim Changhwan"
LAST	Dko	"한국의 교육자·코치, 네다바웨이 창립자, 제주 거주"
LAST	Den	"Korean educator, founder of Nedabahway, based in Jeju"
LAST	Ako	"창환 김"
LAST	Aen	"Changhwan Kim"
LAST	P31	Q5
LAST	P27	Q884
LAST	P551	Q43483
LAST	P106	Q1234713
LAST	P106	Q21208215
LAST	P106	Q482980
LAST	P856	"https://www.nedabah.org"
LAST	P2397	"UCWnbno58Hrtiu8fPjrCCTfQ"
LAST	P6634	"nedabah-way-3605413aa"
```

---

## 2. Item B — Organization: 네다바웨이 (Nedabahway)

### 2.1 라벨·설명·별칭

| 필드 | 한국어 | 영어 |
|---|---|---|
| Label | 네다바웨이 | Nedabahway |
| Description (≤250자) | 제주에 본부를 둔 1인 교육 스튜디오, 2025년 설립 | One-person education studio based in Jeju, founded 2025 |
| Aliases | Nedabah | — |

### 2.2 Statements

| Property | 값 |
|---|---|
| **P31** instance of | Q1320047 (educational organization) |
| **P17** country | Q884 (South Korea) |
| **P159** headquarters location | Q487115 (Seogwipo) |
| **P571** inception | +2025-03-20T00:00:00Z/11 |
| **P112** founded by | (Item A Q-id) |
| **P856** official website | https://www.nedabah.org |
| **P2002** X username | (있으면 입력) |
| **P2013** Facebook ID | (있으면 입력) |

### 2.3 QuickStatements

```
CREATE
LAST	Lko	"네다바웨이"
LAST	Len	"Nedabahway"
LAST	Dko	"제주에 본부를 둔 1인 교육 스튜디오"
LAST	Den	"One-person education studio based in Jeju, South Korea"
LAST	Ako	"Nedabah"
LAST	P31	Q1320047
LAST	P17	Q884
LAST	P159	Q487115
LAST	P571	+2025-03-20T00:00:00Z/11
LAST	P856	"https://www.nedabah.org"
```

---

## 3. Item C — Book (출간 후 등록, 보류)

| 필드 | 값 |
|---|---|
| Label (ko) | AI시대, 진로직업가치관 필독서 — 네 마음도 따뜻해지길! |
| P31 | Q571 (book) 또는 Q47461344 (written work) |
| P50 (author) | Item A |
| P123 (publisher) | IDEN · Nedabahway (별도 항목 필요) |
| P407 (language) | Q9176 (Korean) |
| P577 (publication date) | TBD |
| **P212 (ISBN-13)** | **TBD — 등록 전제 조건** |
| P953 (full work URL) | book-excerpt.html |

> **ISBN 미확정 시 등록 보류**. ISBN이 있어야 국립중앙도서관 OPAC·교보·예스24 등의 외부 출처로 statement reference 가능.

---

## 4. 등록 사전 체크리스트

등록 직전 다음을 모두 확인:

- [ ] `about.html`에 본명·생년·국적·직업이 명확히 표기되어 있는가
- [ ] LinkedIn, YouTube, Naver Blog 프로필의 이름·소개·사진이 사이트와 100% 일치하는가
- [ ] 사이트에서 본인을 지칭하는 표현이 동일한가 (김창환 / Kim Changhwan만 사용, 변형 표기 금지)
- [ ] 책 ISBN 또는 언론 인용 또는 학술 발표 1건 이상 외부 출처 확보됨
- [ ] `knowledge-graph.jsonld`의 sameAs 링크가 모두 200 응답하는가
- [ ] 동명이인 확인 — `김창환`은 흔한 이름이므로 disambiguator 필요 (예: "(1900년대 출생)", "(교육자)")

---

## 5. 등록 후 모니터링

| 시점 | 확인 항목 |
|---|---|
| D+0 | 항목 Q-id 기록, `knowledge-graph.jsonld`에 `"sameAs"`로 `https://www.wikidata.org/wiki/Qxxxxx` 추가 |
| D+1 ~ D+7 | 항목 Talk 페이지 + Recent changes에서 삭제 토론(`{{Delete}}`) 감지 |
| D+7 ~ D+14 | Google 지식 그래프 검색 API(https://kgsearch.googleapis.com/v1/entities:search) 로 노출 여부 점검 |
| D+30 ~ D+90 | Google 검색 SERP에서 본인 이름 검색 → 지식패널 카드 등장 여부 |
| 등장 시 | 카드 하단 "지식 패널 소유권 주장하기" 클릭 → YouTube 채널 인증 |

---

## 6. 우리(코드 측) 작업 — Wikidata 등록과 무관하게 선행 가능

본인 작업이 진행되는 동안 자동으로 처리할 수 있는 것:

1. **`knowledge-graph.jsonld`에 Wikidata identifier slot 예약**
   - `"identifier": [{"@type": "PropertyValue", "propertyID": "wikidata", "value": "TBD"}]` 추가
   - 등록 후 Q-id만 채우면 됨

2. **`sameAs` 자동 검증 스크립트**
   - LinkedIn/YouTube/Naver Blog URL이 200 응답하는지 주간 체크
   - CI에서 lychee로 이미 검증 중인지 확인 필요

3. **동명이인 disambiguator 영구 도입**
   - 모든 sameAs 외부 채널에 "Jeju, Korea" 또는 "Nedabahway" 키워드 명시
   - 이미 about.html에 반영됨 — 다른 페이지 점검 필요

위 3개는 별건 SPEC 없이 즉시 처리 가능. 진행 원하면 알려 주세요.

---

**다음 액션**: 본인이 책 ISBN 확정/언론 인용 1건 확보 후 §1.3, §2.3의 QuickStatements 텍스트로 등록.
