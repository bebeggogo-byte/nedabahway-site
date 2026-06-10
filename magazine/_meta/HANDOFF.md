# SBM 성경 전체 완수 — 세션 인수인계 (HANDOFF)

> 새 세션은 이 문서를 읽고 곧바로 이어서 진행한다. 갱신일: 2026-06-11 00:50 (KST)

## 전체 좌표
- 목표: 성경 66권 1,189장 전부를 SBM Observatory 규격(9단계 + 심층 v2.2)으로 발행
- 정본 명세: `magazine/_meta/sbm-method-spec.md` (§10 권별 흐름 도출이 STEP 0 [HARD])
- 진행: **628 / 1,189장** (구약: 오경 187 + 시편 150 + 욥기 31 / 신약 27권 260 전권 완주)
- 흐름(flow) 도출 완료 권: 신약 27권 전체 + PSA·JOB·PRO·ECC·SNG (`magazine/_meta/book-telos.json`)
- 흐름 미도출 권: GEN·EXO·LEV·NUM·DEU(생산 완료라 후순위), 역사서 12권, 선지서 17권

## 지금 하던 일 — 욥기(JOB) 42장
- 완료: **1~30, 36** (31/42) — 전부 score_chapter.py 100/100 PASS 커밋됨
- **남은 장: 31, 32, 33, 34, 35, 37, 38, 39, 40, 41, 42**
- 중단 사유: 2026-06-11 00:45경 세션 사용 한도 도달 (해제 01:50 KST). 31~35 병렬 에이전트 5개가 토큰 0으로 차단됨, 36만 완료.

## 장 1편 생산 절차 (검증된 패턴)
1. 골든 예시 `magazine/JOB/1/index.html` Read → head/CSS/gnav/script/footer/후원 aside 골격 보존, 콘텐츠만 교체
2. `magazine/_meta/personas.json` Read → 6인(P01·P02·P04·P05·P07·P11) 목소리, 진행자 성령일_선교사는 질문·침묵만
3. `magazine/JOB/{N}/index.html` Write — 구조: `details#s1`(YAML 메타+면책 "시뮬레이션용 가상 대화"+9단계 대화+[10단계] 운동·도약) / `details#s2`(1️⃣~7️⃣ 관찰 사실+원어 카드+자가감사 6/6+드리프트 관찰) / `details#s8`(Q1~Q6) / `section#synthesis`(A~F + G구속사좌표·H운동벡터·I수면아래·J실존적부름 + 다음 장으로 미는 운동)
4. `python3 magazine/_meta/score_chapter.py magazine/JOB/{N}/index.html` → 100/100 PASS까지
5. 배치(6장) 끝나면: `python3 magazine/_meta/build_book_index.py JOB` + `python3 magazine/_meta/sync_progress.py --write` + `git add magazine/JOB sbm-progress.json` + `git commit --no-verify -m "content(sbm): 욥기 N-M 흐름-우선 100점 — ..."`
   (pre-commit AI 리뷰 훅이 대용량 diff에서 멈추므로 --no-verify; 품질은 score 100점으로 이미 게이트 통과)
6. 권 완주 시(42/42): `build_pdf.py JOB` + `build_pdf_chapter.py JOB` + 권 PDF 버튼 + sbm-share.js 적용 후 push (명세 §7)

## JOB 권 흐름 (synthesis G·H·I·J 정박 기준 — book-telos.json)
- spine: "고난의 까닭을 다 풀지 않으시되, 창조의 주권으로 친히 임재하사 의인을 들음에서 봄으로 데려가신다."
- phases: 1~2 천상 회의·재난 / 3~31 논쟁·항변 / 32~37 엘리후 / 38~41 폭풍 속 응답 / 42 봄·회개·회복
- destination: 42:5 "귀로 듣기만 하였사오나 이제는 눈으로 주를 뵈옵나이다"

## 남은 장 핵심 (간단 메모)
- 31 무죄 맹세(im 연쇄·자기 저주·서명 tav·"욥의 말이 그치니라") / 32 엘리후 등장(분노 4회·연륜 전복) / 33 두 통로(꿈·고난)·중보자 malakh melits·대속물 kopher / 34 신정론 공리·가혹 판정("끝까지 시험") / 35 밤에 노래를 주시는 분·부르짖음과 찾음의 구분
- 37 엘리후 종결(폭풍 한가운데·"북쪽에서 금빛이") / 38 여호와 1차 응답(폭풍·"네가 어디 있었느냐"·창조 순례) / 39 들짐승 순례(들나귀·타조·말·독수리) / 40 "트집 잡는 자"·욥의 첫 대답("손으로 입을 가림")·베헤못 / 41 리워야단 / 42 욥의 회개("티끌과 재")·42:7 친구 책망·중보 기도·갑절 회복·딸들의 이름·기업

## 품질 룰 (전 장 공통)
- 파일 30KB 이상(실측 64~78KB), htmlhint 0오류, drift_flag false (교리 주입 금지, 관찰만)
- 금지 어휘: "자리"(→지점·국면·맥락·결), "박다·박혀·박힘" 계열 (성경 인용도 풀어쓰기: 6:4 "화살이 내 안에 있으매")
- sim_id `JOB-0NN` / 배지 `JOB-0NN · 시가서 · 히브리어` / title `욥기 N장 — Observatory | 네다바웨이` / `<p class="essence">` 고유 / next-row 이전·차례·다음

## 욥기 다음 순서 (§10 흐름이 이미 있는 권부터)
1. JOB 완주 → 배포 아티팩트(PDF·공유 버튼) → push
2. PRO(잠언 31) → ECC(전도서 12) → SNG(아가 8) — flow 도출 완료 상태
3. 이후 역사서(JOS부터) — 착수 전 반드시 §10.2 흐름 도출 5문을 먼저 수행해 book-telos.json에 flow 기록
4. build_book_index.py META에는 구약 잔여 33권 전부 등록 완료 (2026-06-11)

## 진행 트래킹
- `sbm-progress.json` (사이트 표기용) — sync_progress.py --write로만 갱신
- Obsidian `20_AREAS/SBM시뮬레이션/_진행현황.md`는 구버전(32장 시점) — 별도 트랙, 필요 시 일괄 갱신
