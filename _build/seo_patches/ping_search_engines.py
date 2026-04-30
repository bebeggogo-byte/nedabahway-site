#!/usr/bin/env python3
"""검색 엔진 인덱스 알림 — 2026 표준.

2023년 이후 Google·Bing의 sitemap ping endpoint는 deprecated.
현재 표준은:
  1) sitemap.xml 의 <lastmod> 태그를 정확히 유지 → 크롤러가 자동 감지
  2) IndexNow API (Bing/Yandex/Naver Beta 지원) — 새 URL 직접 통보
  3) Google Search Console API (OAuth 토큰 필요, 본 스크립트에서는 미구현)
  4) Naver Search Advisor (수동 등록만 가능)

본 스크립트는 (1) sitemap lastmod 자동 갱신 + (2) IndexNow ping 두 가지를 자동화.

사용:
    python3 ping_search_engines.py                            # 기본 (sitemap touch + indexnow if key)
    python3 ping_search_engines.py --indexnow-key=KEY        # IndexNow key 명시
    python3 ping_search_engines.py --no-touch                 # sitemap touch 생략
    python3 ping_search_engines.py --quiet

생성: 2026-05-01 (Google/Bing ping deprecation 대응)
"""
from __future__ import annotations
import argparse
import json
import sys
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent.parent
LOG_DIR = Path.home() / "Scripts" / "agent" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "search_ping.log"
KEY_FILE = Path.home() / ".config" / "nedabah" / "indexnow_key.txt"

SITEMAPS = [
    ROOT / "sitemap.xml",
    ROOT / "resources" / "sitemap.xml",
]

PRIORITY_URLS = [
    "https://www.nedabah.org/",
    "https://www.nedabah.org/about.html",
    "https://www.nedabah.org/blog/perspective/",
    "https://www.nedabah.org/learning.html",
    "https://www.nedabah.org/resources/",
    "https://www.nedabah.org/llms.txt",
    "https://www.nedabah.org/llms-full.txt",
]


def touch_homepage_lastmod() -> bool:
    """sitemap.xml에서 / (홈) 의 lastmod 만 오늘 날짜로 갱신.

    크롤러가 사이트 갱신을 빨리 인지하도록 가벼운 lastmod 펄스만 발생시킴.
    다른 URL의 lastmod는 건드리지 않음 (정확성 유지).
    """
    today = datetime.now().strftime("%Y-%m-%d")
    sm = SITEMAPS[0]
    if not sm.exists():
        return False
    text = sm.read_text(encoding="utf-8")
    pat = re.compile(
        r"(<url><loc>https://www\.nedabah\.org/</loc><lastmod>)\d{4}-\d{2}-\d{2}(</lastmod>)"
    )
    new_text = pat.sub(rf"\g<1>{today}\g<2>", text, count=1)
    if new_text != text:
        sm.write_text(new_text, encoding="utf-8")
        return True
    return False


def load_indexnow_key(cli: str) -> str:
    if cli:
        return cli
    if KEY_FILE.exists():
        return KEY_FILE.read_text(encoding="utf-8").strip()
    return ""


def indexnow_ping(key: str, urls: list[str]) -> dict:
    if not key:
        return {"engine": "indexnow", "ok": False, "error": "no key"}
    payload = {
        "host": "www.nedabah.org",
        "key": key,
        "keyLocation": f"https://www.nedabah.org/{key}.txt",
        "urlList": urls,
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.indexnow.org/indexnow",
            data=data,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"engine": "indexnow", "status": resp.status, "ok": resp.status in (200, 202)}
    except Exception as e:
        return {"engine": "indexnow", "ok": False, "error": str(e)}


def log_results(results: list, touched: bool):
    line = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "homepage_touched": touched,
        "results": results,
    }
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(line, ensure_ascii=False) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--indexnow-key", default="")
    ap.add_argument("--no-touch", action="store_true")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    touched = False
    if not args.no_touch:
        touched = touch_homepage_lastmod()

    key = load_indexnow_key(args.indexnow_key)
    results = []
    if key:
        results.append(indexnow_ping(key, PRIORITY_URLS))
    else:
        results.append({"engine": "indexnow", "ok": False, "error": "no key (touch only mode)"})

    log_results(results, touched)
    if not args.quiet:
        print(f"  homepage lastmod touched: {touched}")
        for r in results:
            mark = "ok" if r.get("ok") else "skip" if r.get("error") == "no key (touch only mode)" else "fail"
            print(f"  [{mark}] {r.get('engine')} status={r.get('status')} {r.get('error','')}")
    sys.exit(0)


if __name__ == "__main__":
    main()
