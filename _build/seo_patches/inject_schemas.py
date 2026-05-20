#!/usr/bin/env python3
"""SEO schema 자동 주입 빌더.

이 스크립트는 _build/seo_patches/*.json 의 schema 블록을
지정된 HTML 파일의 </head> 직전에 자동 주입한다.

이미 같은 @id 의 schema가 있으면 교체, 없으면 추가.
멱등(idempotent) — 여러 번 실행해도 결과 동일.

사용:
    python3 _build/seo_patches/inject_schemas.py            # 전체 적용
    python3 _build/seo_patches/inject_schemas.py --dry-run  # 미리보기
    python3 _build/seo_patches/inject_schemas.py --target about.html

생성: 2026-05-01 (AI 검색 노출 마스터 패키지)
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple

ROOT = Path(__file__).resolve().parent.parent.parent  # nedabahway-site/
PATCH_DIR = Path(__file__).resolve().parent

# 페이지별 적용할 schema 파일 목록 (target -> [schema files])
PAGE_SCHEMAS: Dict[str, List[str]] = {
    "about.html": ["person_schema.json", "book_schema.json", "faq_schema.json"],
    "index.html": ["organization_schema.json", "website_schema.json"],
    "blog/perspective/index.html": ["collection_perspective.json"],
    "learning.html": ["collection_learning.json"],
    "resources/index.html": ["collection_resources.json"],
    # Knowledge panel discovery — Person reference on remaining content pages
    "content.html": ["sameas_supplement.json"],
    "korea-seo.html": ["sameas_supplement.json"],
    "newsletter.html": ["sameas_supplement.json"],
    # Cycle 4: high-traffic content pages mentioning 김창환 without Person link
    "magazine.html": ["sameas_supplement.json"],
    "ai.html": ["sameas_supplement.json"],
    "timeline.html": ["sameas_supplement.json"],
}

# 페이지별 breadcrumb trail (target -> [(label, optional href), ...])
# Root "네다바웨이" is implicit position 1. Each entry adds one more level.
# Use None for href when the label is the leaf page (auto-fills with target URL).
PAGE_BREADCRUMBS: Dict[str, List[Tuple[str, str | None]]] = {
    "about.html": [("소개", None)],
    "magazine.html": [("매거진", None)],
    "programs.html": [("프로그램", None)],
    "learning.html": [("학습 노트", None)],
    "contact.html": [("문의", None)],
    "newsletter.html": [("뉴스레터 구독", None)],
    "content.html": [("콘텐츠 카테고리", None)],
    "start.html": [("시작하기", None)],
    "faq.html": [("FAQ", None)],
    "glossary.html": [("용어집", None)],
    "korea-seo.html": [("한국 검색 자리", None)],
    "ai.html": [("AI 작업실", None)],
    "timeline.html": [("타임라인", None)],
}

MARKER_BEGIN = "<!-- BEGIN seo_patches: inject_schemas.py -->"
MARKER_END = "<!-- END seo_patches: inject_schemas.py -->"


def load_schema(name: str) -> dict | None:
    p = PATCH_DIR / name
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def build_breadcrumb(target: str, trail: List[Tuple[str, str | None]]) -> dict:
    items = [{"@type": "ListItem", "position": 1, "name": "네다바웨이", "item": "https://www.nedabah.org/"}]
    for i, (label, href) in enumerate(trail, start=2):
        url = href if href else f"https://www.nedabah.org/{target}"
        items.append({"@type": "ListItem", "position": i, "name": label, "item": url})
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": f"https://www.nedabah.org/{target}#breadcrumb",
        "itemListElement": items,
    }


def render_block(schemas: List[dict]) -> str:
    parts = [MARKER_BEGIN]
    for s in schemas:
        parts.append('<script type="application/ld+json">')
        parts.append(json.dumps(s, ensure_ascii=False, indent=2))
        parts.append("</script>")
    parts.append(MARKER_END)
    return "\n".join(parts)


def patch_file(target: str, schemas: List[dict], dry: bool) -> Tuple[bool, str]:
    fpath = ROOT / target
    if not fpath.exists():
        return False, f"missing: {target}"
    html = fpath.read_text(encoding="utf-8")
    block = render_block(schemas)

    # 기존 marker 블록 제거 후 재삽입
    pat = re.compile(
        re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END),
        re.DOTALL,
    )
    if pat.search(html):
        new_html = pat.sub(block, html)
    else:
        # </head> 직전에 삽입
        if "</head>" not in html:
            return False, f"no </head>: {target}"
        new_html = html.replace("</head>", block + "\n</head>", 1)

    if new_html == html:
        return True, f"unchanged: {target}"
    if dry:
        return True, f"would-patch: {target} (+{len(schemas)} schema)"
    fpath.write_text(new_html, encoding="utf-8")
    return True, f"patched: {target} (+{len(schemas)} schema)"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--target", help="단일 파일만 처리")
    args = ap.parse_args()

    all_targets = set(PAGE_SCHEMAS.keys()) | set(PAGE_BREADCRUMBS.keys())
    if args.target:
        all_targets = {args.target}

    rc = 0
    for target in sorted(all_targets):
        schemas = []
        for sf in PAGE_SCHEMAS.get(target, []):
            s = load_schema(sf)
            if s is None:
                print(f"  [skip] schema file missing: {sf}")
                continue
            schemas.append(s)
        trail = PAGE_BREADCRUMBS.get(target)
        if trail:
            schemas.append(build_breadcrumb(target, trail))
        if not schemas:
            print(f"[no-schema] {target}")
            continue
        ok, msg = patch_file(target, schemas, args.dry_run)
        print(("[ok] " if ok else "[fail] ") + msg)
        if not ok:
            rc = 1
    sys.exit(rc)


if __name__ == "__main__":
    main()
