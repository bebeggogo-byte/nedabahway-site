# 조직 자동화 9선 — 자료 허브

기획·HR·마케팅 자동화 9가지를 누구나 30분에 구축할 수 있도록 정리한 강의·실습 자료.
모든 가이드는 **완성 코드·시트 템플릿 사양·트러블슈팅·응용 아이디어**를 포함합니다.

웹: <https://www.nedabah.org/resources/automation/>
강의 페이지: <https://www.nedabah.org/lectures/business-automation.html>

## 9가지 자동화

### 📋 기획
1. [회의록 → 액션아이템 자동 정리](planning/01-meeting-notes-to-actions.md)
2. [경쟁사·뉴스 일일 다이제스트](planning/02-competitor-news-digest.md)
3. [주간 KPI 자동 리포트](planning/03-weekly-kpi-report.md)

### 👥 HR
4. [신규 입사자 온보딩 키트](hr/01-onboarding-kit.md)
5. [휴가 신청 슬랙 승인 워크플로우](hr/02-leave-approval-workflow.md)
6. [분기 펄스서베이 + AI 감성 분석](hr/03-pulse-survey-sentiment.md)

### 📣 마케팅
7. [30일 콘텐츠 캘린더 자동 생성](marketing/01-content-calendar-generator.md)
8. [인입 리드 자동 스코어링·배정](marketing/02-lead-scoring-router.md)
9. [리뷰·멘션 주간 다이제스트](marketing/03-review-mention-digest.md)

## 공통 스택

- **Google Apps Script** — 무료, 브라우저에서 바로 작성·실행, 별도 서버 불필요
- **Google Workspace** — Sheets / Docs / Forms / Calendar / Gmail
- **Gemini 2.5 Flash 무료 티어** — 분당 15건, 일별 한도 충분 (소규모 팀 기준)
- **Slack Webhook 또는 Bot** — 무료
- **(선택) 네이버 검색 API** — 일 25,000건 무료 (마케팅 #3에서 사용)

월 운영비: **0원** (소규모 팀 기준).

## 강의에서 사용하는 법

1. **쇼케이스 (120분)**: 강사가 9개 중 2~3개를 라이브로 끝까지 시연
2. **워크숍 (4시간)**: 학습자가 자기 비즈니스 데이터로 1개 직접 구축
3. **직접 구축 (6시간 / 1일)**: 9개 중 학습자별 우선순위 1~3개를 끝까지 동작 검증

각 가이드의 "강의 시연 포인트" 섹션은 시연 시 강조할 흐름을, "응용 아이디어" 섹션은 워크숍 후반의 토론·확장 과제로 활용합니다.

## 안전·윤리 기본선

- 익명 설문·VOC 분석에서는 **식별 정보(이름·이메일·부서)를 AI에 전송하지 않는다.**
- 자동 응답·자동 발송은 **사람 검토 단계**를 한 번 이상 둔다.
- API 키는 코드에 직접 쓰지 않고 **Apps Script 스크립트 속성**에 저장한다.
- 외부 발송 자동화는 **되돌릴 수 없는 행위**임을 인지하고 첫 운영 시 함께 확인한다.

## 강의 의뢰

- 강사: 김창환
- 사이트: <https://www.nedabah.org/contact.html>
- 메일: <nedabah.way@gmail.com>

## 라이선스

이 자료는 강의 수강자 및 자기 조직 적용을 위해 자유롭게 사용·수정할 수 있습니다. 외부 강의·교재 재배포 시 출처 표기를 부탁드립니다.
