#!/usr/bin/env python3
"""OG 메타 정합성 검증 — 16개 페이지 일괄.

검사 항목:
  - og:title, og:description, og:url, og:type, og:image, og:locale 6개 필수
  - og:url 형식: https://www.nedabah.org/ 시작 + 페이지 실제 경로 일치
  - og:image가 가리키는 SVG 파일이 로컬에 실제 존재
  - og:title 길이 ≤ 60자 (한글 기준)
  - og:description 길이 60~160자 (벗어나면 WARN)
  - canonical == og:url
  - twitter:card / twitter:title / twitter:description (있다면) OG와 충돌 없음

출력: 페이지별 OK/WARN/FAIL 표.
종료: FAIL 1건이라도 있으면 exit 1, WARN만이면 exit 0.

Usage: python3 scripts/check-og.py
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_BASE = "https://www.nedabah.org"

# (파일경로, 기대 URL 경로 — canonical/og:url 비교용)
PAGES = [
    ("index.html",                                "/"),
    ("auto/start/index.html",                     "/auto/start/"),
    ("auto/tools/index.html",                     "/auto/tools/"),
    ("auto/history/index.html",                   "/auto/history/"),
    ("privacy.html",                              "/privacy.html"),
    ("auto/tools/meeting-actions/index.html",     "/auto/tools/meeting-actions/"),
    ("auto/tools/news-digest/index.html",         "/auto/tools/news-digest/"),
    ("auto/tools/kpi-comment/index.html",         "/auto/tools/kpi-comment/"),
    ("auto/tools/onboarding-kit/index.html",      "/auto/tools/onboarding-kit/"),
    ("auto/tools/leave-summary/index.html",       "/auto/tools/leave-summary/"),
    ("auto/tools/pulse-analysis/index.html",      "/auto/tools/pulse-analysis/"),
    ("auto/tools/resume-screening/index.html",    "/auto/tools/resume-screening/"),
    ("auto/tools/content-calendar/index.html",    "/auto/tools/content-calendar/"),
    ("auto/tools/lead-scoring/index.html",        "/auto/tools/lead-scoring/"),
    ("auto/tools/mention-classifier/index.html",  "/auto/tools/mention-classifier/"),
    ("auto/tools/sales-followup/index.html",      "/auto/tools/sales-followup/"),
    ("auto/tools/mail-reply-drafter/index.html",  "/auto/tools/mail-reply-drafter/"),
]

REQUIRED_OG = ("og:title", "og:description", "og:url", "og:type", "og:image", "og:locale")
TITLE_MAX = 60
DESC_MIN = 60
DESC_MAX = 160


@dataclass
class Result:
    page: str
    expected_path: str
    fails: list[str] = field(default_factory=list)
    warns: list[str] = field(default_factory=list)

    @property
    def status(self) -> str:
        if self.fails:
            return "FAIL"
        if self.warns:
            return "WARN"
        return "OK"


def extract_meta(html: str) -> dict[str, str]:
    """og:* / twitter:* / canonical 모두 추출. (key → value)"""
    out: dict[str, str] = {}
    # og:* and twitter:* via property/name attribute
    for m in re.finditer(
        r'<meta\s+(?:property|name)="((?:og|twitter):[^"]+)"\s+content="([^"]*)"',
        html, re.IGNORECASE,
    ):
        out[m.group(1).lower()] = m.group(2)
    # 또한 content="..." property="..." 순서가 바뀐 케이스
    for m in re.finditer(
        r'<meta\s+content="([^"]*)"\s+(?:property|name)="((?:og|twitter):[^"]+)"',
        html, re.IGNORECASE,
    ):
        out[m.group(2).lower()] = m.group(1)
    # canonical
    cm = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', html, re.IGNORECASE)
    if cm:
        out["canonical"] = cm.group(1)
    return out


def check_page(file_rel: str, expected_path: str) -> Result:
    r = Result(page=file_rel, expected_path=expected_path)
    p = ROOT / file_rel
    if not p.exists():
        r.fails.append(f"파일 없음: {file_rel}")
        return r
    html = p.read_text(encoding="utf-8")
    meta = extract_meta(html)

    # 1. 6개 필수 og:*
    for k in REQUIRED_OG:
        if k not in meta or not meta[k].strip():
            r.fails.append(f"누락: {k}")

    # 2. og:url 형식 + 경로 일치
    og_url = meta.get("og:url", "")
    expected_url = SITE_BASE + expected_path
    if og_url and not og_url.startswith(SITE_BASE + "/"):
        r.fails.append(f'og:url 형식: "{og_url}" (https://www.nedabah.org/ 로 시작해야 함)')
    if og_url and og_url != expected_url:
        r.fails.append(f"og:url 경로 불일치: {og_url} ≠ {expected_url}")

    # 3. og:image 로컬 SVG 존재
    og_img = meta.get("og:image", "")
    if og_img:
        if og_img.startswith(SITE_BASE + "/"):
            local = og_img[len(SITE_BASE):].lstrip("/")
            local_path = ROOT / local
            if not local_path.exists():
                r.fails.append(f"og:image 파일 없음: {local}")
        else:
            r.warns.append(f"og:image 외부 절대 URL: {og_img}")

    # 4. og:title 길이
    og_title = meta.get("og:title", "")
    if og_title and len(og_title) > TITLE_MAX:
        r.warns.append(f"og:title 길이 {len(og_title)}자 (권장 ≤ {TITLE_MAX})")

    # 5. og:description 길이
    og_desc = meta.get("og:description", "")
    if og_desc:
        n = len(og_desc)
        if n < DESC_MIN:
            r.warns.append(f"og:description 길이 {n}자 (권장 {DESC_MIN}~{DESC_MAX}, 너무 짧음)")
        elif n > DESC_MAX:
            r.warns.append(f"og:description 길이 {n}자 (권장 {DESC_MIN}~{DESC_MAX}, 너무 김)")

    # 6. canonical == og:url
    canonical = meta.get("canonical", "")
    if canonical and og_url and canonical != og_url:
        r.fails.append(f"canonical ≠ og:url: {canonical} vs {og_url}")
    if not canonical:
        r.warns.append("canonical 링크 없음 (권장)")

    # 7. twitter:* 충돌 없음 (있을 때만)
    tw_card = meta.get("twitter:card", "")
    if tw_card and tw_card not in ("summary", "summary_large_image", "app", "player"):
        r.warns.append(f"twitter:card 비표준 값: {tw_card}")
    tw_title = meta.get("twitter:title", "")
    if tw_title and og_title and tw_title != og_title:
        # Twitter title이 OG와 다를 수 있음(허용) — 단순 정보용 경고로만
        r.warns.append(f"twitter:title ≠ og:title (의도적이면 무시): {tw_title!r} vs {og_title!r}")
    tw_desc = meta.get("twitter:description", "")
    if tw_desc and og_desc and tw_desc != og_desc:
        r.warns.append(f"twitter:description ≠ og:description (의도적이면 무시)")
    tw_image = meta.get("twitter:image", "")
    if tw_image and og_img and tw_image != og_img:
        r.fails.append(f"twitter:image ≠ og:image: {tw_image} vs {og_img}")

    return r


def main() -> None:
    results = [check_page(file_rel, exp) for file_rel, exp in PAGES]

    # 표 출력
    width = max(len(r.page) for r in results)
    print(f"\n{'PAGE'.ljust(width)}  STATUS  ISSUES")
    print("-" * (width + 8 + 40))
    for r in results:
        line = f"{r.page.ljust(width)}  {r.status:6}  "
        if r.status == "OK":
            line += "—"
        else:
            issues = []
            for f in r.fails:
                issues.append(f"FAIL: {f}")
            for w in r.warns:
                issues.append(f"WARN: {w}")
            line += " | ".join(issues)
        print(line)

    n_fail = sum(1 for r in results if r.fails)
    n_warn = sum(1 for r in results if r.warns and not r.fails)
    n_ok = sum(1 for r in results if r.status == "OK")
    print(f"\n총 {len(results)}개: OK {n_ok} / WARN {n_warn} / FAIL {n_fail}")

    if n_fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
