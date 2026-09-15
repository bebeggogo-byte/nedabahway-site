# 05. 시민과학 성과결과물 유형론 — 워크숍 방법론 백본

대상: 12월 성과공유회를 준비하는 시민과학 팀(팀당 1~2인, 일반 시민)
목적: "무엇을 만들 것인가"가 아니라 "그것을 어떻게 만들 것인가"의 뼈대
작성일: 2026-09-03

---

## 검증 상태 고지

이 문서는 **WebSearch 결과의 페이지 제목과 스니펫만으로** 작성되었습니다.
본문 원문(WebFetch)은 조직 이그레스 프록시에서 전 호스트 차단되어 **단 한 건도 열람하지 못했습니다.**

등급 규약:

| 등급 | 의미 | 신뢰 수준 |
|---|---|---|
| **[T]** | 검색 결과 **페이지 제목에 문자 그대로** 등장하는 사실 | 높음 |
| **[S]** | 검색 엔진 **스니펫/본문 발췌**에서 확인된 사실 | 중간 |
| **[미확인]** | 추론 또는 근거가 얇은 것. 아래 별도 섹션에 격리 | 낮음 — 워크숍 배포 전 반드시 원문 확인 |

**사용 시 유의**
- 숫자와 연도는 스니펫 표기를 그대로 옮겼습니다. 발표 자료에 인용할 때는 해당 URL을 직접 열어 재확인하십시오.
- 아래 8대 유형 표의 "유형성" 판정은 워크숍 설계자의 **운영 판단**이며 [미확인]입니다. 출처 있는 사실과 구분해서 읽으십시오.
- URL은 검색 결과에 나온 것만 그대로 옮겼습니다. 임의 생성한 URL은 한 건도 없습니다.

---

## 시민과학 성과물 8대 유형

**유형성 판정 기준(워크숍 하드 요건)**: 12월 성과공유회 당일, 참가자가 **손에 들고 갈 수 있는 물체**로 존재하는가.
- ◎ 완전 유형 — 그 자체가 인쇄물/실물. 별도 조치 없이 유형.
- ○ 조건부 유형 — 디지털이 본체지만 **인쇄/제본만 하면** 즉시 유형이 됨.
- △ 유형화 필요 — 본체가 온라인/데이터. 유형화하려면 **별도 물리 산출물을 추가 설계**해야 함.

| # | 유형명 | 정의 | **유형성** (12월에 손에 들고 갈 수 있는가) | 최소 필요 데이터 | 제작 난이도 | 실물 사례 URL |
|---|---|---|---|---|---|---|
| 1 | **학술형 포스터** (A1/A0 1장) | 조사 목적·방법·결과·결론을 대형 인쇄물 1장에 압축 | **◎** 출력소에서 A1 1장 인쇄 = 그날 벽에 걸고 말아서 들고 감. 가장 확실한 유형물. | 관찰 30~50건 + 사진 3~5장 + 그래프 1~2개 | 중 (레이아웃 학습 필요) | https://www.karm.or.kr/workshop/202401/file/poster_240320.pdf (규격 안내 [T]) / https://med-fom-dcd14.sites.olt.ubc.ca/files/2021/07/Morrison_Method_How_To_Guide.pdf [T] |
| 2 | **종 목록집 / 체크리스트** (제본 소책자) | 조사지에서 확인된 종을 분류군별로 정리한 목록 | **◎** A5 소책자 10~20쪽으로 제본하면 팀당 여러 부 배포 가능. 재고가 남는 유일한 유형. | 종명 + 관찰일 + 관찰지점 (최소 3열) | 하 (표만 채우면 성립) | https://www.naturing.net/m/7720/entryobs/19034/map (가로림만 생물다양성 탐사 [T]) |
| 3 | **분포 지도** (인쇄 지도 패널) | 관찰 위치를 지도 위에 점/색으로 표현 | **○** 온라인 지도가 본체이므로 **A2 이상 인쇄 패널로 출력**해야 유형이 됨. QR로 온라인 지도 병기 권장. | 관찰 좌표(위경도) + 종명 + 날짜 | 중 (좌표 정제가 관건) | https://www.naturing.net/m/4691/summary ("지금, 여기, 우리가 만드는 생물다양성 지도" [T]) / https://www.google.com/intl/ko/maps/about/mymaps/ [T] |
| 4 | **시민 도감 / 포켓 필드가이드** (접이식 인쇄물) | 우리 동네에서 실제로 만난 종만 골라 만든 동정용 가이드 | **◎** A4 양면 4~8단 접이식. 코팅하면 현장 배포용으로 재사용됨. 유형성·확산성 모두 최상. | 종별 사진 1장 + 식별 포인트 2~3줄 + 관찰 시기 | 중 (사진 품질이 좌우) | https://magazine.scienceconnected.org/2020/01/book-review-field-guide-to-citizen-science/ [T] / https://sci-draw.com/ko/blog/how-to-make-a-dichotomous-key (검색표 만드는 법 [T]) |
| 5 | **데이터셋 + 데이터 설명서** | 정제된 관찰 데이터(CSV)와 그 메타데이터 문서 | **△** 본체가 파일. **"데이터 설명서 1장 인쇄 + QR/USB 동봉"** 형태로만 유형화됨. 단독 제출 시 12월 요건 미달 위험. | 표준 컬럼(아래 데이터 품질 절 참조) 갖춘 CSV | 중~상 (표준 준수가 부담) | https://ipt.gbif.org/manual/en/ipt/latest/darwin-core [T] / https://www.gbif.org/data-papers [T] |
| 6 | **정책 제안서 (policy brief)** | 조사 결과를 근거로 행정·의회에 내는 1~2장 제안서 | **◎** A4 2장 컬러 인쇄. 담당 부서에 실제로 전달 가능한 유일한 유형. | 문제 근거 데이터 1~2개 + 비교 기준 + 요구사항 1~3개 | 중 (데이터보다 논리가 관건) | https://idrc-crdi.ca/en/funding/resources-idrc-grantees/how-write-policy-brief [T] / https://epm.ucdavis.edu/sites/g/files/dgvnsk296/files/inline-files/EPM-Policy-Brief-Guide.pdf [T] |
| 7 | **사진·기록 전시 패널** (캡션 포함) | 조사 과정과 발견을 사진 + 캡션으로 구성한 전시물 | **◎** 폼보드 3~6장. 성과공유회장 벽면을 그대로 채움. 다만 **팀이 들고 귀가하기엔 부피가 큼** — 축소 인쇄본을 함께 만들 것. | 사진 6~12장 + 캡션(촬영일/장소/종명/한 줄 의미) | 하~중 (캡션 규격만 지키면 됨) | http://www.photojournal.co.kr/mobile/bbs/board.php?bo_table=spe_edit&wr_id=5208&page=3 [T] / https://creative-canvas.co.kr/%EB%AF%B8%EC%88%A0-%EC%9E%91%ED%92%88-%EC%BA%A1%EC%85%98-%ED%91%9C%EA%B8%B0%EB%B2%95/ [T] |
| 8 | **활동 결과 보고서 / 자료집** (제본) | 배경·방법·결과·한계·다음 계획을 담은 문서형 결과물 | **○** 링제본 20~40쪽. 인쇄·제본을 하지 않으면 PDF로만 남아 유형 요건 탈락. **요약문 1장은 반드시 별쇄**. | 활동 일지 + 결과 표 + 사진 + 요약 | 하 (분량이 부담일 뿐) | https://library.kei.re.kr/pyxis-api/1/digital-files/72c6ccf0-e078-40ca-aa3f-eec4630c39f1 [T] / https://www.nkis.re.kr/researchReport_view.do?otpId=KEI00049510 [T] |

### 유형성 관점의 워크숍 운영 결론

- **기본값은 1번(포스터) + 2번(목록집) 조합**을 권한다. 둘 다 ◎이고, 데이터가 적어도 성립하며, 인쇄만 하면 끝난다.
- **5번(데이터셋)을 주 산출물로 고르는 팀은 반드시 1·2·3 중 하나를 함께 만들게 한다.** 데이터만으로는 12월 하드 요건(손에 들고 갈 수 있는 것)을 충족하지 못한다.
- **7번(전시 패널)을 고른 팀에게는 "축소본 A4" 제작을 의무화**한다. 전시물은 남지만 팀에게 남지 않는다.
- 인쇄 일정은 성과공유회 **최소 1주 전 마감**으로 잡는다. 대형 출력은 당일 처리가 보장되지 않는다. [미확인 — 운영 판단]

관련 근거: 국내 시민과학 결과물은 논문·보고서·데이터 형태로 공개되고 있으며, 대부분 프로젝트에서 시민 대상 사전교육과 전문가 검증을 통해 데이터가 관리된다 [S] (KEI/한국환경정책학회, 「환경문제 해결을 위한 국내 시민과학 유형과 특성 연구」).

---

## 좋은 성과물의 판단 기준 — 체크리스트

각 항목 뒤에 근거 출처를 붙였다. 워크숍에서는 이 체크리스트를 그대로 인쇄해 팀별 자가진단표로 쓴다.

### A. 과학적 최소요건

- [ ] **관찰 기록에 조사일시·조사자·지역정보 및 좌표·특이사항이 모두 있는가** — 조사 야장의 기본 필수 항목 [S] (국립생물자원관 생물분류 현장전문가 교재 / 환경아카이브풀숲 「생물 모니터링 야장 양식」 [T])
- [ ] **뒷사람이 같은 장소를 다시 찾아갈 수 있을 만큼 채집지가 상세히 적혔는가** — 도로·등산로상 거리 등을 포함해 완벽하게 기록 [S] (동 교재)
- [ ] **경위도가 기록되었는가** — 생물지리정보시스템 구축에 중요 [S] (동 교재)
- [ ] **동정에 자신 없는 종은 "미동정"으로 남겼는가** (억지 동정 금지) [미확인 — 아래 별도 섹션]

### B. 데이터 공개성

- [ ] **데이터와 메타데이터가 공개 가능한 형태인가** — ECSA 10원칙: 프로젝트 데이터·메타데이터는 공개되며 가능하면 오픈액세스로 발표 [S] (ECSA, 10 Principles of Citizen Science [T])
- [ ] **참여한 시민의 이름이 결과물에 들어갔는가** — ECSA 10원칙: 시민과학자는 프로젝트 결과와 출판물에서 인정받는다 [S] (동)
- [ ] **저작권·이용허락 조건을 정했는가** — ECSA 10원칙은 저작권·지식재산·데이터 공유 합의·비밀유지·귀속 등 법적·윤리적 쟁점 고려를 요구 [S] (동)

### C. 성과의 실체성

- [ ] **"실질적인 과학적 산출물"이 있는가** — ECSA 10원칙: 시민과학 프로젝트는 tangible scientific outcomes를 낸다 [S] (동)
- [ ] **성과물이 과학적 산출·데이터 품질·참여자 경험·사회적/정책적 영향의 네 축으로 평가 가능한가** — ECSA 10원칙의 평가 항목 [S] (동)

### D. 전달력

- [ ] **비전문가가 10초 안에 핵심 결론 한 문장을 읽어낼 수 있는가** — Better Poster의 핵심 발상(가장 큰 글씨의 단일 핵심 메시지) [S] (Michigan State University 소개글 [T])
- [ ] **전문용어를 뺐는가 / 결과부터 말했는가** — Message Box 원칙: Know Your Audience, Frame Your Message, Lead With Results, Avoid Jargon [S] (COMPASS Science Communication [T])
- [ ] **그래프에 장식(chartjunk)이 없는가** — Tufte의 data-ink ratio, chartjunk, graphical integrity, small multiples 개념 [S] (Edward Tufte [T])
- [ ] **차트가 정직한가** — 데이터 시각화는 분석적 실천이자 윤리적 실천이며 데이터를 정직하고 명확히 표현해야 한다 [S] (동)

### E. 유형성 (본 워크숍 하드 요건)

- [ ] **12월 당일 손에 들고 갈 수 있는 물체가 최소 1개 있는가** [미확인 — 워크숍 자체 요건]
- [ ] **인쇄 마감일이 캘린더에 박혀 있는가** [미확인 — 운영 판단]

---

## 학술 포스터 제작 표준

### 1) 규격

| 규격 | 실측 | 출처 |
|---|---|---|
| A0 | **841 × 1189 mm** (84.1 × 118.9 cm) | 제목에 "A0사이즈 (84.1X118.9cm)" 명시 [T] (happycampus 템플릿) / "A0 사이즈는 841mm × 1189mm" [S] (jinhakpro) |
| A1 | **594 × 841 mm** | [S] (파란디자인 포스터 사이즈 가이드) |
| A2 | **420 × 594 mm** | [S] (동) |
| A3 | **297 × 420 mm** | [S] (동) |
| 세로 9:16 변형 | **너비 77 cm × 높이 138 cm** | 제목에 "세로 9:16(사이즈는 너비 77cm, 높이 138cm 사이즈로 만들" 명시 [T] (대한마취통증의학회 워크숍 포스터 규격 안내) |
| 70 × 100 cm | 국내 학회 실무에서 흔히 쓰이는 변형 규격 | 제목에 "학회 포스터 발표 준비, 70X100 글자크기 및 출력 팁" [T] |

**중요**: 규격은 학회/행사마다 지정이 다르므로 발표 전 가이드라인을 반드시 확인해야 한다 [S] (jinhakpro).
→ 워크숍 적용: 성과공유회 주최 측의 **거치대(이젤/보드) 실측치를 먼저 확정**한 뒤 규격을 정한다. [미확인 — 운영 판단]

### 2) 폰트 최소 크기

- **A3: 메인 헤드라인 60~80pt / A2: 80~120pt / A1: 120~180pt** [S] (파란디자인)
- **관람 거리가 1 m 늘어날 때마다 글자는 약 2.5 cm씩 커져야 한다** [S] (동) — 성과공유회처럼 2~3 m 뒤에서 보는 환경이면 제목은 최소 5~7.5 cm 높이. 이 규칙이 본 워크숍에서 가장 실용적인 폰트 판단 기준이다.
- **폰트는 2~3개만 사용**: 제목용 볼드 1 + 본문용 1 + (필요시) 강조용 1 [S] (동)
- **가독성 좋은 산세리프 사용** [S] (jinhakpro)

### 3) 면적 배분 — 출처 간 수치가 다름 (그대로 병기)

| 출처 | 텍스트 | 시각자료 | 여백 |
|---|---|---|---|
| 파란디자인 [S] | 20~25% | 40~45% | 30~40% |
| jinhakpro [S] | 40% | 40% | 20% |

→ **두 출처 모두 "시각자료 40% 이상, 여백 20% 이상"에는 일치한다.** 워크숍에서는 이 공통분모만 규칙으로 쓴다.

### 4) 섹션 구성 (전통형)

- **제목 → 초록 → 방법 → 결과 → 결론**의 논리적 구성 [S] (jinhakpro)
- 배치 흐름: **가로형은 좌→우, 세로형은 상→하** [S] (동)
- 문장은 간결하게, 내용은 그림·표·그래프로 [S] (동)
- 이미지 해상도 **300 dpi 이상** [S] (동)
- 심사 기준: 구성의 논리성, 연구의 참신성, 시각적 완성도, 발표 태도 [S] (동)
- 전문가 견해로 소개된 배분: 글자 20~25%, 그림 40~45%, 여백 30~40% [S] (Editage 「완벽한 학술 포스터를 만드는 법」 [T])

### 5) Better Poster (Morrison 방식) — 본 워크숍 권장안

**배경**: Mike Morrison이 2019년 연구 포스터 개선을 다룬 YouTube 애니메이션을 올리고 템플릿을 OSF에 공개했으며, 조회수 100만 회를 넘기고 #betterposter가 확산되었다 [S] (Michigan State University Department of Psychology, "Mike Morrison's Better Poster Design is Viral" [T]). Morrison의 템플릿은 의학부터 기상학까지 여러 분야 학회에서 사용되었다 [S] (동).

**4개 구성요소** [S] (betterposters.blogspot.com 비평글):

1. **중앙의 초대형 핵심 메시지 (take-away message)** — 일반 학술 포스터와의 가장 큰 차이. 평이한 언어로 쓴 단일 결론.
2. **왼쪽 사이드바: 구조화된 초록 (structured abstract)**
3. **오른쪽 사이드바: 세부 내용(fiddly bits)** — 깊이 파고들 사람용
4. **하단 중앙: QR 코드**

**설계 논리**: 전통적 포스터 논리를 뒤집어, 평이한 언어의 단일 핵심 발견을 큰 글씨로 앞세워 관람객이 몇 초 안에 자기와 상관있는지 스스로 판단하게 한다 [S] (동). 포스터 세션의 현실 — 사람들은 걸어다니고, 주의가 분산되어 있고, 시간이 없다 — 을 전제로 설계를 앞단에서 걸러준다 [S] (동).

**본 워크숍에서 Better Poster를 기본값으로 권하는 이유** [미확인 — 설계 판단]:
- 참가자가 일반 시민이라 전통형 5단 구성(초록/방법/결과/고찰)을 채우는 부담이 크다.
- Better Poster는 **"우리가 알아낸 한 문장"만 확정되면 나머지는 채워 넣기**가 된다.
- 성과공유회는 학회 심사가 아니라 시민 대상 공유 자리이므로 10초 전달력이 우선한다.

**템플릿/가이드 출처**
- Morrison Method How-To Guide (UBC 호스팅 PDF): https://med-fom-dcd14.sites.olt.ubc.ca/files/2021/07/Morrison_Method_How_To_Guide.pdf [T]
- UC Davis 도서관 Better & Even Better Scientific Posters — Templates and Instructions: https://guides.library.ucdavis.edu/better-scientific-poster/templates [T]
- s-Ink 'Betterposter' poster template: https://s-ink.org/betterposter-poster-template [T]

**반론도 존재함**: Better Poster 방식에 대한 비판적 논평이 별도로 존재한다 (Data Soapbox "On My Soapbox About the Better Poster" [T], Better Posters 블로그의 Morrison billboard poster 비평 [T]). 워크숍에서는 "정답"이 아니라 "권장 기본값"으로 소개할 것. [미확인 — 반론의 구체적 내용은 본문 미확인]

---

## 데이터 품질 확보 원칙

### 1) 국제 표준 — Darwin Core / GBIF

- **Darwin Core는 TDWG 표준**이며 Dublin Core Metadata Initiative의 대중적 용어들에서 출발한 개념에 기반한다 [S] (GBIF IPT User Manual, "Darwin Core" [T]).
- **GBIF.org를 통해 공유되는 데이터셋의 대다수는 Darwin Core Archive(DwC-A) 포맷으로 발행된다** [S] (동).
- **DwC-A의 구성**: 텍스트(CSV) 파일 묶음 + 파일 구조를 설명하는 기술자 `meta.xml` → 하나의 자기완결적 데이터셋 [S] (Darwin Core Archive [T]).
- **메타데이터 표준은 EML (Ecological Metadata Language)**. GBIF.org의 모든 데이터셋 설명은 EML에 의존하며, **각 DwC-A는 EML 파일을 구성요소로 포함한다** [S] (GBIF IPT User Manual).
- **라이선스 필수**: GBIF는 기계판독 가능한 3가지 라이선스 중 하나(**CC0 1.0 / CC-BY 4.0 / CC-BY-NC 4.0**) 채택을 권장하며, **occurrence 데이터를 포함한 데이터셋이 이 중 하나를 선택하지 못하면 GBIF에 등록할 수 없다** [S] (동).

관련 URL
- https://ipt.gbif.org/manual/en/ipt/latest/darwin-core [T]
- https://ipt.gbif.org/manual/en/ipt/latest/dwca-guide (Darwin Core Archives – How-to Guide) [T]
- https://www.gbif.org/standards (Data standards) [T]

### 2) 커뮤니티 검증 모델 — iNaturalist

- **Research Grade 조건**: 커뮤니티가 종(species) 수준 이하의 동정에 합의할 때 — **동정자의 2/3 초과가 같은 분류군에 동의**하고, 커뮤니티 분류군과 관찰 분류군이 일치할 때. 또는 과(family)~종 사이 수준에서 합의하고 "이 이상은 어렵다"고 투표한 경우 [S].
- **DQA(Data Quality Assessment)**는 완전성, 논리적 일관성, 위치 정확도, 시간 정확도, 주제 정확도 등 지리데이터 품질 기술 표준 원칙 요소를 다룬다 [S].
- **3개 등급으로 분류**: "Needs ID" / "Research Grade" / "Casual" [S].
- **정확도**: iNaturalist는 Research Grade 관찰의 정확도를 **95%**로 추정한다 (블로그 제목에 명시 [T]). 별도 실험에서는 **97%**로 추정한 결과도 있으며, 후보 검증자 887명이 참여해 표본의 96%를 검증했고 관찰 1건당 평균 4명이 검증했다 [S]. → **두 수치는 서로 다른 실험이므로 하나만 인용하지 말 것.**

관련 URL
- https://help.inaturalist.org/en/support/solutions/articles/151000169936-what-is-the-data-quality-assessment-and-how-do-observations-qualify-to-become-research-grade- [T]
- https://www.inaturalist.org/blog/89255-we-estimate-the-accuracy-of-research-grade-observations-to-be-95-correct [T]
- https://www.gbif.org/dataset/50c9509d-22c7-4a22-a47d-8c48425ef4a7 (iNaturalist Research-grade Observations, GBIF 데이터셋 [T])

### 3) 국내 맥락 — 시민 데이터의 특성

- **시민참여 데이터는 전문가 수집 데이터와 성격이 다르며**, 시민 생성 데이터를 효과적으로 활용하려면 그 고유 속성과 전문가 데이터와의 격차를 이해하는 것이 매우 중요하다 [S] (「시민참여 전국자연환경조사 데이터의 특성」, GEO DATA [T]).
- 해당 연구의 데이터는 **식물·육상곤충·조류·양서류·포유류 5개 분류군**의 위치정보로 구성되며 행정경계 정보를 부가했다 [S] (동).
- **시민참여조사는 대개 거주지 인근을 주요 활동지역으로 조사**하며, 매년 같은 지역의 생물종을 관찰함으로써 계절·시간 제약을 덜 받고 전문 조사원이 파악하기 어려운 정보를 얻을 수 있다 [S].
- 국내 시민과학 프로젝트 대부분은 **시민 대상 사전교육 + 전문가 검증**으로 데이터를 관리한다 [S] (KEI 「환경문제 해결을 위한 국내 시민과학 유형과 특성 연구」).
- **해안쓰레기 모니터링의 역할분담 모델**: 해양환경공단이 조사방법론 개발·지도자 교육·데이터 질관리·종합분석을, 지역 민간단체가 현장조사·자원봉사자 교육을 담당 [S]. → 시민과학 품질관리의 국내 표준적 분업 구조로 워크숍에서 소개 가능.

### 4) 워크숍용 메타데이터 필수 항목 (최소 세트)

아래는 야장 필수항목(국내) + Darwin Core/EML의 발상(국제)을 워크숍 수준으로 축약한 것. **항목 목록의 구성 자체는 [미확인] 설계이며, 각 항목의 근거는 표시했다.**

**관찰 1건당(행 단위)**

| 항목 | 예시 | 근거 |
|---|---|---|
| 조사일시 (연-월-일, 가능하면 시각) | 2026-11-08 09:30 | 야장 필수 [S] |
| 조사자(관찰자) 이름 | 홍길동 | 야장 필수 [S] |
| 지역 정보 (행정구역명) | 제주 서귀포시 ○○동 | 야장 필수 / 채집지 정보 [S] |
| 좌표 (위도, 경도) | 33.2xxxx, 126.5xxxx | 야장 필수, "경위도는 생물지리정보시스템 구축에 중요" [S] |
| 상세 지점 서술 | ○○탐방로 입구에서 300 m 지점 | "후일 같은 장소에서 다른 사람이 채집할 수 있도록 완벽하게 기록" [S] |
| 종명 (국명 / 가능하면 학명) | 직박구리 / Hypsipetes amaurotis | 로드킬 시스템의 주요 항목에 '동물의 종명' 포함 [S] |
| 개체수 또는 확인 방식 | 3개체 / 사체 / 울음소리 | [미확인 — 설계] |
| 사진 파일명 | IMG_0412.jpg | 로드킬 시스템 주요 항목에 '사진' 포함 [S] |
| 동정 확신도 | 확실 / 보통 / 미동정 | [미확인 — iNaturalist DQA 3등급 구조에서 착안한 설계] |
| 특이사항 | 강풍, 공사중 | 야장 필수 [S] |

**데이터셋 전체(1장짜리 데이터 설명서)**

| 항목 | 근거 |
|---|---|
| 데이터셋 제목 / 조사 목적 | EML 메타데이터의 발상 [S] |
| 조사 기간 (시작~종료) | [미확인 — 설계] |
| 조사 지역 범위 | [미확인 — 설계] |
| 참여자 전원 명단 | ECSA 10원칙: 시민과학자는 결과·출판물에서 인정받는다 [S] |
| 조사 방법 요약 (몇 명이, 몇 회, 어떤 방식으로) | [미확인 — 설계] |
| 알려진 한계 (놓쳤을 가능성, 편향) | 시민 데이터와 전문가 데이터의 격차 이해 필요 [S] |
| 이용허락 조건 (CC0 / CC-BY / CC-BY-NC) | GBIF 라이선스 3종 [S] |
| 연락처 | [미확인 — 설계] |

---

## 국내 시민과학 사례 (6건 이상)

### 1. K-BON — 시민참여 한국 생물다양성 관측 네트워크

- **산출물 형태**: 관측 기록 데이터베이스 + 합동조사 보고 + 정책 기초자료
- 2011년 설립·운영 [S]. GEO(Group on Earth Observation) 산하 GEOBON의 국가 단위 체계 [S].
- **기후변화 생물지표종 100종**을 포함해 전국 시민·과학자가 참여하는 모니터링 [S]. "국내 최대 시민과학 네트워크"로 소개됨 [S].
- 시민과학자의 모니터링 기록은 **기후변화에 따른 생물다양성 변화 예측과 보전·관리 정책 수립의 기초자료로 활용**된다 [S].
- 참여 경로: **네이처링 앱/웹** [S].
- 중·고등학생 및 대학생 시민과학자로 구성된 **K-BON JUNIOR** 운영 [T].
- **주의**: 스니펫에 따라 운영 주체가 "국립생물자원관"과 "국립생태원"으로 엇갈린다. 인용 전 확인 필요. [미확인]
- URL: https://species.nibr.go.kr/home/mainHome.do?contCd=002002004002 [T] / https://species.nibr.go.kr/nibr/assets/K-BON_lF.pdf [T] / https://www.naturing.net/p/1 [T] / https://www.naturing.net/p/3 (K-BON JUNIOR) [T]

### 2. 야생조류 유리창 충돌 조사 (국립생태원 + 네이처링)

- **산출물 형태**: ① 시민참여 조사 **지침서(인쇄 책자)** ② 네이처링 미션 누적 데이터 ③ 정책·언론 보도 ④ '5×10 규칙' 같은 **행동 지침**
- 국립생태원이 **「야생조류 유리창 충돌 시민 참여 조사 지침서」를 2021년 5월 31일 발간** [S]. 지침서에는 시민이 직접 조사하는 방법, 결과 기록 방법, 충돌 원인 설명이 담김 [S].
- 시민 데이터 축적은 **2018년 7월 시작** [S].
- 네이처링 미션 「야생조류 유리창 충돌 조사」 **참여자 5,594명, 관찰기록 62,477건** [S]. 2018.7~2022.7 누적 통계를 국립생태원 김영준 동물관리연구실장이 분석 [S].
- 2018년 10월 환경부·국립생태원 보고서 추정: 투명 방음벽 **연 197,732마리**, 건물 유리창 **연 7,649,030마리** [S].
- 성과물의 도달점 예시: **「새 충돌 줄이려면 '5×10 규칙' 기억하라」** — 시민 데이터가 기억 가능한 규칙으로 번역된 사례 [T].
- **워크숍 활용 지점**: "관찰 기록 → 지침서 → 규칙 한 줄"이라는 성과물 승격 경로의 국내 최고 사례.
- URL: https://www.naturing.net/m/2137/summary [T] / https://www.edaily.co.kr/news/read?newsId=02922486629054496&mediaCodeNo=257 [T] / http://www.me.go.kr/home/web/board/read.do?boardMasterId=1&boardId=1455610&menuId=286 [T] / https://www.sisain.co.kr/news/articleView.html?idxno=44734 [T]

### 3. 로드킬 시민참여 조사 — 굿로드(Good Road)

- **산출물 형태**: 신고 앱 + 공공데이터 개방 파일 + 사고다발구간 지도 + 시민 캠페인용 리플렛·스티커
- 녹색연합이 **2017년 '소셜이노베이션캠프 36'** 프로젝트에서 굿로드 앱 개발·보급, 이후 **국립생태원과 함께 로드킬통합관리시스템** 제작 [S].
- 위치정보 기반으로 사고를 촬영·신고하면 사진과 위치가 온라인정보시스템으로 전송되어 데이터가 축적되는 방식 [S].
- 수집 항목: **동물의 종명, 접수일시, 도로유형, 도로명, 위치정보, 사진** [S].
- 활용: 도로별 발생현황 분석, 주요 사고지점 파악, 생물 이동통로 설치 계획 등 [S]. 위치정보 데이터를 분석해 **사고 다발 상위 50개 구간을 선정**하고 구간별 저감시설 설치 및 누리집 지도 제공 [S].
- **워크숍 활용 지점**: 최소 컬럼 6개만으로도 정책 산출물이 나온다는 증거. 3번 유형(분포 지도)의 국내 모델.
- URL: https://www.data.go.kr/data/15105476/fileData.do?recommendDataYn=Y (로드킬 신고 현황 [T]) / https://www.data.go.kr/data/15100280/fileData.do?recommendDataYn=Y (동물 찻길 사고 현황 자료 [T]) / http://www.greenkorea.org/activity/wild-animals/roadkill/61241/ [T]

### 4. 국가 해안쓰레기 모니터링

- **산출물 형태**: 정기 모니터링 데이터 + 공공데이터 개방 API + 정책 수립용 종합분석 보고
- 해양수산부 예산 지원, **해양환경공단 주관**의 해안쓰레기 기초조사 프로그램 [S].
- 조사 규모 확대: **2008~2014년 20개 지역 → 2014~2020년 40개 → 2021~2023년 60개 지역**, **2개월에 1회** 정기 조사 [S].
- 역할분담: 해양환경공단(방법론 개발·지도자 교육·데이터 질관리·종합분석) / 지역 민간단체(현장조사·자원봉사자 교육) [S].
- 결과는 해양폐기물 예방·관리 정책 수립을 위한 과학적·객관적 자료로 산출 [S].
- KEI 연구에서 **국가 해안쓰레기 모니터링과 시민참여 생물다양성 관측 네트워크가 3가지 측면에서 매우 높은 평가**를 받았다고 언급됨 [S] — 단, "3가지 측면"이 무엇인지는 스니펫에 없음 [미확인].
- URL: https://meis.go.kr/mli/monitoringInfo/intro.do [T] / https://www.data.go.kr/data/15114321/openapi.do?recommendDataYn=Y [T]

### 5. 바이오블리츠 서울 (서울 생물다양성 탐사)

- **산출물 형태**: **생물종 목록** + 네이처링 기반 생태지도 + 현장 체험 프로그램
- 분류군별 생물 전문가와 시민이 각 분야 생물상을 조사해 **서식 중인 생물종 목록을 작성**하고 탐사지의 생물다양성과 생태를 읽고 해석한다 [S].
- 분류군별 팀을 이룬 참가자가 전문가와 함께 발견 생물종을 기록하고, **네이처링 모바일앱/웹사이트로 생태지도를 만든다** [S].
- **워크숍 활용 지점**: 2번(종 목록집)과 3번(분포 지도)이 한 활동에서 동시에 나오는 구조. 1~2인 팀에게 가장 복제하기 쉬운 모델.
- URL: https://parks.seoul.go.kr/bioblitzseoul/bioblitzMain.jsp [T] / https://www.naturing.net/m/6132 (2023 바이오블리츠 서울 [T]) / https://www.naturing.net/p/2/entry (생물다양성 탐사(바이오블리츠) [T])

### 6. 겨울철 조류 동시센서스 (환경부·국립생물자원관)

- **산출물 형태**: 연도별 **조사 보고서** + 공공데이터포털 개방 파일 + 보도자료
- **1999년부터 전국 주요 습지를 대상으로 지속 실시** [S].
- 연도별 결과가 공공데이터포털에 파일데이터로 등재 [T].
- 결과 발표 사례: **「조류 동시 총조사…겨울철새 136만 마리 확인」** [T] — 한 문장 헤드라인으로 번역된 성과물의 전형.
- **워크숍 활용 지점**: "같은 날, 여러 팀이 동시에 조사한다"는 동시센서스 설계는 성과공유회에서 여러 팀 데이터를 합치기에 적합. 8번 유형(결과 보고서)의 국내 표준 형식.
- URL: https://www.data.go.kr/data/15086762/fileData.do [T] / https://www.data.go.kr/data/15086761/fileData.do [T] / https://scienceon.kisti.re.kr/srch/selectPORSrchReport.do?cn=TRKO201500012776&dbt=TRKO [T] / https://www.waterjournal.co.kr/news/articleView.html?idxno=72674 [T]

### 7. 네이처링 (플랫폼) — 시민과학 미션 인프라

- **산출물 형태**: 관찰기록 + 실시간 생태지도 + 통계 + 미션별 요약 페이지
- 자연을 관찰·기록·검색하는 도구이자 다양한 자연활동 경험을 공유하는 열린 네트워크 [S]. 영어권 시민 생물 모니터링 커뮤니티 **iNaturalist를 모델로** 함 [S].
- 지역 조류 관찰, 동네 생태지도 만들기, 지역 생물다양성 조사, 기후변화에 따른 개화시기 변화 기록, 야생동물 로드킬 피해 조사, 멸종위기종 분포 연구 등 **다양한 미션 운영** [S].
- **누구나 특정 주제의 미션을 제안**하고 타인의 미션에 참여할 수 있으며, 집합적 기록으로 만들어지는 생태지도와 통계의 실시간 공유로 풍부해진다 [S].
- 미션 활동은 종 서식 확인과 **목록 작성**, 서식지 보전, **정책 제안**, 생물다양성·생태계 보전 교육, **시민과학을 통한 연구논문 발표**로 이어질 수 있다 [S].
- **워크숍 활용 지점**: 1~2인 팀이 자기 미션을 개설해 12월까지 데이터를 모으는 가장 현실적인 경로.
- URL: https://www.naturing.net/info/about [T] / https://www.naturing.net/info/howtouse [T] / https://www.naturing.net/m/4691/summary [T] / https://s3-ap-northeast-1.amazonaws.com/naturing-s3-tokyo/public/%EB%84%A4%EC%9D%B4%EC%B2%98%EB%A7%81_%EA%B0%80%EC%9D%B4%EB%93%9C.pdf (네이처링 가이드 [T])

### 8. 반려해변 (해양환경공단)

- **산출물 형태**: 정화활동 실적 + 인식제고 캠페인 + 지역별 성과 집계
- 기업·단체·학교 등이 특정 해변을 자발적으로 입양해 정화활동과 인식제고 캠페인을 수행하는 국민 참여형 프로그램 [S].
- **2020년 제주도 시범사업으로 시작**, 전국 100개가 넘는 해변으로 확대 [S].
- 지역 성과 예: 충남 범도민 연안정화활동 **28회, 1,600여 명 참여**; 국제 연안정화의 날 계기 **23차례 집중 정화활동, 1,200여 명 동참** [S]. 인천은 **7개 해변에 12개 단체** 참여 [S].
- **워크숍 활용 지점**: "횟수 × 참여인원"이라는 가장 단순한 성과 지표 세트. 생물 데이터가 부족한 팀도 이 지표로 성과물을 구성할 수 있다.
- URL: https://www.meis.go.kr/mli/rjct/info.do [T] / https://team.caresea.kr/ [T]

### 9. 곶자왈 (제주) — 데이터가 개발을 막은 사례

- **산출물 형태**: 사전 축적·공개된 **식생분포 데이터**
- 제주 곶자왈의 경우 **다양한 식생분포 데이터를 사전에 축적·공개해 개발을 막아낸 사례**가 있다 [S].
- **워크숍 활용 지점**: 6번 유형(정책 제안서)의 국내 근거. "데이터를 미리 쌓아두면 나중에 무기가 된다"는 동기부여 사례.
- **주의**: 스니펫 1건에만 근거함. 상세 경위와 주체는 확인되지 않음. [미확인]
- URL: https://www.gaidas-geodata.org/journal/view.php?viewtype=pubreader&number=103 (관련 논문 페이지 [T]) — 곶자왈 언급 자체는 검색 요약에서 나옴

### 10. KBIF — 한국 생물다양성 정보 공유 (GBIF 노드)

- **산출물 형태**: 국가 단위 생물다양성 데이터 공유 체계 + API
- 한국은 **2008년부터 GBIF에 참여**하고 있으며, KBIF가 국내 생물다양성 정보를 GBIF에 제공 [S].
- KBIF는 1단계 3개 기관에서 2단계 산·학·연 14개 기관으로 확대되어 국내 데이터 **115만 건** 공유 [S]. **2023년 기준 61개 기관 참여, 약 660만 건** 등록·공유 [S].
- 국립생물자원관은 국가생물다양성 정보공유체계(CBD-CHM KOREA)를 운영 [S].
- **워크숍 활용 지점**: 5번 유형(데이터셋)을 고른 팀에게 "당신의 데이터가 실제로 올라갈 수 있는 곳"을 보여주는 종착지.
- URL: https://www.naris.go.kr/intd/kbif/selectGbifIntdAndStrct.do [T] / https://www.kbr.go.kr/ [T] / http://www.cbd-chm.go.kr/home/bio/bio06004i.do [T] / https://www.naturing.net/p/9/missions (GBIF 시민참여 자연사정보 기록 미션 [T])

---

## 3분 발표 구조 템플릿

### 근거

- **엘리베이터 피치**는 어떤 상품·서비스·기업과 그 가치에 대한 빠르고 간단한 요약 설명이며, 이름은 엘리베이터에서 중요한 사람을 만났을 때 **20초에서 3분**이라는 짧은 시간에 생각을 요약해 전달할 수 있어야 한다는 의미에서 왔다 [S] (위키백과 「엘리베이터 피치」 [T]).
- 엘리베이터 피치는 **6단계로 구성**해볼 수 있으며, 짧기 때문에 처음부터 구조를 잘 짜는 것이 중요하다 [S] (Asana).
- **오프닝**은 청중의 관심을 사로잡을 기회다. 호기심을 자극하는 문구 — 생각하게 하는 질문, 놀라운 통계, 통념에 도전하는 대담한 발언 — 으로 시작한다 [S] (Asana).
- 긴장하면 말이 빨라지므로 **또박또박 천천히** 말한다 [S] (Asana).
- **Message Box** 원칙: Know Your Audience / Frame Your Message / **Lead With Results** / Avoid Jargon [S] (COMPASS Science Communication [T]). 인터뷰 준비와 **발표 계획**에 쓸 수 있다 [S].
- **두괄식**: 시간이 없는 의사결정권자를 위해 결론부터 말한다 [S]. 주장보다 객관적 팩트 중심으로, 핵심 데이터를 명기해 신뢰감을 높인다 [S] (Executive Summary 작성법).

### 템플릿 (총 3분 = 180초)

구간 배분은 위 원칙들을 조합한 **설계안**이며 특정 출처에 명시된 배분이 아니다. [미확인 — 설계]

| 구간 | 시간 | 말할 것 | 슬라이드/포스터 대응 | 근거 |
|---|---|---|---|---|
| **① 훅** | 0:00–0:20 (20초) | 놀라운 숫자 하나, 또는 통념을 깨는 한 문장. "이 동네에 ○○이 △종 있다고 생각하세요?" | 포스터 중앙 대형 메시지 | 오프닝은 놀라운 통계·통념 도전 [S] |
| **② 결론 선언** | 0:20–0:45 (25초) | **우리가 알아낸 것 한 문장.** 여기서 이미 결론이 다 나와야 한다. | Better Poster의 take-away message | Lead With Results [S] / 두괄식 [S] |
| **③ 누가·어디서·얼마나** | 0:45–1:15 (30초) | 몇 명이, 어디를, 몇 회, 언제부터 언제까지 조사했는가. 숫자로만. | 방법 섹션 / 데이터 설명서 | 팩트 중심·핵심 데이터 명기 [S] |
| **④ 근거 하나** | 1:15–2:00 (45초) | **그래프 또는 지도 딱 하나**를 짚으며 설명. 두 개 이상 쓰지 않는다. | 결과 그래프 1점 | chartjunk 배제·data-ink [S] |
| **⑤ 그래서 뭐** | 2:00–2:30 (30초) | 이 결과가 우리 동네에/정책에/다음 조사에 뜻하는 것. | 결론 섹션 / policy brief 요구사항 | 문제정의–솔루션–가치–결론 구조 [S] |
| **⑥ 요청과 연결** | 2:30–3:00 (30초) | 필요한 것(같이 할 사람, 데이터 제공처, 예산) + 이름·연락처·QR. | 하단 중앙 QR 코드 | Morrison 4구성요소의 QR [S] |

### 리허설 규칙 (설계 — [미확인])

- ②번 한 문장을 **원고 없이** 말할 수 있을 때까지 반복. 나머지는 다 흔들려도 된다.
- 전문용어가 나오면 즉시 일상어로 교체 (Avoid Jargon [S]).
- 실제로 타이머를 켜고 2회 이상 소리 내어 연습. 긴장 시 속도가 빨라지므로 의도적으로 늦춘다 [S].
- 1~2인 팀이므로 ①②는 A, ③④는 B, ⑤⑥은 함께 — 식으로 분담 가능.

---

## 미확인 / 추정

아래는 **검색 결과로 확증되지 않은 항목**이다. 워크숍 배포 자료에 넣기 전 반드시 원문 확인 또는 삭제할 것.

### 설계 판단 (출처 없음, 워크숍 운영자의 결정 사항)

1. **8대 유형 분류 자체** — 국제/국내 어느 공식 분류체계에서 가져온 것이 아니라, 12월 유형성 요건을 기준으로 본 문서가 구성한 것이다. KEI 연구는 국내 시민과학 결과물을 "논문·보고서·데이터" 세 갈래로만 언급했다 [S].
2. **유형성 ◎/○/△ 판정** — 전적으로 운영 판단.
3. **"기본값은 포스터 + 목록집" 권장** — 근거 없음. 참가자 특성에 대한 추정.
4. **인쇄 마감 1주 전** — 근거 없음. 일반적 실무 감각.
5. **3분 발표 구간별 초 배분(20/25/30/45/30/30)** — 어떤 출처도 이 배분을 제시하지 않았다. 엘리베이터 피치가 "20초~3분"이고 "6단계"라는 것만 [S].
6. **메타데이터 최소 세트의 항목 구성과 "동정 확신도" 항목** — Darwin Core/EML/야장 필수항목에서 착안했으나, 이 조합 자체는 어떤 표준에도 없다.
7. **"동정에 자신 없으면 미동정으로 남긴다"는 체크리스트 항목** — iNaturalist의 Needs ID 등급 구조에서 착안한 설계이며 직접 인용은 아니다.

### 출처 간 충돌 (둘 다 병기했으며 워크숍에서 단정하지 말 것)

8. **포스터 면적 배분** — 파란디자인은 텍스트 20~25% / 그림 40~45% / 여백 30~40%, jinhakpro는 40/40/20. 두 수치가 양립하지 않는다.
9. **iNaturalist Research Grade 정확도** — 제목에는 95% [T], 다른 실험 스니펫에는 97% [S]. 서로 다른 실험이므로 "95%"만 쓰거나 둘 다 출처를 밝혀 쓸 것.
10. **K-BON 운영 주체** — 검색 스니펫에서 "국립생물자원관"과 "국립생태원"이 엇갈린다. K-BON 페이지가 species.nibr.go.kr(국립생물자원관 도메인)에 있는 점은 확인되나 [T], 운영 주체 단정은 보류.

### 근거가 얇은 사실 (1개 스니펫에만 등장)

11. **제주 곶자왈 식생분포 데이터로 개발 저지** — 검색 요약 1회 언급. 사업명·연도·주체 미확인.
12. **KEI 연구에서 해안쓰레기 모니터링과 K-BON이 "3가지 측면에서 매우 높은 평가"** — 그 3가지가 무엇인지 미확인.
13. **KEI 연구가 "국내 환경분야 시민과학 사례 18개"를 분석** — 스니펫 1회 [S]. 18이라는 숫자는 원문 확인 권장.
14. **네이처링 유리창 충돌 미션 참여자 5,594명 / 관찰기록 62,477건** — 스니펫 시점 기준 수치이며 현재 값은 다를 것. 발표 시 조회일자를 병기할 것.
15. **KBIF 2023년 61개 기관 / 약 660만 건** — 스니펫 1회. 연도 표기 확인 필요.
16. **Better Poster에 대한 반론의 구체적 내용** — 비판 글의 제목만 확인했고 논지는 미확인.
17. **ECSA 10원칙의 "한국어판 존재"** — 스니펫에 "26개 언어로 제공"과 "한국어 포함"이 언급되었으나, 한국어판 URL은 확인하지 못함.
18. **국립생태원 유리창 충돌 지침서의 정확한 서지사항(총 쪽수, ISBN)** — 미확인. 발간일 2021.5.31만 [S].

---

## 출처 목록

### A. 시민과학 성과물 유형 · 국내 연구

| # | 제목 | 발행기관 | 연도 | 핵심 3줄 | 워크숍 활용 지점 | URL | 등급 |
|---|---|---|---|---|---|---|---|
| A1 | 환경문제 해결을 위한 국내 시민과학 유형과 특성 연구 | 한국환경연구원(KEI) / 한국환경정책학회 『환경정책』 | 미확인(스니펫에 연도 없음) | 국내 환경분야 시민과학 사례 18개를 선정해 참여 유형·특성·결과·성과를 종합 분석. 결과물은 논문·보고서·데이터로 공개되며 사전교육+전문가 검증으로 관리됨. 단순 기여형보다 협력형/혼합형 비중이 높음. | 성과물 유형 분류의 국내 유일한 실증 근거. 워크숍 도입부 프레임. | https://library.kei.re.kr/pyxis-api/1/digital-files/72c6ccf0-e078-40ca-aa3f-eec4630c39f1 / https://jepa.or.kr/xml/27467/27467.pdf / https://www.dbpia.co.kr/Journal/articleDetail?nodeId=NODE10510903 | [T] 제목 / [S] 내용 |
| A2 | 시민과학의 자연환경조사 적용방안 조사 (연구책임 김윤정) | 한국환경정책·평가연구원 (발행: 한국환경연구원) | 2016 | 국내 자연환경조사의 시민참여 증진을 위한 시민과학 활성화 방안 도출. 국외 우수사례의 발전요인 분석. 적용 유형 도입방안과 정책지원방안 제안. 65쪽, ISBN 979-11-5980-052-8. | 시민 조사 설계의 국내 정책 근거. | https://www.nkis.re.kr/researchReport_view.do?otpId=KEI00049510 / https://scienceon.kisti.re.kr/srch/selectPORSrchReport.do?cn=TRKO201800014441 | [T] 제목 / [S] 서지 |
| A3 | 시민참여 전국자연환경조사 데이터의 특성 (강다인·박규령·Choi Seung Se·이태우) | GEO DATA 5(4) 321-329 | 2023 | 시민참여 데이터는 전문가 데이터와 성격이 다르며 그 격차 이해가 매우 중요. 식물·육상곤충·조류·양서류·포유류 5개 분류군 위치정보. DOI 10.22761/GD.2023.0038. | 데이터 품질 절의 국내 핵심 근거. "시민 데이터는 다르다"를 방어적으로 설명. | https://www.geodata.kr/upload/pdf/GD-2023-0038.pdf / https://www.gaidas-geodata.org/journal/view.php?viewtype=pubreader&number=103 | [T] 제목 / [S] 서지 |
| A4 | 한국 시민과학의 현황과 과제 | KCI 등재 논문 | 미확인 | 시민 자원자의 데이터 수집으로 비용 효율적 과학연구 수행. 참여 시민의 과학지식 증대와 대중의 과학 이해 제고. 지역 주도 프로젝트가 지역 환경문제 인식 제고에 기여. | 워크숍 개회 시 "왜 시민과학인가" 근거. | https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002371394 / https://scienceon.kisti.re.kr/srch/selectPORSrchArticle.do?cn=JAKO201836256831400 | [T] 제목 / [S] 내용 |
| A5 | 10 Principles of Citizen Science | European Citizen Science Association (ECSA) | 2015 발표 | 시민과학 프로젝트는 tangible scientific outcomes를 낸다. 데이터·메타데이터는 공개되고 가능하면 오픈액세스로 발표. 시민과학자는 결과·출판물에서 인정받으며, 프로젝트는 과학적 산출·데이터 품질·참여자 경험·사회정책적 영향으로 평가된다. 26개 언어 제공. | "좋은 성과물의 판단 기준" 체크리스트의 국제 근거 축. | https://www.ecsa.ngo/10-principles/ / https://www.ecsa.ngo/2016/05/17/10-principles-of-citizen-science/ / https://zenodo.org/records/5127534 | [T] 제목 / [S] 내용 |
| A6 | Mechanisms for enhancing public engagement with citizen science results (MacLeod) | People and Nature (Wiley) | 2021 | 시민과학 결과를 대중에게 전달하는 기제를 다룸. | 성과 공유 방식 설계의 국제 문헌 근거. (본문 미확인) | https://besjournals.onlinelibrary.wiley.com/doi/full/10.1002/pan3.10152 | [T] 제목만 |
| A7 | Trends and gaps in the use of citizen science derived data as input for species distribution models | PLOS One | 2020 | 207편의 동료심사 논문 검토. 시민과학 기반 종분포모델 논문이 전체 SDM 논문의 약 2배 속도로 증가. 서유럽·북미 73%, 조류 49%·포유류 19.3%. 비표준화 프로토콜이 신뢰성과 품질에 영향. | 3번 유형(분포 지도)의 국제 근거. 데이터 편향 설명 자료. | https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0234587 | [T] 제목 / [S] 수치 |
| A8 | Field Guide to Citizen Science (서평) | Science Connected Magazine / SciStarter | 2020 | 프로젝트를 '분야'가 아니라 '세팅'으로 나눠 배열. 각 항목에 설명·위치·웹사이트·목표·과제·성과 수록. | 4번 유형(시민 도감) 구성 참고. | https://magazine.scienceconnected.org/2020/01/book-review-field-guide-to-citizen-science/ / https://blog.scistarter.org/2020/01/the-field-guide-to-citizen-science-how-you-can-contribute-to-scientific-research-and-make-a-difference/ | [T] 제목 / [S] 내용 |

### B. 학술 포스터 제작 표준

| # | 제목 | 발행기관 | 연도 | 핵심 3줄 | 워크숍 활용 지점 | URL | 등급 |
|---|---|---|---|---|---|---|---|
| B1 | 포스터 규격 안내 (세로 9:16, 너비 77cm × 높이 138cm) | 대한마취통증의학회 워크숍 | 2024 | 포스터는 1장짜리 PPT로 제작. 세로 9:16 비율. 너비 77cm, 높이 138cm. | 실제 학회가 규격을 어떻게 고지하는지의 국내 실물 예시. | https://www.karm.or.kr/workshop/202401/file/poster_240320.pdf | [T] (제목에 수치 전부 포함) |
| B2 | A0사이즈 (84.1X118.9cm) 학회 논문 포스터 ppt 템플릿 (나눔고딕, 나눔고딕엑스트라볼드) | happycampus | 미확인 | A0 = 84.1 × 118.9 cm. 나눔고딕 계열 사용 템플릿. | A0 실측치 근거 + 한글 폰트 선택 참고. | https://www.happycampus.com/ppt-doc/26629740/ | [T] |
| B3 | 포스터 사이즈 가이드 — 용도별 최적 규격과 인쇄 팁 | 파란디자인 | 미확인 | A1 594×841mm, A2 420×594mm, A3 297×420mm. 헤드라인 A3 60~80pt / A2 80~120pt / A1 120~180pt. 관람거리 1m 증가마다 글자 약 2.5cm 증가. 글자 20~25%·그림 40~45%·여백 30~40%. 폰트 2~3개. | **폰트 최소 크기 절의 주 출처.** 2.5cm/1m 규칙이 워크숍 핵심 도구. | https://parancompany.co.kr/blog/poster-size-guide | [T] 제목 / [S] 수치 |
| B4 | 학회 포스터 발표 어떻게 할까? 디자인·제작 템플릿 양식, FAQ, 체크리스트 완벽 정리 | 진학프로 | 미확인 | A0 841×1189mm 권장, 학회별 지정 확인 필수. 텍스트 40%·시각 40%·여백 20%, 산세리프, 300dpi 이상. 가로형 좌→우, 세로형 상→하. 제목·초록·방법·결과·결론 구성. 심사: 논리성·참신성·시각적 완성도·발표 태도. | 전통형 섹션 구성과 심사 기준의 근거. | https://www.jinhakpro.com/insight/181 | [T] 제목 / [S] 수치 |
| B5 | 완벽한 학술 포스터를 만드는 법 | Editage Insights (에디티지 코리아) | 미확인 | 전문가 견해로 글자 20~25%, 그림 40~45%, 여백 30~40% 배분을 제시. | 면적 배분의 2차 근거. | https://www.editage.co.kr/insights/how-to-create-the-perfect-poster | [T] 제목 / [S] 내용 |
| B6 | 학회 포스터 발표 준비, 70X100 글자크기 및 출력 팁 | 어른이 성장일기 (개인 블로그) | 미확인 | 70×100cm 규격에서의 글자 크기와 출력 팁. | 국내에서 통용되는 비표준 규격(70×100)의 존재 확인. | https://eoreuni.com/817 | [T] 제목 |
| B7 | Mike Morrison's Better Poster Design is Viral | Michigan State University, Department of Psychology | 2019 | 2019년 유튜브 애니메이션 공개 후 조회수 100만 회 돌파, #betterposter 확산. 템플릿을 OSF에 공개. 의학~기상학까지 여러 분야 학회에서 사용됨. Morrison은 조직심리학자. | Better Poster 도입 설명의 1차 근거. | https://psychology.msu.edu/news-events/news/archives/2019/mikemorrison-betterposter.html | [T] 제목 / [S] 내용 |
| B8 | The Morrison Method: A How-To Guide | UBC (호스팅 PDF) | 2021 게시 | Morrison 방식의 단계별 제작 안내. | 워크숍 실습용 배포 자료 후보. (본문 미확인) | https://med-fom-dcd14.sites.olt.ubc.ca/files/2021/07/Morrison_Method_How_To_Guide.pdf | [T] 제목 |
| B9 | Templates and Instructions — Better & Even Better Scientific Posters | UC Davis Library Research Guides | 미확인 | Better Poster 템플릿과 사용법을 도서관 가이드로 정리. | 템플릿 원본 확보 경로. | https://guides.library.ucdavis.edu/better-scientific-poster/templates | [T] 제목 |
| B10 | 'Betterposter' poster template | s-Ink | 미확인 | Better Poster 템플릿 배포. | 대체 템플릿 경로. | https://s-ink.org/betterposter-poster-template | [T] 제목 |
| B11 | Critique: The Morrison billboard poster | Better Posters (blog) | 2019-04 | Morrison 방식 4구성요소 정리: 중앙 초대형 take-away, 좌측 structured abstract, 우측 fiddly bits, 하단 중앙 QR. 동시에 비판적 검토. | **4구성요소의 유일한 출처.** 반론 존재 근거. | http://betterposters.blogspot.com/2019/04/critique-morrison-billboard-poster.html | [T] 제목 / [S] 구성요소 |
| B12 | What is the optimal design for a scientific poster? Insights from #BetterPoster | The Publication Plan | 2020-08-25 | 포스터 세션의 현실(이동 중·주의분산·시간부족)을 전제로 평이한 언어의 단일 핵심 발견을 큰 글씨로 앞세워 관람객이 몇 초 안에 자기 관련성을 판단하게 함. | Better Poster의 설계 논리 근거. | https://thepublicationplan.com/2020/08/25/what-is-the-optimal-design-for-a-scientific-poster-insights-from-the-founder-of-the-betterposter-movement/ | [T] 제목 / [S] 논리 |
| B13 | On My Soapbox About the Better Poster | Data Soapbox | 미확인 | Better Poster 방식에 대한 비판적 논평. | 균형 잡힌 소개를 위한 반론 출처. (본문 미확인) | https://datasoapbox.com/the-better-poster/ | [T] 제목만 |
| B14 | 포스터 세션 발표 안내 | 한국BIM학회(KIBSE) | 2015 | 국내 학회의 포스터 세션 운영 안내 문서. | 성과공유회 포스터 세션 운영 규칙 설계 참고. (본문 미확인) | https://www.kibse.or.kr/media/22/fixture/data/bbs/Kibse_AttachFile_20151016092611.pdf | [T] 제목만 |
| B15 | 구두/포스터논문 발표방법 (ICROS 2025) | 제어로봇시스템학회 | 2025 | 국내 학술대회의 구두·포스터 발표 방법 규정. | 발표 시간·형식 규정 참고. (본문 미확인) | https://2025.icros.org/?page_id=299 | [T] 제목만 |

### C. 데이터 품질 · 표준

| # | 제목 | 발행기관 | 연도 | 핵심 3줄 | 워크숍 활용 지점 | URL | 등급 |
|---|---|---|---|---|---|---|---|
| C1 | Darwin Core (GBIF IPT User Manual) | GBIF | 최신판 | Darwin Core는 TDWG 표준이며 Dublin Core의 대중적 용어 개념에 기반. GBIF.org 공유 데이터셋 대다수가 DwC-A 포맷. 모든 데이터셋 설명은 EML 표준에 의존하며 각 DwC-A에 EML 파일 포함. 라이선스는 CC0 1.0 / CC-BY 4.0 / CC-BY-NC 4.0 중 택1(occurrence 데이터는 미선택 시 등록 불가). | **메타데이터 필수항목 절의 국제 표준 축.** | https://ipt.gbif.org/manual/en/ipt/latest/darwin-core | [T] 제목 / [S] 내용 |
| C2 | Darwin Core Archives – How-to Guide | GBIF | 최신판 | DwC-A 제작 절차 안내. | 5번 유형(데이터셋) 실습 참고. (본문 미확인) | https://ipt.gbif.org/manual/en/ipt/latest/dwca-guide | [T] 제목 |
| C3 | Darwin Core Archive | Wikipedia | 미확인 | DwC-A는 생물다양성정보학 데이터 표준. CSV 텍스트 파일 묶음 + meta.xml 기술자로 자기완결적 단일 데이터셋 구성. | 참가자에게 "CSV + 설명파일"로 쉽게 설명하는 근거. | https://en.wikipedia.org/wiki/Darwin_Core_Archive | [T] 제목 / [S] 내용 |
| C4 | Data standards | GBIF | 미확인 | GBIF의 데이터 표준 개요 페이지. | 표준 원문 진입점. | https://www.gbif.org/standards | [T] 제목 |
| C5 | Data papers | GBIF | 미확인 | GBIF가 학술출판 파트너와 함께 data paper를 추진: 데이터 발행자에게 credit 부여, 학계에 데이터셋 존재 알림, 데이터 품질평가·관리 기제. | 5번 유형의 "그 다음 단계" 제시. | https://www.gbif.org/data-papers | [T] 제목 / [S] 내용 |
| C6 | Biodiversity Data Journal | Pensoft | 미확인 | 커뮤니티 동료심사 오픈액세스 저널. 생물다양성 관련 데이터의 신속 출판·확산·공유를 목적. 분류학·플로라/파우나·형태·유전체·계통·생태·환경 데이터를 다룸. | 시민과학 데이터가 논문이 되는 실제 경로. | https://bdj.pensoft.net/ | [T] 제목 / [S] 내용 |
| C7 | The data paper: a mechanism to incentivize data publishing in biodiversity science | BMC Bioinformatics | 2011 | 생물다양성 data paper는 우선권 등록·인용가능성·확산을 통해 데이터 발행자의 노력과 투자에 학술적 인정을 부여하는 기제. | 데이터 공개의 동기 설명. | https://link.springer.com/article/10.1186/1471-2105-12-S15-S2 | [T] 제목 / [S] 내용 |
| C8 | What is the Data Quality Assessment (DQA) and how do observations qualify to become "Research Grade"? | iNaturalist Help | 미확인 | Research Grade: 동정자 2/3 초과가 종 수준 분류군에 동의하고 커뮤니티 분류군과 관찰 분류군이 일치. DQA는 완전성·논리적 일관성·위치정확도·시간정확도·주제정확도를 다룸. Needs ID / Research Grade / Casual 3등급. | **커뮤니티 검증 모델의 표준 설명.** 워크숍의 "확신도" 항목 근거. | https://help.inaturalist.org/en/support/solutions/articles/151000169936-what-is-the-data-quality-assessment-and-how-do-observations-qualify-to-become-research-grade- | [T] 제목 / [S] 내용 |
| C9 | We estimate the accuracy of Research Grade observations to be 95% correct! | iNaturalist Blog | 미확인 | Research Grade 관찰의 정확도를 95%로 추정. | 시민 데이터 신뢰성을 방어할 때 쓸 숫자. | https://www.inaturalist.org/blog/89255-we-estimate-the-accuracy-of-research-grade-observations-to-be-95-correct | [T] (제목에 95% 명시) |
| C10 | A second experiment to learn about the accuracy of iNaturalist observations | iNaturalist Blog | 미확인 | 별도 실험에서 정확도 97% 추정. 후보 검증자 887명 참여, 표본의 96% 검증, 관찰 1건당 평균 4명 검증. | C9와 수치가 다름 — 병기 필요. | https://www.inaturalist.org/blog/90263-a-second-experiment-to-learn-about-the-accuracy-of-inaturalist-observations | [T] 제목 / [S] 수치 |
| C11 | iNaturalist Research-grade Observations (GBIF 데이터셋) | GBIF | 미확인 | Research Grade 관찰이 GBIF 데이터셋으로 등록·공개됨. | 시민 기록이 국제 데이터가 되는 실증. | https://www.gbif.org/dataset/50c9509d-22c7-4a22-a47d-8c48425ef4a7 | [T] 제목 |
| C12 | 생물 모니터링 야장 양식 | 환경아카이브 풀숲 | 미확인 | 생물 모니터링용 야장 양식 자료. | 워크숍 배포 야장 양식의 국내 실물 참고. (본문 미확인) | https://ecoarchive.org/items/show/65676 | [T] 제목 |
| C13 | 생물분류 현장전문가 역량강화 교육용교재 (조류) / (식물) | 국립생물자원관 | 미확인 | 야장에 조사일시·조사자·지역정보 및 좌표·특이사항 포함. 채집지 정보와 식물 정보로 구분. 채집일자·채집시간·행정구역명, 도로/등산로상 거리 등 상세 기록, 경위도는 생물지리정보시스템 구축에 중요. | **야장 필수항목의 국내 1차 근거.** | https://www.nibr.go.kr/aiibook/access/ecatalogt.jsp?callmode=admin&catimage=&eclang=ko&Dir=1174&um=s&start=156 / https://www.nibr.go.kr/aiibook/access/ecatalogt.jsp?callmode=admin&catimage=&eclang=ko&Dir=1316&um=s&start=62 | [T] 제목 / [S] 내용 |
| C14 | 검색표(이분법 검색표) 만드는 법: 예시로 배우는 단계별 가이드 | SciDraw | 미확인 | 목록 만들기 → 형질표 → 첫 분기 → 상호배타적 대구 → 일반에서 구체로 → 목적지 추가. 사용 전 신뢰할 수 있는 기재·표본 자료와 대조. | 4번 유형(시민 도감)의 동정키 제작 실습 자료. | https://sci-draw.com/ko/blog/how-to-make-a-dichotomous-key | [T] 제목 / [S] 내용 |

### D. 국내 시민과학 사례

| # | 제목 | 발행기관 | 연도 | 핵심 3줄 | 워크숍 활용 지점 | URL | 등급 |
|---|---|---|---|---|---|---|---|
| D1 | K-BON / 시민참여 한국 생물다양성 관측 네트워크 (K-BON) | 국립생물자원관 (species.nibr.go.kr) | 2011~ | GEO 산하 GEOBON의 국가 단위 체계로 2011년부터 운영. 기후변화 생물지표종 100종 포함 전국 모니터링. 기록은 기후변화 생물다양성 변화 예측과 보전·관리 정책 기초자료로 활용. 네이처링 앱/웹으로 참여. | 사례 1. 시민 기록의 정책 활용 경로. | https://species.nibr.go.kr/home/mainHome.do?contCd=002002004002 / https://species.nibr.go.kr/nibr/assets/K-BON_lF.pdf / https://www.naturing.net/p/1 | [T] 제목 / [S] 내용 |
| D2 | K-BON JUNIOR | 네이처링 | 미확인 | 중·고등학생 및 대학생 시민과학자로 구성된 주니어 네트워크. | 청소년 팀 대응 모델. | https://www.naturing.net/p/3 | [T] 제목 / [S] 내용 |
| D3 | 시민참여 「한국 생물다양성 관측 네트워크(K-BON)」 합동조사를 통한 지역 생물다양성 모니터링 — 내장산국립공원 일대를 중심으로 | (논문) | 미확인 | K-BON 합동조사 기반 지역 생물다양성 모니터링 사례 연구. | "합동조사 → 논문"이라는 성과 경로의 국내 실증. (본문 미확인) | https://www.researchgate.net/publication/366425338_simincham-yeo_hangug_saengmuldayangseong_gwancheug_neteuwokeuK-BON_habdongjosaleul_tonghan_jiyeog_saengmuldayangseong_moniteoling_-_naejangsanguglibgong-won_ildaeleul_jungsim-eulo | [T] 제목 |
| D4 | 야생조류 유리창 충돌 조사 (네이처링 미션) | 네이처링 | 2018.7~ | 미션 참여자 5,594명, 관찰기록 62,477건(스니펫 시점). 2018.7~2022.7 누적 통계를 국립생태원 김영준 동물관리연구실장이 분석. | 사례 2. 최대 규모 국내 시민과학 미션. | https://www.naturing.net/m/2137/summary / https://www.naturing.net/u/40084/observations | [T] 제목 / [S] 수치 |
| D5 | [포토] 국립생태원, 야생조류 유리창 충돌 조사 지침서 | 이데일리 | 2021 | 국립생태원이 2021년 5월 31일 「야생조류 유리창 충돌 시민 참여 조사 지침서」 발간. 조사 방법·기록 방법·충돌 원인을 설명. | **"지침서" 자체가 성과물이 된 사례.** 8번 유형 참고. | https://www.edaily.co.kr/news/read?newsId=02922486629054496&mediaCodeNo=257 | [T] 제목 / [S] 내용 |
| D6 | 야생조류 투명 유리창 충돌, 시민과 함께 막는다 | 환경부 보도자료 | 미확인 | 시민 참여로 유리창 충돌 문제에 대응하는 정책 발표. | 시민과학 → 정부 정책 연결 실증. | http://www.me.go.kr/home/web/board/read.do?boardMasterId=1&boardId=1455610&menuId=286 / https://keia.kr/main/board/1/6162/board_view.do?cp=152&listType=list&bdOpenYn=Y | [T] 제목 |
| D7 | 새 충돌 줄이려면 '5×10 규칙' 기억하라 | 시사IN | 미확인 | 2018.10 환경부·국립생태원 보고서 추정: 투명 방음벽 연 197,732마리, 건물 유리창 연 7,649,030마리. 시민 데이터가 '5×10 규칙'이라는 기억 가능한 지침으로 번역됨. | **성과물의 최종 형태가 "규칙 한 줄"일 수 있음을 보여주는 사례.** | https://www.sisain.co.kr/news/articleView.html?idxno=44734 | [T] 제목(5×10) / [S] 수치 |
| D8 | 국립생태원_로드킬 정보시스템 로드킬 신고 현황_20221231 | 국립생태원 / 공공데이터포털 | 2022 | 시민·도로관리청 신고 기반 로드킬 데이터 개방. | 5번 유형(데이터셋)의 국내 개방 사례. | https://www.data.go.kr/data/15105476/fileData.do?recommendDataYn=Y | [T] 제목 |
| D9 | 국립생태원_동물 찻길 사고 현황 자료_20231231 | 국립생태원 / 공공데이터포털 | 2023 | 동물 찻길 사고 현황 개방 데이터. | 동일. | https://www.data.go.kr/data/15100280/fileData.do?recommendDataYn=Y | [T] 제목 |
| D10 | [보도자료] 로드킬 신고 어플리케이션 '굿로드' 개발 | 녹색연합 | 2017 | 2017년 '소셜이노베이션캠프 36'에서 굿로드 앱 개발·보급, 이후 국립생태원과 로드킬통합관리시스템 제작. 종명·접수일시·도로유형·도로명·위치정보·사진 수집. 위치 데이터 분석으로 사고다발 상위 50개 구간 선정, 구간별 저감시설 설치 및 누리집 지도 제공. | 사례 3. **최소 6개 컬럼으로 정책까지 간 경로.** | http://www.greenkorea.org/activity/wild-animals/roadkill/61241/ / https://www.greenkorea.org/activity/wild-animals/roadkill/67103/ | [T] 제목 / [S] 내용 |
| D11 | 국가해안쓰레기 (해양환경정보포털) | 해양환경공단 / 해양수산부 | 2008~ | 해수부 예산 지원·해양환경공단 주관. 2008~2014년 20개 지역 → 2014~2020년 40개 → 2021~2023년 60개, 2개월 1회 조사. 공단이 방법론·교육·질관리·분석, 지역 민간단체가 현장조사·자원봉사자 교육. | 사례 4. **품질관리 분업 구조의 국내 모범.** | https://meis.go.kr/mli/monitoringInfo/intro.do / https://www.data.go.kr/data/15114321/openapi.do?recommendDataYn=Y | [T] 제목 / [S] 내용 |
| D12 | 정원도시 서울 — 바이오블리츠 서울 / 2023 바이오블리츠 서울(서울 생물다양성 탐사) | 서울특별시 / 네이처링 | 2023 | 분류군별 전문가와 시민이 생물상을 조사해 서식 생물종 목록 작성. 분류군별 팀 구성, 발견 종을 네이처링 앱·웹으로 기록해 생태지도 제작. | 사례 5. **목록집 + 지도 동시 산출 모델.** | https://parks.seoul.go.kr/bioblitzseoul/bioblitzMain.jsp / https://www.naturing.net/m/6132 / https://www.naturing.net/p/2/entry | [T] 제목 / [S] 내용 |
| D13 | 환경부 국립생물자원관_(2018-2019년도)겨울철 조류 동시 센서스_20191231 / _20201231 | 국립생물자원관 / 공공데이터포털 | 2019, 2020 | 1999년부터 전국 주요 습지 대상 지속 실시. 연도별 결과를 공공데이터로 개방. | 사례 6. 8번 유형(보고서)의 국내 표준. | https://www.data.go.kr/data/15086762/fileData.do / https://www.data.go.kr/data/15086761/fileData.do | [T] 제목 |
| D14 | [보고서] 2014년도 겨울철 조류 동시 센서스 | 국립생물자원관 / ScienceON | 2015 등재 | 연도별 센서스 보고서 원문. | 보고서 목차 구조 참고. (본문 미확인) | https://scienceon.kisti.re.kr/srch/selectPORSrchReport.do?cn=TRKO201500012776&dbt=TRKO | [T] 제목 |
| D15 | [환경부] 조류 동시 총조사…겨울철새 136만 마리 확인 | 워터저널 | 미확인 | 조사 결과가 "136만 마리"라는 한 문장 헤드라인으로 전달됨. | **"결론 한 문장"의 국내 실물 예시.** 3분 발표 ②번 구간 예시로 사용. | https://www.waterjournal.co.kr/news/articleView.html?idxno=72674 | [T] (제목에 수치 포함) |
| D16 | 네이처링 About / How to use / 네이처링 가이드 / 지금, 여기, 우리가 만드는 생물다양성 지도 | 네이처링 | 미확인 | iNaturalist를 모델로 한 자연 관찰·기록·공유 네트워크. 누구나 미션을 제안·참여. 미션 활동은 종 서식 확인·목록 작성·서식지 보전·정책 제안·교육·연구논문 발표로 이어질 수 있음. | 사례 7. **참가자가 실제로 쓸 도구.** | https://www.naturing.net/info/about / https://www.naturing.net/info/howtouse / https://www.naturing.net/m/4691/summary / https://s3-ap-northeast-1.amazonaws.com/naturing-s3-tokyo/public/%EB%84%A4%EC%9D%B4%EC%B2%98%EB%A7%81_%EA%B0%80%EC%9D%B4%EB%93%9C.pdf | [T] 제목 / [S] 내용 |
| D17 | 가로림만 생물다양성 탐사 (네이처링 미션, 관찰목록·지도) | 네이처링 | 미확인 | 특정 지역 생물다양성 탐사 미션의 관찰목록과 지도 뷰. | 2·3번 유형의 실물 참고 화면. | https://www.naturing.net/m/7720/entryobs/19034/map | [T] 제목 |
| D18 | 반려해변 (해양환경정보포털) / 반려해변 — 모두가 돌보는 해변 입양 생태계 | 해양환경공단 | 2020~ | 기업·단체·학교가 해변을 입양해 정화활동·인식제고 캠페인 수행. 2020년 제주 시범 시작, 전국 100개 넘는 해변으로 확대. 충남 28회 1,600여 명, 국제 연안정화의 날 23차례 1,200여 명, 인천 7개 해변 12개 단체. | 사례 8. **"횟수 × 인원"만으로 성과물이 되는 최소 모델.** | https://www.meis.go.kr/mli/rjct/info.do / https://team.caresea.kr/ | [T] 제목 / [S] 수치 |
| D19 | 국가생물다양성 정보공유체계 (CBD-CHM KOREA) / GBIF 소개 및 구조 (KBIF) | 국립생물자원관 / NARIS | 2008~ | 한국은 2008년부터 GBIF 참여, KBIF가 국내 정보를 GBIF에 제공. 1단계 3개 기관 → 2단계 14개 기관, 국내 115만 건 공유. 2023년 기준 61개 기관 참여, 약 660만 건 등록·공유. | 사례 9. **데이터의 최종 목적지.** | https://www.kbr.go.kr/ / http://www.cbd-chm.go.kr/home/bio/bio06004i.do / https://www.naris.go.kr/intd/kbif/selectGbifIntdAndStrct.do | [T] 제목 / [S] 수치 |
| D20 | 세계생물다양성정보기구(GBIF) 시민참여 자연사정보 기록 (네이처링 프로젝트) | 네이처링 | 미확인 | 시민이 기록한 자연사 정보를 GBIF와 연결하는 프로젝트 페이지. | 5번 유형 팀에게 제시할 실제 투고 경로. | https://www.naturing.net/p/9/missions | [T] 제목 |

### E. 발표 · 전달 · 시각화

| # | 제목 | 발행기관 | 연도 | 핵심 3줄 | 워크숍 활용 지점 | URL | 등급 |
|---|---|---|---|---|---|---|---|
| E1 | The Message Box | COMPASS Science Communication | 미확인 | 머릿속 정보를 청중에게 닿는 방식으로 전환하는 도구. 원칙: Know Your Audience, Frame Your Message, Lead With Results, Avoid Jargon. 인터뷰 준비와 발표 계획에 사용 가능. | **3분 발표 템플릿의 이론 축.** | https://www.compassscicomm.org/leadership-development/the-message-box/ | [T] 제목 / [S] 내용 |
| E2 | The Message Box Workbook: Communicating Your Science Effectively | COMPASS Science Communication | 2020 게시 | Message Box 실습 워크북. | 워크숍 실습지 원본. (본문 미확인) | https://www.compassscicomm.org/wp-content/uploads/2020/05/The-Message-Box-Workbook.pdf | [T] 제목 |
| E3 | The "Message Box": A tool for effective communication in and out of science | Southwest CASC (Arizona) | 2022 게시 | Message Box의 과학 안팎 커뮤니케이션 활용 안내. | 보조 자료. (본문 미확인) | https://swcasc.arizona.edu/sites/default/files/2022-07/TheMessageBox_0.pdf | [T] 제목 |
| E4 | 엘리베이터 피치 | 위키백과 | 미확인 | 상품·서비스·기업과 그 가치에 대한 빠르고 간단한 요약 설명. 이름의 유래는 엘리베이터에서 중요한 사람을 만났을 때 20초~3분에 생각을 요약 전달해야 한다는 의미. | **"3분"이라는 형식의 정의 근거.** | https://ko.wikipedia.org/wiki/%EC%97%98%EB%A6%AC%EB%B2%A0%EC%9D%B4%ED%84%B0_%ED%94%BC%EC%B9%98 | [T] 제목 / [S] 내용 |
| E5 | 엘리베이터 피치 예시 15가지 + 템플릿 & 작성법 | Asana | 2026 표기 | 6단계로 구성. 오프닝은 호기심을 자극하는 문구 — 생각하게 하는 질문, 놀라운 통계, 통념에 도전하는 발언. 긴장 시 말이 빨라지므로 또박또박 천천히. | 3분 발표 ①번 구간과 리허설 규칙의 근거. | https://asana.com/ko/resources/elevator-pitch-examples | [T] 제목 / [S] 내용 |
| E6 | Edward Tufte | Wikipedia | 미확인 | 예일대 통계·정치학·컴퓨터과학 명예교수. 1983년 『The Visual Display of Quantitative Information』 출간. data-ink ratio, chartjunk, graphical integrity, small multiples 개념 도입. | 데이터 시각화 원칙의 표준 근거. | https://en.wikipedia.org/wiki/Edward_Tufte | [T] 제목 / [S] 내용 |
| E7 | Edward Tufte's Principles for Data Visualization | The Comm Spot | 미확인 | 데이터 시각화는 분석적 실천이자 윤리적 실천. 차트는 사고와 의사결정에 영향을 주므로 데이터를 정직하고 명확히 표현해야 함. | **체크리스트 D의 "정직성" 항목 근거.** | https://thecommspot.com/comm-subjects/visual-communication/data-visualization/principles-of-data-visualization/ | [T] 제목 / [S] 내용 |
| E8 | 인포그래픽 디자인, 데이터 구조화 3가지 원칙 / 인포그래픽 총정리 가이드 | 비젠소프트 / 크몽 | 미확인 | 3색 원칙(배경색 1 + 주조색 1 + 강조색 1) + 중성색 보조. 인포그래픽 1개당 핵심 메시지 1개 + 보조 데이터 3~5개. 제목·부제·섹션으로 관련 정보를 묶어 제시. 해석에 시간이 오래 걸릴수록 잘못 만든 것. | 포스터·패널의 색상/정보량 규칙. | https://www.vizensoft.com/about/itinsight/read?no=575 / https://kmong.com/article/824--%EC%9D%B8%ED%8F%AC%EA%B7%B8%EB%9E%98%ED%94%BD-%EC%B4%9D%EC%A0%95%EB%A6%AC-%EA%B0%80%EC%9D%B4%EB%93%9C | [T] 제목 / [S] 내용 |
| E9 | How to write a policy brief | IDRC (International Development Research Centre) | 미확인 | 정책브리프는 연구와 권고를 비전문 청중에게 제시하는 핵심 도구이자 증거기반 정책 조언 전달 수단. 최상의 정책브리프는 명확·간결하며 단일 주제에 집중하는 독립 문서. | 6번 유형(정책 제안서)의 표준. | https://idrc-crdi.ca/en/funding/resources-idrc-grantees/how-write-policy-brief | [T] 제목 / [S] 내용 |
| E10 | Guide for Writing Policy Briefs | UC Davis (EPM) | 2020-10 | 정책브리프 작성 가이드. | 워크숍 배포 템플릿 후보. (본문 미확인) | https://epm.ucdavis.edu/sites/g/files/dgvnsk296/files/inline-files/EPM-Policy-Brief-Guide.pdf | [T] 제목 |
| E11 | Guidelines for writing a policy brief With a checklist for authors | CEFTA | 2021 게시 | 저자용 체크리스트가 포함된 정책브리프 작성 지침. | 6번 유형 자가진단표 후보. (본문 미확인) | https://cefta.int/wp-content/uploads/2021/09/Guidelines-for-drafting-a-policy-brief.pdf | [T] 제목 |
| E12 | Policy Briefs | UNC Writing Center | 미확인 | 정책브리프의 구조와 작성 원칙 안내. 700 단어 이하로 쟁점을 요약하고 실행 가능한 정책 권고를 담는다는 설명이 검색 요약에 등장. | 분량 기준. | https://writingcenter.unc.edu/tips-and-tools/policy-briefs/ | [T] 제목 / [S] 분량 |
| E13 | 손쉽게 제안 승률을 높이는 핵심 요약서(Executive Summary) 작성법(템플릿 포함) / 제대로 된 Executive Summary 쓰기 | PUBLY / brunch | 미확인 | 바쁜 의사결정권자를 위한 핵심 요약서. 1~2페이지. 두괄식, 팩트 중심, 핵심 데이터 명기. 문제 정의–권장 솔루션–솔루션의 가치–결론 구성. | 8번 유형(보고서)의 **별쇄 요약문 1장** 근거. | https://publy.co/content/7522 / https://brunch.co.kr/@joceyjh/5 | [T] 제목 / [S] 내용 |
| E14 | Google 내 지도(My Maps) 정보 / 사용법 | Google | 미확인 | 맞춤 지도를 만들고 수정해 온라인 공유. 아이콘·색상 스타일, 장소별 사진·동영상 추가. 문서처럼 함께 만들고 게시 가능. | 3번 유형(분포 지도)의 무료 제작 도구. | https://www.google.com/intl/ko/maps/about/mymaps/ / https://support.google.com/maps/answer/3045850?hl=ko&co=GENIE.Platform%3DDesktop | [T] 제목 / [S] 내용 |
| E15 | 예비 사진작가를 위한 사진전 준비 A to Z | 포토저널 | 미확인 | 캡션은 사진 정보를 관람객에게 직접 소개하므로 가능한 빠뜨리지 않는 것이 좋다. | 7번 유형(전시 패널)의 캡션 필수성 근거. | http://www.photojournal.co.kr/mobile/bbs/board.php?bo_table=spe_edit&wr_id=5208&page=3 | [T] 제목 / [S] 내용 |
| E16 | 미술 작품 캡션 표기법 및 정확한 이름표 표기 방법 (국내, 해외) | Artistic Blog | 미확인 | 작가명·작품명·제작연도·재료·크기 정보가 통일되지 않으면 관람객과 연구자 모두 혼란. 캡션은 단순 이름표가 아니라 작품 이해를 돕는 필수 요소. | **캡션 항목 표준화의 근거.** 생태 사진 캡션(촬영일/장소/종명/의미)으로 번안. | https://creative-canvas.co.kr/%EB%AF%B8%EC%88%A0-%EC%9E%91%ED%92%88-%EC%BA%A1%EC%85%98-%ED%91%9C%EA%B8%B0%EB%B2%95/ | [T] 제목 / [S] 내용 |
| E17 | Case Studies in Advancing Community Priorities Through Museum-Community Participatory Science Partnerships | Citizen Science: Theory and Practice | 미확인 | 박물관·시민과학 분야에서 전통적 공중참여 모델을 넘어 공동창작 파트너십을 구축하자는 요구가 지속. 일반적 프로그램 유형은 전시, 워크숍, 강연, 이벤트, 아웃리치. | 7번 유형(전시)의 국제 근거. | https://theoryandpractice.citizenscienceassociation.org/articles/10.5334/cstp.920 | [T] 제목 / [S] 내용 |

---

**총 출처 항목 수: 74건** (A 8 / B 15 / C 14 / D 20 / E 17). 한 항목에 관련 URL을 2~4개 병기한 경우가 있어 실제 URL 수는 이보다 많음.
**고유 도메인 기준 검증 채널: WebSearch 단일** — 모든 항목의 본문은 미열람.
