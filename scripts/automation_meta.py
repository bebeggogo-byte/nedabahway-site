"""Shared metadata for automation guide builders.

All build scripts (build-automation-pages.py, build-automation-pdf.py,
build-automation-kit.sh, build-automation-handout.py, build-automation-shortlinks.py)
read CARDS from this module so the source of truth is single.
"""
from __future__ import annotations

# Each entry maps to one .md file under resources/automation/.
# Fields:
# - section: 기획 / HR / 마케팅
# - tag: visible label (PLAN-01, etc.)
# - short_id: number used in /auto/{N}.html short URL
# - title, summary: human-readable
# - level: 난이도 ★ / ★★ / ★★★
# - time: 예상 셋업 소요시간
# - prereq: 한 줄 전제조건
# - for_starter: True if recommended in the hub starter block
CARDS = {
    "planning/01-meeting-notes-to-actions": {
        "section": "기획", "tag": "PLAN-01", "short_id": "1",
        "title": "회의록 → 액션아이템 자동 정리",
        "summary": "Google Doc 한 장을 던지면 AI가 결정사항·할일·담당자·기한을 추출해 시트·Slack에 적재합니다.",
        "level": "★", "time": "30분", "prereq": "구글 계정 + Gemini API 키",
        "for_starter": True, "tool": "/auto/tools/meeting-actions/",
        "tool_label": "회의록 즉시 정리 도구 (30초)",
    },
    "planning/02-competitor-news-digest": {
        "section": "기획", "tag": "PLAN-02", "short_id": "2",
        "title": "경쟁사·뉴스 일일 다이제스트",
        "summary": "매일 새벽 RSS·키워드를 수집·요약해 메일/Slack 한 장 다이제스트로 발송합니다.",
        "level": "★★", "time": "45분", "prereq": "구글 계정 + Gemini API 키 + (선택) Slack",
        "for_starter": False, "tool": "/auto/tools/news-digest/",
        "tool_label": "다이제스트 미리보기 (20초)",
    },
    "planning/03-weekly-kpi-report": {
        "section": "기획", "tag": "PLAN-03", "short_id": "3",
        "title": "주간 KPI 자동 리포트",
        "summary": "AI가 변동·이상·다음 주 권고를 함께 작성한 한 장 KPI 리포트를 매주 임원진에 발송합니다.",
        "level": "★★", "time": "60분", "prereq": "KPI 적재된 Google Sheet + Gemini API 키",
        "for_starter": False, "tool": "/auto/tools/kpi-comment/",
        "tool_label": "KPI 코멘트 즉시 생성 (15초)",
    },
    "hr/01-onboarding-kit": {
        "section": "HR", "tag": "HR-01", "short_id": "4",
        "title": "신규 입사자 온보딩 키트",
        "summary": "합격자 한 줄 입력 → 환영 메일·90일 체크리스트·1on1 캘린더·Slack 공지 자동 생성.",
        "level": "★★", "time": "60분", "prereq": "구글 Workspace + Docs 템플릿 2개 + (선택) Slack",
        "for_starter": True, "tool": "/auto/tools/onboarding-kit/",
        "tool_label": "환영 키트 즉시 생성 (20초)",
    },
    "hr/02-leave-approval-workflow": {
        "section": "HR", "tag": "HR-02", "short_id": "5",
        "title": "휴가 신청 슬랙 승인 워크플로우",
        "summary": "Form → 팀장 Slack 승인 카드 → 캘린더·연차 잔여 시트 자동 갱신.",
        "level": "★★★", "time": "90분", "prereq": "Slack App(Bot Token) + Form + 팀장 Slack ID 매핑",
        "for_starter": False, "tool": "/auto/tools/leave-summary/",
        "tool_label": "휴가 신청 정리 도구 (15초)",
    },
    "hr/03-pulse-survey-sentiment": {
        "section": "HR", "tag": "HR-03", "short_id": "6",
        "title": "분기 펄스서베이 + AI 감성 분석",
        "summary": "응답 1,000건도 30분 안에. 식별 정보는 AI에 전달되지 않도록 분리 설계.",
        "level": "★★", "time": "45분", "prereq": "Google Form + Gemini API 키",
        "for_starter": False, "tool": "/auto/tools/pulse-analysis/",
        "tool_label": "설문 응답 즉시 분석 (30~60초)",
    },
    "marketing/01-content-calendar-generator": {
        "section": "마케팅", "tag": "MKT-01", "short_id": "7",
        "title": "30일 콘텐츠 캘린더 자동 생성",
        "summary": "월 테마 한 줄 → 30일치 채널별 헤드라인·후크·CTA·해시태그 자동 채움.",
        "level": "★", "time": "30분", "prereq": "구글 계정 + Gemini API 키",
        "for_starter": True, "tool": "/auto/tools/content-calendar/",
        "tool_label": "30일 캘린더 즉시 생성 (30~60초)",
    },
    "marketing/02-lead-scoring-router": {
        "section": "마케팅", "tag": "MKT-02", "short_id": "8",
        "title": "인입 리드 자동 스코어링·배정",
        "summary": "룰 60% + AI 40%로 0~100점 스코어링, Hot/Warm/Cold 등급별 담당자 Slack 카드 발송.",
        "level": "★★", "time": "60분", "prereq": "Google Form + Gemini API 키 + Slack Bot",
        "for_starter": False, "tool": "/auto/tools/lead-scoring/",
        "tool_label": "리드 점수 즉시 계산 (15초)",
    },
    "marketing/03-review-mention-digest": {
        "section": "마케팅", "tag": "MKT-03", "short_id": "9",
        "title": "리뷰·멘션 주간 다이제스트",
        "summary": "네이버 블로그·카페·뉴스 멘션 자동 수집. 부정 멘션은 24시간 안에 즉시 알림.",
        "level": "★★", "time": "45분", "prereq": "네이버 검색 API 키 + Gemini API 키",
        "for_starter": False, "tool": "/auto/tools/mention-classifier/",
        "tool_label": "멘션 즉시 분류 (30~60초)",
    },
}

OG_IMAGE = "https://www.nedabah.org/assets/og-automation-9.svg"
SITE_BASE = "https://www.nedabah.org"
COURSE_TITLE = "조직 자동화 9선"
COURSE_SUBTITLE = "기획·HR·마케팅 — 누구나 30분"
AUTHOR = "김창환"
SITE_NAME = "네다바웨이"
