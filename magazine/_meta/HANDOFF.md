# SBM 성경 전체 완수 — 세션 인수인계 (HANDOFF)

> 새 세션 시작 시 이 문서를 먼저 읽으면 즉시 이어서 작업할 수 있다.
> 목표(사용자 지시): **"sbm 성경전체 완수하라"** — 66권 1189장 전체를 SBM 관찰로 생산,
> 각 장 100점 통과 후 커밋, 권 완성 시 PDF·인덱스·공유버튼 갖춰 nedabah.org에 배포.
> 의사결정을 사용자에게 묻지 말고 자율 추진. 한국어로 응답.

## 1. 현재 상태 (2026-06-07 기준)

- **신약 27권 전권 완성·배포됨** (복음서4·행전·바울13·일반서신8·계시록) — PR #114 머지
- **구약**: 오경 5권(창·출·레·민·신) + 시편 150 완성·배포. 시가서 진행 중.
- 전체 진행: **602/1189장+**, 착수 33권+ (sbm-progress.json이 항상 최신)
- 매거진 인덱스(magazine.html): 66권 전체 카드 노출 + 진행률 자동 동기화 체계 구축됨
- 브랜치: `claude/agent-autonomy-tasks-HqLq7` (여기서만 개발, main 머지는 PR로)

### 직전 세션 종료 시점의 미완(이어서 할 일, 우선순위순)
1. **아가 SNG 4–8** (1–3 커밋됨) — 에이전트 중단됨, 재투입 필요
2. **전도서 ECC 3–12** (1–2 커밋됨) — 재투입 필요
3. **잠언 PRO 1–15** — 시작 전 중단, 투입 필요 (이후 16–31 후속)
4. **욥기 JOB 1–42** — 흐름 도출 완료, 분할 투입(7~10장 단위)
5. 시가서 완성 시: 권 아티팩트(인덱스+권/장 PDF) 빌드 → 매거진 동기화 → 배포 PR
6. 이후: 구약 역사서 12권·예언서 17권 — **흐름 도출(§10 STEP 0) 먼저**, 그다음 생산

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

1. `git status` + SNG/ECC/PRO 디렉터리 채점 스캔 → 100점 통과분 커밋
2. 에이전트 3개 투입: SNG 4–8 / ECC 3–12 / PRO 1–15 (위 §4 패턴·기존 에이전트 프롬프트는 git log의 해당 커밋 메시지와 이 문서 §2~4로 재구성)
3. 완료분 커밋 → 시가서 권별 아티팩트 → 배포 PR
4. JOB 분할 투입(1–7, 8–14, … 7장 단위 순차) → 시가서 5/5 완성
5. 역사서(여호수아~에스더) 흐름 도출 → 생산 확대
