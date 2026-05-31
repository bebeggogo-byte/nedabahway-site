# blog_auto 500편 엔진 애드온

기존 `agent/blog_auto/` 파이프라인을 **수정하지 않고** 얹는 추가 모듈.
500편 마스터 플랜 기반으로 매일 3편을 생성·100점 채점·비즈니스 카테고리 분류한다.

마스터 플랜: `.moai/blog-strategy/naver-500-master-plan.md`

## 구성

| 파일 | 역할 |
|---|---|
| `plan_500.json` | 6기둥·시리즈 배분(=500) + Batch-1 30편 + 생성 규칙 |
| `naver_categories.json` | 비즈니스 퍼널 카테고리(바이어·CTA·퍼널 단계) |
| `rubric_scorer.py` | 100점 체크리스트 게이트 (100=전 must-pass 충족) |
| `categorize.py` | 시드 → 비즈니스 카테고리 라우팅 |
| `plan_runner.py` | 플랜 → 100점 시드 생성(미달 시 재작성 5회) → PENDING |
| `daily3.py` | 무중단 하루 3편 발행 + naver.html을 카테고리 트레이로 분류 |
| `install.sh` | 위 파일들을 `~/Scripts/agent/blog_auto/`에 설치 |

## 설치

```bash
cd ~/Desktop/nedabahway-site
git fetch origin && git checkout claude/optimistic-feynman-roK5e && git pull
bash tools/blog_auto_500/install.sh
```

## 가동

```bash
cd ~/Scripts
python3 -m agent.blog_auto.daily3 --target 3
```

생성물: `~/Scripts/agent/blog_auto/naver_ready/<카테고리폴더>/<slug>/`
- `naver.html` — 네이버 SmartEditor에 붙여넣을 본문
- `TO_PASTE.txt` — 어느 네이버 카테고리에 넣을지 + CTA 안내

## 매일 자동(무중단)

기존 launchd가 `python3 -m agent.blog_auto publish`를 부르는 자리에 daily3를 추가:

```bash
# 예: 기존 스케줄 plist의 ProgramArguments를 daily3로 교체하거나 한 줄 추가
python3 -m agent.blog_auto.daily3 --target 3
```

100점 미달 글은 자동 재작성(최대 5회), 그래도 미달이면 `_hold` 보류하고 다음 글로 넘어가
**큐가 멈추지 않는다**. 진행 상황은 `state/plan_progress.json`.

## 안전·되돌리기

- 기존 파일 무수정(추가 전용) → 제거하려면 위 6개 파일만 지우면 원상복귀.
- 네이버 게시는 여전히 **사람이 붙여넣기**(반자동) — 계정 위험 0.
