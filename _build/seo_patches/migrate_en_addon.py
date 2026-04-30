#!/usr/bin/env python3
"""영문 보조 1회 일괄 — 관점 노트 102편 끝에 영문 인용 + 영문 abstract 추가.

새 글에는 publisher가 자동 추가, 기존 글에는 본 스크립트가 1회 마이그레이션.
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PERSPECTIVE_DIR = ROOT / "blog" / "perspective"

# refinery_squad 의 en_addons 모듈을 import
sys.path.insert(0, str(Path.home() / "Scripts"))
from agent.refinery_squad.seo_rules.en_addons import append_en_block, pick_quote, en_abstract_for

MARKER_BEGIN = "<!-- BEGIN seo_patches: en_addon -->"
MARKER_END = "<!-- END seo_patches: en_addon -->"

DATE_TOPIC_RE = re.compile(r"\d{4}-\d{2}-\d{2}_([^_\.]+)")
TITLE_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.IGNORECASE | re.DOTALL)


def extract_topic(fname: str) -> str:
    m = DATE_TOPIC_RE.search(fname)
    return m.group(1) if m else fname


def extract_title(html: str, fname: str) -> str:
    m = TITLE_RE.search(html)
    if m:
        return re.sub(r"<[^>]+>", "", m.group(1)).strip()
    return fname


def patch_file(p: Path, dry: bool) -> str:
    html = p.read_text(encoding="utf-8")
    topic = extract_topic(p.name)
    title = extract_title(html, p.name)
    quote = pick_quote(topic)
    abstract = en_abstract_for(topic, title)

    en_block = (
        f'{MARKER_BEGIN}\n'
        f'<div class="en-addon" style="margin-top:2.5rem;padding-top:1.2rem;'
        f'border-top:1px dashed #d0c8b6;font-size:.85rem;color:#7a6f5e;max-width:680px;">'
        f'<p style="margin:0 0 .4rem 0;"><strong>EN</strong> — {abstract}</p>'
        f'<p style="margin:0;font-style:italic;">— {quote}</p>'
        f"</div>\n"
        f"{MARKER_END}"
    )

    pat = re.compile(re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END), re.DOTALL)
    if pat.search(html):
        new_html = pat.sub(en_block, html)
    else:
        # </main> 직전 또는 </body> 직전에 삽입
        if "</main>" in html:
            new_html = html.replace("</main>", en_block + "\n</main>", 1)
        elif "</body>" in html:
            new_html = html.replace("</body>", en_block + "\n</body>", 1)
        else:
            return f"no </main></body>: {p.name}"

    if new_html == html:
        return f"unchanged: {p.name}"
    if dry:
        return f"would-patch: {p.name}"
    p.write_text(new_html, encoding="utf-8")
    return f"patched: {p.name}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = [f for f in sorted(PERSPECTIVE_DIR.glob("*.html")) if f.name != "index.html"]
    print(f"target files: {len(files)}")

    patched = 0
    for f in files:
        msg = patch_file(f, args.dry_run)
        if msg.startswith("patched") or msg.startswith("would-patch"):
            patched += 1
    print(f"---\ntotal: {patched}/{len(files)}")


if __name__ == "__main__":
    main()
