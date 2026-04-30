#!/usr/bin/env python3
"""관점 노트 102편 끝에 '관련 글 3편' 자동 링크.

규칙: 같은 디렉터리에서 파일명 기반 인접 3편 (이전 1편 + 이후 1편 + 무작위 1편).
멱등.
"""
from __future__ import annotations
import argparse
import re
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PERSPECTIVE_DIR = ROOT / "blog" / "perspective"

MARKER_BEGIN = "<!-- BEGIN seo_patches: related_links -->"
MARKER_END = "<!-- END seo_patches: related_links -->"

TITLE_RE = re.compile(r"<title>\s*([^<]+?)\s*</title>", re.IGNORECASE)


def title_of(p: Path) -> str:
    try:
        html = p.read_text(encoding="utf-8")
        m = TITLE_RE.search(html)
        if m:
            t = re.split(r"[—|·\|]", m.group(1), maxsplit=1)[0].strip()
            return t or p.stem
    except Exception:
        pass
    return p.stem


def pick_related(files: list[Path], idx: int) -> list[Path]:
    n = len(files)
    picks = []
    if idx > 0:
        picks.append(files[idx - 1])
    if idx + 1 < n:
        picks.append(files[idx + 1])
    pool = [f for i, f in enumerate(files) if i != idx and f not in picks]
    if pool:
        random.seed(idx)
        picks.append(random.choice(pool))
    return picks[:3]


def render_block(related: list[Path]) -> str:
    items = []
    for r in related:
        url = f"/blog/perspective/{r.name}"
        items.append(f'<li><a href="{url}">{title_of(r)}</a></li>')
    inner = "\n      ".join(items)
    return (
        f"{MARKER_BEGIN}\n"
        f'<aside class="related-posts" style="margin-top:3rem;padding:1.5rem;'
        f'border-top:2px solid #e5d8c4;background:transparent;max-width:680px;">'
        f'<h3 style="font-size:.95rem;font-weight:600;letter-spacing:.04em;'
        f'color:#7a6f5e;margin:0 0 .8rem 0;">함께 읽으면 좋은 관점 노트</h3>'
        f'<ul style="list-style:none;padding:0;margin:0;font-size:.92rem;line-height:1.85;">\n'
        f'      {inner}\n'
        f'    </ul></aside>\n'
        f"{MARKER_END}"
    )


def patch_file(p: Path, related: list[Path], dry: bool) -> str:
    html = p.read_text(encoding="utf-8")
    block = render_block(related)
    pat = re.compile(re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END), re.DOTALL)
    if pat.search(html):
        new_html = pat.sub(block, html)
    elif "</main>" in html:
        new_html = html.replace("</main>", block + "\n</main>", 1)
    elif "</body>" in html:
        new_html = html.replace("</body>", block + "\n</body>", 1)
    else:
        return f"skip: {p.name}"
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
    for i, f in enumerate(files):
        related = pick_related(files, i)
        msg = patch_file(f, related, args.dry_run)
        if msg.startswith("patched") or msg.startswith("would-patch"):
            patched += 1
    print(f"---\ntotal: {patched}/{len(files)}")


if __name__ == "__main__":
    main()
