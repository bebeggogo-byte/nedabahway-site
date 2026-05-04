#!/usr/bin/env python3
"""Convert resources/automation/**/*.md to styled HTML pages matching site theme.

Usage: python3 scripts/build-automation-pages.py
Output: HTML next to each .md, in resources/automation/{section}/{slug}.html
"""
from __future__ import annotations

import re
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
AUTO_DIR = ROOT / "resources" / "automation"

CARDS = {
    "planning/01-meeting-notes-to-actions": {
        "section": "기획",
        "tag": "PLAN-01",
        "title": "회의록 → 액션아이템 자동 정리",
        "summary": "Google Doc 한 장을 던지면 AI가 결정사항·할일·담당자·기한을 추출해 시트·Slack에 적재합니다.",
    },
    "planning/02-competitor-news-digest": {
        "section": "기획",
        "tag": "PLAN-02",
        "title": "경쟁사·뉴스 일일 다이제스트",
        "summary": "매일 새벽 RSS·키워드를 수집·요약해 메일/Slack 한 장 다이제스트로 발송합니다.",
    },
    "planning/03-weekly-kpi-report": {
        "section": "기획",
        "tag": "PLAN-03",
        "title": "주간 KPI 자동 리포트",
        "summary": "AI가 변동·이상·다음 주 권고를 함께 작성한 한 장 KPI 리포트를 매주 임원진에 발송합니다.",
    },
    "hr/01-onboarding-kit": {
        "section": "HR",
        "tag": "HR-01",
        "title": "신규 입사자 온보딩 키트",
        "summary": "합격자 한 줄 입력 → 환영 메일·90일 체크리스트·1on1 캘린더·Slack 공지 자동 생성.",
    },
    "hr/02-leave-approval-workflow": {
        "section": "HR",
        "tag": "HR-02",
        "title": "휴가 신청 슬랙 승인 워크플로우",
        "summary": "Form → 팀장 Slack 승인 카드 → 캘린더·연차 잔여 시트 자동 갱신.",
    },
    "hr/03-pulse-survey-sentiment": {
        "section": "HR",
        "tag": "HR-03",
        "title": "분기 펄스서베이 + AI 감성 분석",
        "summary": "응답 1,000건도 30분 안에. 식별 정보는 AI에 전달되지 않도록 분리 설계.",
    },
    "marketing/01-content-calendar-generator": {
        "section": "마케팅",
        "tag": "MKT-01",
        "title": "30일 콘텐츠 캘린더 자동 생성",
        "summary": "월 테마 한 줄 → 30일치 채널별 헤드라인·후크·CTA·해시태그 자동 채움.",
    },
    "marketing/02-lead-scoring-router": {
        "section": "마케팅",
        "tag": "MKT-02",
        "title": "인입 리드 자동 스코어링·배정",
        "summary": "룰 60% + AI 40%로 0~100점 스코어링, Hot/Warm/Cold 등급별 담당자 Slack 카드 발송.",
    },
    "marketing/03-review-mention-digest": {
        "section": "마케팅",
        "tag": "MKT-03",
        "title": "리뷰·멘션 주간 다이제스트",
        "summary": "네이버 블로그·카페·뉴스 멘션 자동 수집. 부정 멘션은 24시간 안에 즉시 알림.",
    },
}

PAGE_TPL = """<!DOCTYPE html>
<html lang="ko">
<head>
<link rel="stylesheet" href="/assets/nedabah.bundle.css">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} — 자동화 9선 | 네다바웨이</title>
<meta name="description" content="{summary}">
<link rel="canonical" href="https://www.nedabah.org{canonical}">
<meta property="og:title" content="{title} — 자동화 9선">
<meta property="og:description" content="{summary}">
<meta property="og:url" content="https://www.nedabah.org{canonical}">
<meta property="og:type" content="article">
<meta name="keywords" content="{section} 자동화, Apps Script, Gemini, 노코드, {tag}">

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "{title}",
  "description": "{summary}",
  "url": "https://www.nedabah.org{canonical}",
  "inLanguage": "ko-KR",
  "tool": ["Google Apps Script","Google Sheets","Gemini API","Slack"],
  "publisher": {{"@id": "https://www.nedabah.org/#organization"}}
}}
</script>

<style>
.guide-body {{ font-family:'Noto Sans KR',sans-serif; line-height:1.8; color:#222; max-width:780px; margin:3rem auto; padding:0 1.5rem; }}
.guide-body h1 {{ font-family:'Noto Serif KR',serif; font-size:2rem; line-height:1.3; margin:.4rem 0 1rem; }}
.guide-body h2 {{ font-size:1.35rem; margin-top:2.5rem; padding-left:.6rem; border-left:4px solid #b45309; color:#3a322a; }}
.guide-body h3 {{ font-size:1.1rem; margin-top:1.6rem; color:#3a322a; }}
.guide-body h4 {{ font-size:1rem; margin-top:1.2rem; color:#6a604f; }}
.guide-body blockquote {{ background:#fbf6ec; border-left:4px solid #b45309; padding:.6rem 1.2rem; color:#3a322a; margin:1rem 0; border-radius:0 8px 8px 0; }}
.guide-body table {{ width:100%; border-collapse:collapse; margin:1rem 0; font-size:.95rem; }}
.guide-body th {{ background:#fbf6ec; text-align:left; padding:.55rem .7rem; border-bottom:2px solid #e5d8c4; }}
.guide-body td {{ padding:.5rem .7rem; border-bottom:1px solid #eee; vertical-align:top; }}
.guide-body code {{ background:#f3eee2; padding:.1rem .35rem; border-radius:4px; font-family:'JetBrains Mono','Menlo',monospace; font-size:.92em; }}
.guide-body pre {{ background:#1f1a14; color:#f5e9d4; padding:1rem 1.2rem; border-radius:8px; overflow-x:auto; line-height:1.55; font-size:.86rem; }}
.guide-body pre code {{ background:transparent; color:inherit; padding:0; }}
.guide-body ul, .guide-body ol {{ line-height:1.8; }}
.guide-body a {{ color:#b45309; }}
.tag-pill {{ display:inline-block; font-size:.72rem; letter-spacing:.14em; font-weight:700; padding:.22rem .6rem; border-radius:99px; background:#fbf6ec; color:#b45309; border:1px solid #e5d8c4; }}
.guide-meta {{ color:#6a604f; font-size:.92rem; margin-top:.4rem; }}
.related-aside {{ margin:3rem auto 4rem; max-width:780px; padding:1.6rem 1.8rem; background:#fbf6ec; border-radius:12px; }}
.related-aside h2 {{ margin-top:0; font-size:1.05rem; border:none; padding:0; }}
.related-aside ul {{ list-style:none; padding:0; line-height:2; }}
</style>
</head>
<body>
<nav class="gnav" role="navigation" aria-label="주요 메뉴">
  <div class="gnav__inner">
    <a href="/" class="gnav__logo">네다바웨이</a>
    <ul class="gnav__links">
      <li><a href="/lectures/" class="gnav__link">강의 목록</a></li>
      <li><a href="/resources/automation/" class="gnav__link">자동화 허브</a></li>
      <li><a href="/about.html" class="gnav__link">소개</a></li>
      <li><a href="/contact.html" class="gnav__cta">강의 의뢰 →</a></li>
    </ul>
  </div>
</nav>

<header style="max-width:780px;margin:3rem auto 0;padding:0 1.5rem;font-family:'Noto Sans KR',sans-serif;">
  <p style="font-size:.78rem;color:#b45309;letter-spacing:.18em;font-weight:700;">RESOURCE · {section_upper} 자동화 · <span class="tag-pill">{tag}</span></p>
</header>

<article class="guide-body">
{body}
</article>

<aside class="related-aside">
  <h2>이 자동화와 함께 보면 좋은 자료</h2>
  <ul>
    <li>→ <a href="/resources/automation/">자동화 9선 자료 허브로 돌아가기</a></li>
    <li>→ <a href="/lectures/business-automation.html">강의 페이지: 조직 업무 자동화 실무 9선</a></li>
    <li>→ <a href="/contact.html">조직 맞춤 워크숍 의뢰</a></li>
  </ul>
</aside>

<footer style="max-width:780px;margin:0 auto 4rem;padding:1.5rem;border-top:1px solid #e5d8c4;font-size:.85rem;color:#8a7a64;font-family:'Noto Sans KR',sans-serif;">
  <p>김창환 · 네다바웨이 · 제주 출발 전국 출강 · <a href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a></p>
</footer>
</body>
</html>
"""


def render(md_text: str) -> str:
    """Render markdown to HTML with code/table extensions."""
    return markdown.markdown(
        md_text,
        extensions=[
            "fenced_code",
            "tables",
            "sane_lists",
            "attr_list",
            "toc",
        ],
        output_format="html5",
    )


def main() -> None:
    for slug, meta in CARDS.items():
        md_path = AUTO_DIR / f"{slug}.md"
        if not md_path.exists():
            print(f"SKIP missing: {md_path}")
            continue
        body_html = render(md_path.read_text(encoding="utf-8"))
        # Drop the first H1 because the file starts with "# Title" we already
        # showcase as breadcrumb tag. Replace first <h1>..</h1> with empty.
        body_html = re.sub(r"<h1[^>]*>.*?</h1>", "", body_html, count=1, flags=re.DOTALL)
        page = PAGE_TPL.format(
            title=meta["title"],
            summary=meta["summary"],
            section=meta["section"],
            section_upper=meta["section"].upper(),
            tag=meta["tag"],
            canonical=f"/resources/automation/{slug}.html",
            body=body_html,
        )
        # Insert title as h1 inside guide-body so styled correctly
        page = page.replace(
            '<article class="guide-body">\n',
            f'<article class="guide-body">\n<h1>{meta["title"]}</h1>\n<p class="guide-meta">{meta["summary"]}</p>\n',
            1,
        )
        out_path = AUTO_DIR / f"{slug}.html"
        out_path.write_text(page, encoding="utf-8")
        print(f"WROTE {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
