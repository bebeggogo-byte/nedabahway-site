#!/usr/bin/env python3
"""apply-revisit-wiring.py — SPEC-REVISIT-001 site-wide PWA + analytics wiring.

The static site has no shared HTML <head> include; page heads are per-page and
are produced by several independent generators. To reach 100% coverage of the
re-visit surface (the SPEC-DISCOVERY-001 frozen public page set) with one
mechanism, this script idempotently injects a single re-visit <head> block into
every public page just before </head>:

  - <link rel="manifest" href="/manifest.webmanifest">   (REQ-RV-004)
  - <script src="/assets/analytics.js" defer></script>   (REQ-RV-009 + the
        service-worker registration and funnel-event instrumentation that
        analytics.js performs — REQ-RV-007, REQ-RV-011)

Idempotency: a page already carrying the BLOCK_MARKER is skipped. A page that
already declares rel="manifest" or already loads analytics.js (e.g. the ~16
pages wired before this SPEC) has only the missing pieces added, so no peer
inconsistency and no duplicate tags result.

Re-run after future page additions to keep the PWA wired site-wide
(spec-anchored lifecycle note).

Usage:  python3 scripts/apply-revisit-wiring.py [--check]
  --check : report coverage without writing (CI / audit mode).

Surface source: .moai/specs/SPEC-DISCOVERY-001/public-pages.txt
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SURFACE = ROOT / ".moai/specs/SPEC-DISCOVERY-001/public-pages.txt"

# Re-visit-surface pages that are NOT in the indexed public-pages.txt (they
# carry noindex) but still belong to the S4 re-visit surface and must be wired.
EXTRA_SURFACE = ["subscribed-thanks.html"]

BLOCK_MARKER = "<!-- SPEC-REVISIT-001 re-visit wiring -->"
MANIFEST_TAG = '<link rel="manifest" href="/manifest.webmanifest">'
ANALYTICS_TAG = '<script src="/assets/analytics.js" defer></script>'


def public_pages() -> list[Path]:
    """Read the frozen public page set, skipping comments and blanks."""
    pages: list[Path] = []
    for line in SURFACE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        pages.append(ROOT / line)
    return pages


def build_block(has_manifest: bool, has_analytics: bool) -> str:
    """Assemble the wiring block, omitting pieces a page already carries."""
    lines = [BLOCK_MARKER]
    if not has_manifest:
        lines.append(MANIFEST_TAG)
    if not has_analytics:
        lines.append(ANALYTICS_TAG)
    return "\n".join(lines) + "\n"


def patch(path: str, check: bool) -> str:
    """Return one of: 'ok', 'patched', 'missing', 'no-head', 'skip'."""
    p = ROOT / path
    if not p.is_file():
        return "missing"
    html = p.read_text(encoding="utf-8")

    has_manifest = 'rel="manifest"' in html
    has_analytics = "assets/analytics.js" in html
    fully_wired = has_manifest and has_analytics

    if BLOCK_MARKER in html and fully_wired:
        return "skip"  # already done by a prior run
    if fully_wired:
        return "skip"  # wired before this SPEC; nothing to add

    if "</head>" not in html:
        return "no-head"

    if check:
        return "patched"  # would patch

    block = build_block(has_manifest, has_analytics)
    # Insert immediately before the first </head>, preserving everything else.
    html = html.replace("</head>", block + "</head>", 1)
    p.write_text(html, encoding="utf-8")
    return "patched"


def main() -> int:
    check = "--check" in sys.argv
    if not SURFACE.is_file():
        print(f"ERROR: surface file not found: {SURFACE}", file=sys.stderr)
        return 1

    counts = {"patched": 0, "skip": 0, "missing": 0, "no-head": 0}
    missing: list[str] = []
    nohead: list[str] = []

    surface = [
        ln.strip() for ln in SURFACE.read_text(encoding="utf-8").splitlines()
        if ln.strip() and not ln.strip().startswith("#")
    ] + EXTRA_SURFACE

    for rel in surface:
        result = patch(rel, check)
        counts[result] = counts.get(result, 0) + 1
        if result == "missing":
            missing.append(rel)
        elif result == "no-head":
            nohead.append(rel)

    total = sum(counts.values())
    verb = "would patch" if check else "patched"
    print(f"re-visit wiring — {total} public pages")
    print(f"  {verb}: {counts['patched']}")
    print(f"  already wired (skipped): {counts['skip']}")
    if counts["missing"]:
        print(f"  MISSING files: {counts['missing']}  -> {missing}")
    if counts["no-head"]:
        print(f"  NO </head> (manual review): {counts['no-head']}  -> {nohead}")

    # Coverage = every existing page is either patched or already wired.
    failed = counts["missing"] + counts["no-head"]
    if check and counts["patched"]:
        print("  -> --check: some pages not yet wired")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
