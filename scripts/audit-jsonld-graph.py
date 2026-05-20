#!/usr/bin/env python3
"""Aggregate every JSON-LD block across the site and audit cross-reference health.

For knowledge graph quality, every @id reference (creator, author, publisher,
isPartOf, founder, worksFor) should resolve to an actual @id definition
somewhere on the site. Dangling @id references make Google merge incorrectly.

Output: stdout + optional JSON report. Exit 0 if clean, 1 if anomalies.

Usage:
    python3 scripts/audit-jsonld-graph.py
    python3 scripts/audit-jsonld-graph.py --json > audit.json
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_RE = re.compile(
    r'<script type="application/ld\+json">(.*?)</script>', re.DOTALL
)

EXCLUDE_DIRS = {"_archive_v2", "_archive_v2_20", "_archive_magazine_old", "_build", "_archive_magazine_old"}
EXCLUDE_PATH_FRAGMENTS = {"_archive", "/drafts/", "_build/", "_console/", "_data/", "_templates/"}


def find_pages() -> list[Path]:
    paths = []
    for p in ROOT.rglob("*.html"):
        rel = p.relative_to(ROOT).as_posix()
        if any(frag in rel for frag in EXCLUDE_PATH_FRAGMENTS):
            continue
        paths.append(p)
    return paths


def walk_node(node, ids_defined: set[str], ids_referenced: dict[str, set[str]], type_counts: Counter):
    if isinstance(node, dict):
        own_id = node.get("@id")
        own_type = node.get("@type")
        has_real_definition = any(k for k in node if k not in {"@id", "@type", "@context"})
        if own_id and has_real_definition:
            ids_defined.add(own_id)
        if own_id and not has_real_definition:
            # pure reference
            ids_referenced[own_id].add(str(own_type))
        if own_type:
            t = own_type if isinstance(own_type, str) else "|".join(own_type)
            type_counts[t] += 1
        for v in node.values():
            walk_node(v, ids_defined, ids_referenced, type_counts)
    elif isinstance(node, list):
        for v in node:
            walk_node(v, ids_defined, ids_referenced, type_counts)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    pages = find_pages()
    ids_defined: set[str] = set()
    ids_referenced: dict[str, set[str]] = defaultdict(set)
    type_counts: Counter = Counter()
    parse_errors: list[tuple[str, str]] = []
    pages_with_ld = 0
    blocks_total = 0
    person_kim_pages = 0

    for p in pages:
        rel = p.relative_to(ROOT).as_posix()
        try:
            html = p.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            parse_errors.append((rel, f"read-error: {e}"))
            continue
        page_has_kim = False
        page_has_ld = False
        for raw in SCRIPT_RE.findall(html):
            blocks_total += 1
            try:
                node = json.loads(raw)
                page_has_ld = True
                if "kim-changhwan" in raw:
                    page_has_kim = True
                # Handle @graph wrapper
                if isinstance(node, dict) and "@graph" in node:
                    for sub in node["@graph"]:
                        walk_node(sub, ids_defined, ids_referenced, type_counts)
                else:
                    walk_node(node, ids_defined, ids_referenced, type_counts)
            except json.JSONDecodeError as e:
                parse_errors.append((rel, f"json-parse: {e}"))
        if page_has_ld:
            pages_with_ld += 1
        if page_has_kim:
            person_kim_pages += 1

    dangling = sorted(set(ids_referenced) - ids_defined)
    knowledge_graph_ids = sorted(ids_defined)

    if args.json:
        out = {
            "pages_scanned": len(pages),
            "pages_with_jsonld": pages_with_ld,
            "pages_with_person_kim": person_kim_pages,
            "blocks_total": blocks_total,
            "type_counts": dict(type_counts.most_common()),
            "ids_defined_count": len(ids_defined),
            "ids_referenced_count": len(ids_referenced),
            "dangling_references": dangling,
            "parse_errors": parse_errors,
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(f"Pages scanned: {len(pages)}")
        print(f"  with JSON-LD: {pages_with_ld}")
        print(f"  with Person kim-changhwan reference: {person_kim_pages}")
        print(f"JSON-LD blocks total: {blocks_total}")
        print(f"Unique @ids defined: {len(ids_defined)}")
        print(f"Unique @ids referenced: {len(ids_referenced)}")
        print()
        print("Top @types:")
        for t, n in type_counts.most_common(12):
            print(f"  {n:>5}  {t}")
        print()
        if dangling:
            print(f"DANGLING REFERENCES ({len(dangling)}):")
            for d in dangling:
                contexts = sorted(ids_referenced[d])
                print(f"  - {d}  referenced as: {', '.join(contexts)}")
        else:
            print("No dangling @id references. Graph is internally consistent.")
        if parse_errors:
            print()
            print(f"PARSE ERRORS ({len(parse_errors)}):")
            for rel, err in parse_errors[:20]:
                print(f"  - {rel}: {err}")
            if len(parse_errors) > 20:
                print(f"  ... +{len(parse_errors)-20} more")

    return 1 if (dangling or parse_errors) else 0


if __name__ == "__main__":
    sys.exit(main())
