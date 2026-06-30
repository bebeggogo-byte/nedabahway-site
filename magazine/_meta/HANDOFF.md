# SBM 성경 전체 완수 — 세션 인수인계 (HANDOFF)

> 새 세션 시작 시 이 문서를 먼저 읽으면 즉시 이어서 작업할 수 있다.
> 목표(사용자 지시): **"sbm 성경전체 완수하라"** — 66권 1189장 전체를 SBM 관찰로 생산,
> 각 장 100점 통과 후 커밋, 권 완성 시 PDF·인덱스·공유버튼 갖춰 nedabah.org에 배포.
> 의사결정을 사용자에게 묻지 말고 자율 추진. 한국어로 응답.

## 0. 환경 셋업 — 새 세션에서 가장 먼저 [필수]

컨테이너는 재생성되면 pip 패키지가 사라진다. 작업 전 반드시 설치:
```bash
pip install beautifulsoup4 weasyprint        # score_chapter.py(bs4)·PDF 빌더(weasyprint)
sudo apt-get install -y fonts-noto-cjk        # PDF 한글 폰트 (이미 있으면 생략)
```
- 미설치 시 `score_chapter.py`가 `ModuleNotFoundError: bs4`로 점수 출력이 비고, 모든 장이 "미완"으로 오판된다.
- htmlhint은 `npx htmlhint`로 별도 동작(정상). 점수 빈출력 = bs4 미설치 신호.
- **신뢰 가능한 완성 판정**: `sbm-progress.json`(파일 크기 ≥30KB 기준, bs4 불필요). bs4 깨졌을 때 현황은 이걸로 본다.

## 1. 현재 상태 (2026-06-08 기준)

- **완성 36권 / 66권 · 683/1189장 (57%)**
- **신약 27권 전권 완성·배포됨** (복음서4·행전·바울13·일반서신8·계시록) — PR #114 머지
- **구약 오경 5(창·출·레·민·신) + 시가서 4(시편·잠언·전도서·아가) 완성**
- **욥기 JOB 35/42 진행 중** — 미완 6~7장: **9·10·11·39·40·41·42** (size<30KB이거나 미작성)
- 매거진 인덱스(magazine.html): 66권 전체 카드 노출 + 진행률 자동 동기화 체계 구축됨
- 브랜치: `claude/agent-autonomy-tasks-HqLq7` (여기서만 개발, main 머지는 PR로). 워킹트리 깨끗.

### 미착수 29권 (이어서 할 일, 우선순위순)
1. **욥기 JOB 9·10·11·39·40·41·42** 마무리 → 시가서 5권 전권 완성 → 권 아티팩트·배포
2. **구약 역사서 12권**: 여호수아 JOS·사사기 JDG·룻기 RUT·사무엘상 1SA·사무엘하 2SA·열왕기상 1KI·열왕기하 2KI·역대상 1CH·**역대하 2CH**·에스라 EZR·**느헤미야 NEH**·에스더 EST
3. **대선지서 5권**: 이사야 ISA·예레미야 JER·예레미야애가 LAM·에스겔 EZK·다니엘 DAN
4. **소선지서 12권**: 호세아 HOS·요엘 JOL·아모스 AMO·오바댜 OBA·요나 JON·미가 MIC·나훔 NAM·하박국 HAB·스바냐 ZEP·학개 HAG·스가랴 ZEC·말라기 MAL
- [중요] 역사서·예언서 29권은 **book-telos.json에 흐름(flow)이 아직 없다** → 각 권 생산 전 §10 5문으로 흐름 도출·기록·커밋이 선행 조건.

### 교훈 (이번 세션에서 얻음)
- fable-5 하위 에이전트는 깊은 위임을 하다 첫 장만 쓰고 rest하는 경우가 있음 → 프롬프트에 **"DO DIRECTLY YOURSELF, do NOT delegate to sub-agents"** 명시하면 효율적.
- 동시 8개까지 투입 가능했으나 세션 한도(usage limit)에 걸려 중단된 적 있음 → 한도 리셋(UTC 표시) 후 재개.
- 하위 에이전트가 표준 템플릿 대신 `hero-section`/`essence-box` 발산 레이아웃을 만든 사례(PRO/15) 있었음 → 커밋 전 `grep -q obs-mast && grep -q 'class="gnav"'` 확인 필수. 채점기도 obs-mast 없으면 96점(-4)으로 차단.

## 2. 방법론 (가장 중요)

**§10 권별 흐름 도출 — 관찰의 상위 기준** (`magazine/_meta/sbm-method-spec.md` §10):
- 누가/마태 흐름을 복제하지 않는다. 권 생산 전 STEP 0로 그 권 고유 흐름을 5문으로 도출:
  ① 전체 파악(whole) ② 향방(destination) ③ 하나님의 의중(intent) ④ 하나님의 심정(heart) ⑤ 흐름(spine+phases)
- 도출 결과는 `magazine/_meta/book-telos.json` v3의 `books.{CODE}.flow`에 기록
- 각 장의 s2 사실 선별·[10단계] 운동·synthesis G·H·I·J를 **그 권 흐름에 명시 정박**
- s1 대화는 관찰에 머문다(교리·적용 단정 금지, drift_flag:false). 하나님의 의중·심정은 본문이 드러내는 한에서만.

**흐름 라이브러리 현황**: 신약 27권 전체 + PSA·JOB·PRO·ECC·SNG 완비(32권).
구약 역사서·예언서는 미도출 — 생산 전 반드시 §10 5문으로 먼저 도출해 telos에 기록·커밋.

## 3. 품질 게이트 (절대 규칙)

- 각 장 `python3 magazine/_meta/score_chapter.py magazine/{CODE}/{N}/index.html` → **✅ PASS(100/100)** 필수
- 깊이 바닥 30KB(실제 전심층 장은 40–58KB) — 구조만 갖춘 얄팍본 차단
- `grep -c sbm-share.js <file>` ≥1 필수 (에이전트가 자주 누락 → 커밋 전 확인, 누락 시 deck-toggle.js 다음 줄에 삽입)
- 100점+share.js 통과분만 커밋. 미통과는 절대 커밋 금지.

## 4. 생산 운영 패턴 (검증된 노하우)

- **동시 에이전트 2~3개만** (4개 이상이면 스톨/소켓 오류)
- 에이전트 프롬프트에 반드시: "CRITICAL WORKFLOW: write/validate ONE file at a time… skip any already ✅ PASS" (중단돼도 진척 보존, 재투입 멱등)
- 소켓/타임아웃 오류 빈발 → 완성분 즉시 커밋 후 같은 프롬프트로 잔여분 재투입
- 에이전트 프롬프트 구성: STEP 0(흐름 로드) → STEP 1(템플릿: 같은 권 완성 장 우선, 없으면 magazine/2CO/5 또는 PSA/1) → STEP 2(장별 내용 충실성 가이드: 핵심 본문·원어 음역) → STEP 3(검증)
- 페르소나: 진행자 성령일_선교사 + 고정 6인(P01 한나래·P02 이진우·P04 최현국·P05 김미영·P07 오지혜·P11 나경아), OT=히브리어/NT=헬라어 (`magazine/_meta/personas.json`)
- 임시 스크립트는 /tmp에만

## 5. 권 완성 시 배포 루틴

```bash
python3 magazine/_meta/build_book_index.py {CODE}    # 권 인덱스 (META에 책 없으면 먼저 추가)
python3 magazine/_meta/build_pdf.py {CODE}           # 권 PDF
python3 magazine/_meta/build_pdf_chapter.py {CODE}   # 장별 PDF (느림 — 백그라운드 권장)
python3 magazine/_meta/build_magazine_index.py --write  # 매거진 66권 카드 진행 동기화
python3 magazine/_meta/sync_progress.py --write      # sbm-progress.json (실시간 카운터 소스)
git add … && git commit && git push
```
- 배포 = PR 생성(draft) → ready → merge to main (GitHub MCP 사용, gh CLI 없음)
- 라이브 확인: 사이트는 봇 차단(403) → `mcp__github__get_file_contents`로 main ref 확인
- 커밋 메시지: `content(sbm): …` / `deploy(sbm): …` / `method(sbm): …` + 세션 URL 푸터

## 6. 핵심 파일 지도

| 파일 | 역할 |
|---|---|
| `magazine/_meta/sbm-method-spec.md` | 방법론 표준(§6 채점 루브릭, §8 심층 v2, §10 흐름 도출) |
| `magazine/_meta/book-telos.json` | 권별 좌표+흐름(flow) 라이브러리 — STEP 0의 소스 |
| `magazine/_meta/personas.json` | 진행자+6인 페르소나 헌장 |
| `magazine/_meta/score_chapter.py` | 100점 채점기(깊이 바닥 30KB 포함) |
| `magazine/_meta/build_*.py` | 권 인덱스/PDF/매거진 인덱스 빌더 |
| `magazine/_meta/sync_progress.py` | sbm-progress.json 동기화(30KB 기준) |
| `magazine.html` | 66권 카드 인덱스(정적) — JS가 sbm-progress.json으로 실시간 덮어씀 |
| `assets/sbm-share.js` | 각 장 공유+장 PDF 버튼(필수 include) |

## 7. 다음 세션 첫 액션 (그대로 실행)

1. **환경 셋업(§0)**: `pip install beautifulsoup4 weasyprint` — 안 하면 채점 불가.
2. **욥기 마무리**: JOB 9·10·11·39·40·41·42 — 1개 에이전트에 "DO DIRECTLY, no sub-agents" + JOB/8(또는 인접 완성장) 템플릿 명시로 투입. 완성 시 채점(✅ + obs-mast + gnav + share.js) 후 커밋 → **시가서 5권 완성** → `build_book_index.py JOB` + `build_pdf.py JOB` + `build_pdf_chapter.py JOB` + `build_magazine_index.py --write` + `sync_progress.py --write` → 배포 PR.
3. **역사서 흐름 도출**: 여호수아~에스더 12권을 §10 5문으로 도출해 book-telos.json에 flow 기록·커밋(역대하·느헤미야 포함). 그다음 권별 생산(서사 본문이라 장당 분량 큼 — 7~10장 단위 분할, 직접작성 지시).
4. **예언서 흐름 도출 + 생산**: 대선지서 5 → 소선지서 12. ISA(66장)·JER(52장)·EZK(48장)은 대형 → 여러 구간 분할.
5. 각 권 완성마다 배포 루틴(§5) 실행. 진행률은 매 커밋 후 `sync_progress.py --write`로 갱신.

운영 팁: 동시 2~4개 에이전트, 한 장씩 저장·기존 통과분 skip·**직접작성(하위 위임 금지)**. 완성 장마다 표준구조(obs-mast·gnav)+100점+share.js 확인 후에만 커밋.
