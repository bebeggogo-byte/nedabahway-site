#!/usr/bin/env python3
"""HowTo + Event + Knowledge Graph link 등 추가 schema 주입.

주입 대상:
- programs.html: Event template (강의 시리즈)
- index.html: Knowledge Graph 링크 (rel=alternate type=application/ld+json)
- 자료실 진단지 페이지가 생기면: HowTo (현재는 about.html 부록 안내에 추가)

manifest 링크는 모든 핵심 페이지에 추가 — 다만 본 빌더는 marker 외부엔 손대지 않으므로
별도 inject_manifest.py 또는 강사님 1회 작업으로.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PATCH_DIR = Path(__file__).resolve().parent

PAGE_SCHEMAS = {
    "programs.html": ["event_template.json"],
    "about.html": ["howto_self_diagnosis.json"],
}

MARKER_BEGIN = "<!-- BEGIN seo_patches: inject_extras.py -->"
MARKER_END = "<!-- END seo_patches: inject_extras.py -->"


def render_block(schemas: list[dict]) -> str:
    parts = [MARKER_BEGIN]
    for s in schemas:
        parts.append('<script type="application/ld+json">')
        parts.append(json.dumps(s, ensure_ascii=False, indent=2))
        parts.append("</script>")
    parts.append(MARKER_END)
    return "\n".join(parts)


def patch_file(target: str, schemas: list[dict], dry: bool):
    fpath = ROOT / target
    if not fpath.exists():
        return False, f"missing: {target}"
    html = fpath.read_text(encoding="utf-8")
    block = render_block(schemas)
    pat = re.compile(re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END), re.DOTALL)
    if pat.search(html):
        new_html = pat.sub(block, html)
    else:
        if "</head>" not in html:
            return False, f"no </head>: {target}"
        new_html = html.replace("</head>", block + "\n</head>", 1)
    if new_html == html:
        return True, f"unchanged: {target}"
    if dry:
        return True, f"would-patch: {target}"
    fpath.write_text(new_html, encoding="utf-8")
    return True, f"patched: {target}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    rc = 0
    for target, files in PAGE_SCHEMAS.items():
        schemas = []
        for sf in files:
            p = PATCH_DIR / sf
            if not p.exists():
                continue
            schemas.append(json.loads(p.read_text(encoding="utf-8")))
        if not schemas:
            continue
        ok, msg = patch_file(target, schemas, args.dry_run)
        print(("[ok] " if ok else "[fail] ") + msg)
        if not ok:
            rc = 1
    sys.exit(rc)


if __name__ == "__main__":
    main()
