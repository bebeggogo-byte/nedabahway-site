#!/usr/bin/env python3
"""Apply the Neural Dark pack to an Obsidian vault.

Usage:
    python3 apply.py /path/to/vault              # full apply
    python3 apply.py /path/to/vault --snippet-only   # skip graph.json patch
    python3 apply.py /path/to/vault --dry-run        # show what would change

Behavior:
    1. Validates the path is an Obsidian vault (has .obsidian/)
    2. Copies snippets/graph-neural-dark.css into <vault>/.obsidian/snippets/
    3. Enables the snippet via <vault>/.obsidian/appearance.json
    4. Backs up graph.json to graph.json.bak.<timestamp>
    5. Merges recommended performance fields into graph.json
       (preserves user-set search, colorGroups, and unknown fields)
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

SNIPPET_NAME = "graph-neural-dark"

RECOMMENDED_GRAPH_FIELDS: dict = {
    "showOrphans": False,
    "showAttachments": False,
    "hideUnresolved": True,
    "showArrow": False,
    "textFadeMultiplier": 0.5,
    "nodeSizeMultiplier": 1.1,
    "lineSizeMultiplier": 0.85,
    "centerStrength": 0.5,
    "repelStrength": 8,
    "linkStrength": 0.8,
    "linkDistance": 220,
}

PRESERVE_FIELDS: set[str] = {
    "search",
    "colorGroups",
    "showTags",
    "collapse-filter",
    "collapse-color-groups",
    "collapse-display",
    "collapse-forces",
    "scale",
    "close",
}


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def validate_vault(vault: Path) -> Path:
    if not vault.exists():
        die(f"vault path does not exist: {vault}")
    if not vault.is_dir():
        die(f"vault path is not a directory: {vault}")
    obsidian_dir = vault / ".obsidian"
    if not obsidian_dir.is_dir():
        die(
            f"no .obsidian/ folder found at {vault} — "
            f"is this really an Obsidian vault root?"
        )
    return obsidian_dir


def install_snippet(obsidian_dir: Path, source_css: Path, dry_run: bool) -> None:
    snippets_dir = obsidian_dir / "snippets"
    target = snippets_dir / f"{SNIPPET_NAME}.css"
    print(f"[snippet] {source_css.name} -> {target}")
    if dry_run:
        return
    snippets_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_css, target)


def enable_snippet(obsidian_dir: Path, dry_run: bool) -> None:
    appearance = obsidian_dir / "appearance.json"
    data: dict = {}
    if appearance.exists():
        try:
            data = json.loads(appearance.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            die(f"appearance.json is corrupt: {e}")
    enabled = data.get("enabledCssSnippets", []) or []
    if SNIPPET_NAME in enabled:
        print(f"[appearance] {SNIPPET_NAME} already enabled")
        return
    enabled.append(SNIPPET_NAME)
    data["enabledCssSnippets"] = enabled
    print(f"[appearance] enabling {SNIPPET_NAME} in appearance.json")
    if dry_run:
        return
    appearance.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def backup_graph(graph_path: Path, dry_run: bool) -> Path | None:
    if not graph_path.exists():
        return None
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = graph_path.with_suffix(f".json.bak.{ts}")
    print(f"[backup] {graph_path.name} -> {backup.name}")
    if not dry_run:
        shutil.copyfile(graph_path, backup)
    return backup


def patch_graph_json(obsidian_dir: Path, dry_run: bool) -> None:
    graph_path = obsidian_dir / "graph.json"
    existing: dict = {}
    if graph_path.exists():
        try:
            existing = json.loads(graph_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            die(f"graph.json is corrupt: {e}")
    backup_graph(graph_path, dry_run)

    changes: list[str] = []
    merged = dict(existing)
    for key, recommended in RECOMMENDED_GRAPH_FIELDS.items():
        current = existing.get(key, "<unset>")
        if current == recommended:
            continue
        merged[key] = recommended
        changes.append(f"  {key}: {current!r} -> {recommended!r}")

    for key in PRESERVE_FIELDS:
        if key in existing and key not in merged:
            merged[key] = existing[key]

    if not changes:
        print("[graph.json] already matches recommendations")
        return

    print("[graph.json] applying:")
    for line in changes:
        print(line)

    if not dry_run:
        graph_path.write_text(
            json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8"
        )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("vault", type=Path, help="path to your Obsidian vault root")
    ap.add_argument(
        "--snippet-only",
        action="store_true",
        help="install + enable CSS snippet but do not touch graph.json",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="print what would change without writing files",
    )
    args = ap.parse_args()

    vault = args.vault.expanduser().resolve()
    obsidian_dir = validate_vault(vault)

    pack_root = Path(__file__).resolve().parent
    source_css = pack_root / "snippets" / f"{SNIPPET_NAME}.css"
    if not source_css.is_file():
        die(f"snippet source missing: {source_css}")

    print(f"vault: {vault}")
    if args.dry_run:
        print("(dry run — no files will be written)")

    install_snippet(obsidian_dir, source_css, args.dry_run)
    enable_snippet(obsidian_dir, args.dry_run)

    if not args.snippet_only:
        patch_graph_json(obsidian_dir, args.dry_run)

    print("\nNext: in Obsidian, fully close and reopen the graph view")
    print("(or restart the app) so the canvas picks up the new colors")
    print("and graph.json values.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
