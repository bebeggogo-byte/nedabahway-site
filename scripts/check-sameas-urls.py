#!/usr/bin/env python3
"""sameAs URL health check for knowledge panel external profile links.

Reads sameAs arrays from `knowledge-graph.jsonld` and the embedded JSON-LD
patches in `_build/seo_patches/*.json`, deduplicates, then issues a HEAD
(falling back to GET) request to each URL with a real browser User-Agent.

Output: stdout report + optional GitHub Step Summary write.
Exit code: 0 if all URLs return 200/3xx (incl. 401/403/429 which are common
for anti-bot platforms but indicate the URL is live), 1 otherwise.

Usage:
    python3 scripts/check-sameas-urls.py
    python3 scripts/check-sameas-urls.py --json   # machine-readable

Design intent: this is a soft, weekly check. Not part of PR-blocking CI
because LinkedIn/YouTube/Naver actively block automated requests with
401/403/429 and would produce noisy failures in PR gates.
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
TIMEOUT = 15
RETRY = 2
ALIVE_CODES = {200, 201, 204, 301, 302, 303, 304, 307, 308, 401, 403, 429}


def collect_sameas() -> list[str]:
    urls: set[str] = set()

    kg = ROOT / "knowledge-graph.jsonld"
    if kg.exists():
        data = json.loads(kg.read_text(encoding="utf-8"))
        for node in data.get("@graph", []):
            for u in node.get("sameAs", []) or []:
                if u.startswith("http"):
                    urls.add(u)

    patch_dir = ROOT / "_build" / "seo_patches"
    if patch_dir.exists():
        for p in patch_dir.glob("*.json"):
            try:
                d = json.loads(p.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            same_as = d.get("sameAs", [])
            for u in same_as:
                if isinstance(u, str) and u.startswith("http"):
                    urls.add(u)

    # Exclude self-references — only check external profile URLs
    return sorted(u for u in urls if "nedabah.org" not in u)


def probe(url: str) -> tuple[int, str]:
    last_err = ""
    for attempt in range(RETRY + 1):
        try:
            req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return r.status, "HEAD"
        except urllib.error.HTTPError as e:
            if e.code in ALIVE_CODES:
                return e.code, "HEAD (errcode)"
            last_err = f"HTTPError {e.code}"
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_err = f"{type(e).__name__}: {e}"
        if attempt < RETRY:
            time.sleep(2 ** attempt)

    for attempt in range(RETRY + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return r.status, "GET"
        except urllib.error.HTTPError as e:
            if e.code in ALIVE_CODES:
                return e.code, "GET (errcode)"
            last_err = f"HTTPError {e.code}"
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_err = f"{type(e).__name__}: {e}"
        if attempt < RETRY:
            time.sleep(2 ** attempt)

    return 0, last_err or "unknown"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="emit JSON report")
    args = parser.parse_args()

    urls = collect_sameas()
    if not urls:
        print("no external sameAs URLs found", file=sys.stderr)
        return 0

    results = []
    for u in urls:
        status, method = probe(u)
        results.append({"url": u, "status": status, "method": method})

    failed = [r for r in results if r["status"] not in ALIVE_CODES]

    if args.json:
        print(json.dumps({"results": results, "failed_count": len(failed)}, indent=2, ensure_ascii=False))
    else:
        for r in results:
            mark = "OK " if r["status"] in ALIVE_CODES else "FAIL"
            print(f"  [{mark}] {r['status']:>3}  {r['method']:<14}  {r['url']}")
        print()
        print(f"Total: {len(results)}  |  Failed: {len(failed)}")

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        lines = ["# sameAs URL Health Check", "", f"- Total: {len(results)}", f"- Failed: {len(failed)}", "", "| Status | Method | URL |", "|--:|--|--|"]
        for r in results:
            lines.append(f"| {r['status']} | {r['method']} | `{r['url']}` |")
        Path(summary).write_text("\n".join(lines) + "\n", encoding="utf-8")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
