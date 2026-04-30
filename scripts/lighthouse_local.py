#!/usr/bin/env python3
"""lighthouse_local.py — 로컬 Lighthouse 시뮬레이션 (2026-05-01)

목적: GitHub Actions 가동 전, 로컬에서 100점 점수 추정.
실제 Chromium 없이도 정적 HTML 분석으로 SEO·A11y·BP 점수 simulate.

사용:
    python3 scripts/lighthouse_local.py                 # 모든 메인 페이지
    python3 scripts/lighthouse_local.py --page index    # 특정 페이지

출력: 0~100점 4개 카테고리 + 개선 액션 목록
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent

# 메인 페이지 목록
MAIN_PAGES = [
    "index.html", "about.html", "programs.html", "magazine.html",
    "learning.html", "iden.html", "contact.html", "cases.html",
    "404.html",
]

# === SEO 검사 항목 ===
SEO_CHECKS = [
    ("title 태그", r"<title>([^<]{10,70})</title>", "title 10~70자"),
    ("meta description", r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']{50,160})', "description 50~160자"),
    ("canonical", r'<link\s+rel=["\']canonical["\']', "canonical 링크"),
    ("og:title", r'<meta\s+property=["\']og:title', "og:title"),
    ("og:description", r'<meta\s+property=["\']og:description', "og:description"),
    ("og:image", r'<meta\s+property=["\']og:image', "og:image"),
    ("twitter:card", r'<meta\s+name=["\']twitter:card', "twitter:card"),
    ("html lang", r'<html\s+[^>]*lang=["\']ko', "html lang=ko"),
    ("viewport", r'<meta\s+name=["\']viewport', "viewport meta"),
    ("schema.org", r'application/ld\+json', "JSON-LD schema.org"),
    ("h1 단일", r"<h1[\s>]", "h1 1개 이상"),
]

# === Accessibility 검사 ===
A11Y_CHECKS = [
    ("html lang", r'<html\s+[^>]*lang=', "html lang 속성"),
    ("페이지 제목", r"<title>[^<]+</title>", "title 비어있지 않음"),
    ("이미지 alt", r"<img\b(?!.*\salt=)", "alt 누락 (False positive)"),
    ("폼 라벨", r"<input\b(?![^>]*aria-label)(?![^>]*aria-labelledby)", "form label"),
    ("스킵 링크", r"skip-link|#main", "스킵 링크 (선택)"),
]

# === Best Practices ===
BP_CHECKS = [
    ("HTTPS only", r"http://(?!localhost)", "http:// 외부 링크 없음"),
    ("doctype", r"^<!DOCTYPE\s+html", "doctype 선언"),
    ("charset utf-8", r'<meta\s+charset=["\']?utf-8', "UTF-8 charset"),
    ("외부 script crossorigin", None, "외부 script (정책)"),
]

# === Performance hints ===
PERF_CHECKS = [
    ("CSS 외부 로드 수", "css_count", "외부 CSS ≤ 6개"),
    ("JS 외부 로드 수", "js_count", "외부 JS ≤ 5개"),
    ("HTML 크기", "html_size_kb", "HTML ≤ 100KB"),
    ("이미지 width/height", r"<img\b(?!.*\swidth=)", "img width/height"),
    ("script defer/async", r"<script\b(?!.*\s(?:defer|async|type=))", "동기 script 차단"),
]


def score_page(html: str) -> dict[str, Any]:
    """단일 페이지를 분석해서 4축 점수와 issue 목록 반환."""
    out: dict[str, Any] = {
        "scores": {"seo": 0, "a11y": 0, "best_practices": 0, "performance": 0},
        "issues": [],
        "metrics": {},
    }

    # 메타 정보
    out["metrics"]["html_size_kb"] = round(len(html) / 1024, 1)
    out["metrics"]["css_count"] = len(re.findall(r'<link\s+[^>]*rel=["\']stylesheet', html))
    out["metrics"]["js_count"] = len(re.findall(r"<script\s+[^>]*src=", html))
    out["metrics"]["inline_style_blocks"] = len(re.findall(r"<style[\s>]", html))

    # SEO 점수 (각 항목 100/N)
    seo_pass = 0
    for label, pattern, desc in SEO_CHECKS:
        if pattern and re.search(pattern, html, re.IGNORECASE | re.MULTILINE):
            seo_pass += 1
        else:
            out["issues"].append(f"[SEO] {desc} 누락")
    out["scores"]["seo"] = round(seo_pass / len(SEO_CHECKS) * 100)

    # A11y
    a11y_pass = 0
    a11y_total = len(A11Y_CHECKS)
    if re.search(r'<html\s+[^>]*lang=', html):
        a11y_pass += 1
    else:
        out["issues"].append("[A11y] html lang 누락")
    if re.search(r"<title>[^<]+</title>", html):
        a11y_pass += 1
    else:
        out["issues"].append("[A11y] title 누락")
    # alt 누락 이미지 검출
    no_alt = re.findall(r"<img\b(?!.*\salt=)[^>]*>", html)
    if not no_alt:
        a11y_pass += 1
    else:
        out["issues"].append(f"[A11y] alt 누락 img {len(no_alt)}건")
    # 폼 input label
    inputs_no_label = re.findall(
        r'<input\b(?![^>]*type=["\'](?:hidden|submit|button|search)["\'])(?![^>]*aria-label)[^>]*>',
        html
    )
    if len(inputs_no_label) <= 1:
        a11y_pass += 1
    else:
        out["issues"].append(f"[A11y] aria-label 누락 input {len(inputs_no_label)}건")
    # skip link 또는 main landmark
    if re.search(r"skip-link|<main\b|role=[\"']main[\"']", html):
        a11y_pass += 1
    else:
        out["issues"].append("[A11y] main landmark 또는 스킵 링크 권장")
    out["scores"]["a11y"] = round(a11y_pass / a11y_total * 100)

    # Best Practices
    bp_pass = 0
    bp_total = 4
    if not re.search(r"http://(?!localhost|127\.0\.0\.1)[^\"'\s]", html):
        bp_pass += 1
    else:
        out["issues"].append("[BP] http:// 외부 링크 검출")
    if re.search(r"^<!DOCTYPE\s+html", html, re.IGNORECASE):
        bp_pass += 1
    else:
        out["issues"].append("[BP] doctype 누락")
    if re.search(r'<meta\s+charset=["\']?utf-8', html, re.IGNORECASE):
        bp_pass += 1
    else:
        out["issues"].append("[BP] UTF-8 charset 누락")
    # console.log 검출 (production HTML에 있으면 안 좋음)
    if "console.log" not in html:
        bp_pass += 1
    else:
        out["issues"].append("[BP] console.log 잔존")
    out["scores"]["best_practices"] = round(bp_pass / bp_total * 100)

    # Performance — 메트릭 기반
    perf_score = 100
    if out["metrics"]["html_size_kb"] > 100:
        perf_score -= 15
        out["issues"].append(f"[Perf] HTML {out['metrics']['html_size_kb']}KB (목표 ≤100KB)")
    if out["metrics"]["css_count"] > 6:
        perf_score -= 10
        out["issues"].append(f"[Perf] 외부 CSS {out['metrics']['css_count']}개 (목표 ≤6)")
    if out["metrics"]["js_count"] > 5:
        perf_score -= 10
        out["issues"].append(f"[Perf] 외부 JS {out['metrics']['js_count']}개 (목표 ≤5)")
    # 동기 script 검사
    sync_scripts = re.findall(
        r"<script\s+(?![^>]*(?:defer|async|type=[\"']module))[^>]*src=",
        html
    )
    if sync_scripts:
        perf_score -= len(sync_scripts) * 3
        out["issues"].append(f"[Perf] 동기 script {len(sync_scripts)}개 (defer/async 권장)")
    # 이미지 width/height
    img_no_size = re.findall(
        r"<img\b(?![^>]*\swidth=)(?![^>]*\sheight=)[^>]*>",
        html
    )
    if img_no_size:
        perf_score -= min(len(img_no_size) * 2, 10)
        out["issues"].append(f"[Perf] width/height 없는 img {len(img_no_size)}개 (CLS 위험)")
    out["scores"]["performance"] = max(0, perf_score)

    return out


def total_score(s: dict) -> float:
    return (s["seo"] + s["a11y"] + s["best_practices"] + s["performance"]) / 4


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--page", help="특정 페이지만 (확장자 없이)")
    ap.add_argument("--detail", action="store_true", help="이슈 상세 출력")
    args = ap.parse_args()

    pages = [args.page + ".html"] if args.page else MAIN_PAGES
    results: list[tuple[str, dict]] = []

    for page in pages:
        path = ROOT / page
        if not path.exists():
            continue
        html = path.read_text(encoding="utf-8")
        result = score_page(html)
        results.append((page, result))

    # 출력
    print(f"\n{'='*70}")
    print(f"  Lighthouse Local Simulation — nedabah.org")
    print(f"{'='*70}\n")
    print(f"{'Page':<28} {'Perf':>6} {'A11y':>6} {'BP':>6} {'SEO':>6} {'Avg':>7}")
    print(f"{'-'*70}")

    avg_total = 0
    for page, r in results:
        s = r["scores"]
        avg = total_score(s)
        avg_total += avg
        print(f"{page:<28} {s['performance']:>6} {s['a11y']:>6} "
              f"{s['best_practices']:>6} {s['seo']:>6} {avg:>7.1f}")

    print(f"{'-'*70}")
    site_avg = avg_total / len(results) if results else 0
    print(f"{'SITE AVERAGE':<28} {' ':>26} {site_avg:>7.1f}")
    print()

    # 이슈 요약
    if args.detail:
        for page, r in results:
            if r["issues"]:
                print(f"\n[{page}]")
                for issue in r["issues"][:10]:
                    print(f"  {issue}")
                metrics = r["metrics"]
                print(f"  metrics: HTML {metrics['html_size_kb']}KB, "
                      f"CSS {metrics['css_count']}, JS {metrics['js_count']}, "
                      f"inline-style {metrics['inline_style_blocks']}")
    else:
        # 요약 — 페이지별 가장 큰 이슈 1건
        print("주요 개선 자리:")
        for page, r in results[:5]:
            if r["issues"]:
                print(f"  {page}: {r['issues'][0]}")

    return 0 if site_avg >= 85 else 1


if __name__ == "__main__":
    sys.exit(main())
