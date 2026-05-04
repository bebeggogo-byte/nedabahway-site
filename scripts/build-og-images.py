#!/usr/bin/env python3
"""Generate unified Open Graph SVG images for 12 tools + 4 system pages.

Output: assets/og/{slug}.svg (1200x630)

Design: 좌측에 큰 도구 한글명, 그 아래 1줄 요약. 우상단 "네다바웨이" 워드마크.
        좌측 색띠. 사이트 팔레트(#3a322a, #b45309, #fbf6ec) 사용.
        텍스트는 SVG <text> (이미지 아님). Pretendard → 시스템 fallback.

Usage: python3 scripts/build-og-images.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "og"
OUT.mkdir(parents=True, exist_ok=True)

# (slug, title, summary, kind) — kind: 'tool' or 'system'
ITEMS = [
    # 12 tools
    ("meeting-actions",   "회의록 → 액션아이템",  "회의록을 붙이면 결정·할일·담당자가 정리됩니다", "tool"),
    ("news-digest",       "경쟁사·뉴스 다이제스트", "키워드 → RSS 후보 + 다이제스트 미리보기", "tool"),
    ("kpi-comment",       "주간 KPI 코멘트",        "KPI 표 → 변화·우려·다음 주 권고 한 문장씩", "tool"),
    ("onboarding-kit",    "입사자 환영 키트",       "환영 메일 + 90일 체크리스트 + Slack 공지", "tool"),
    ("leave-summary",     "휴가 신청 정리",          "자유 텍스트 → 표 + 캘린더·Slack 카드", "tool"),
    ("pulse-analysis",    "설문 응답 분석",          "익명 응답 → 감성·주제 + 1페이지 코멘트", "tool"),
    ("resume-screening",  "이력서 5분 스크리닝",    "공고+이력서 → 매칭도 + 강점·우려 + 면접 질문", "tool"),
    ("content-calendar",  "30일 콘텐츠 캘린더",     "월 테마 → 30일치 헤드라인·후크·CTA", "tool"),
    ("lead-scoring",      "리드 스코어링",           "리드 정보 → 룰+AI 점수 + 첫 응답 메시지", "tool"),
    ("mention-classifier","리뷰·멘션 분류기",       "멘션 → 감성·주제 + 부정 멘션 즉시 강조", "tool"),
    ("sales-followup",    "세일즈 콜 후속 메일",    "미팅 메모 → 후속 메일 + 다음 단계 + 일정 제안", "tool"),
    ("mail-reply-drafter","메일 답장 초안기",       "받은 메일 + 톤 → 한 줄·짧은·자세한 답장 3종", "tool"),
    # 4 system pages
    ("start",             "시작하기",                "Gemini 키 발급부터 첫 결과까지 4분", "system"),
    ("tools",             "도구 모음",               "12개 미니 앱. 입력 → 결과 → 가져가기", "system"),
    ("privacy",           "개인정보 처리방침",       "자체 서버 없음. 입력은 Gemini로 직접. 보유 0", "system"),
    ("history",           "최근 결과",               "이 단말의 브라우저에 저장된 도구 결과", "system"),
]

# 한글 + 영문 fallback 폰트 스택 (OG 렌더러는 보통 시스템 폰트 사용)
FONT = "'Pretendard', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
FONT_SERIF = "'Noto Serif CJK KR', 'Nanum Myeongjo', serif"

# 한글 텍스트 길이에 따른 폰트 크기 자동 조정
def title_size(s: str) -> int:
    n = len(s)
    if n <= 10: return 84
    if n <= 14: return 72
    if n <= 18: return 60
    return 52

def summary_size(s: str) -> int:
    n = len(s)
    if n <= 22: return 32
    if n <= 30: return 28
    return 24


def build_svg(slug: str, title: str, summary: str, kind: str) -> str:
    bg = "#3a322a"
    accent = "#b45309"
    accent2 = "#d97706"
    light = "#fbf6ec"
    muted = "#cbb89c"

    # 시스템 페이지는 약간 다른 톤(따뜻한 베이지 배경 + 어두운 텍스트)
    if kind == "system":
        bg_main = light
        title_color = "#3a322a"
        summary_color = "#6a604f"
        wordmark_color = accent
        label_color = accent
        stripe = accent
    else:
        bg_main = bg
        title_color = light
        summary_color = muted
        wordmark_color = light
        label_color = accent2
        stripe = accent

    ts = title_size(title)
    ss = summary_size(summary)

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="{title} — 네다바웨이">
  <rect width="1200" height="630" fill="{bg_main}"/>
  <rect x="0" y="0" width="14" height="630" fill="{stripe}"/>
  <text x="80" y="120" font-family="{FONT}" font-size="22" font-weight="700" letter-spacing="6" fill="{label_color}">{'TOOL · 네다바웨이' if kind == 'tool' else 'NEDABAH · 네다바웨이'}</text>
  <text x="80" y="280" font-family="{FONT_SERIF}" font-size="{ts}" font-weight="700" fill="{title_color}">{title}</text>
  <text x="80" y="370" font-family="{FONT}" font-size="{ss}" font-weight="500" fill="{summary_color}">{summary}</text>
  <text x="80" y="560" font-family="{FONT}" font-size="20" font-weight="700" fill="{wordmark_color}">김창환</text>
  <text x="170" y="560" font-family="{FONT}" font-size="18" font-weight="400" fill="{summary_color}">· nedabah.org/auto</text>
</svg>
'''


def main() -> None:
    for slug, title, summary, kind in ITEMS:
        svg = build_svg(slug, title, summary, kind)
        out_path = OUT / f"{slug}.svg"
        out_path.write_text(svg, encoding="utf-8")
        print(f"WROTE {out_path.relative_to(ROOT)} ({len(svg)} bytes)")


if __name__ == "__main__":
    main()
