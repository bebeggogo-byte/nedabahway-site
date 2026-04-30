#!/usr/bin/env python3
"""inject_search_widget.py — render_all.py 빌드 후 자료실 마스터에 검색 위젯 주입 (2026-05-01, B)

흐름:
  render_all.py가 resources/index.html 자동 생성 → 매번 덮어쓰기됨
  → 본 스크립트가 빌드 직후 호출되어 검색 위젯 link 태그 주입
  → publish.py에 통합

idempotent: 이미 주입돼 있으면 스킵.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    ROOT / "resources" / "index.html",
    ROOT / "resources" / "worksheets" / "index.html",
    ROOT / "resources" / "evidence" / "index.html",
    ROOT / "resources" / "guides" / "index.html",
    ROOT / "resources" / "curations" / "index.html",
    ROOT / "resources" / "diagnostics" / "index.html",
    ROOT / "resources" / "prompts" / "index.html",
    ROOT / "resources" / "templates" / "index.html",
]

WIDGET_TAG = '<script src="/assets/resources-search-v1.js" defer></script>'


def inject(path: Path) -> str:
    if not path.exists():
        return "skip-missing"
    content = path.read_text(encoding="utf-8")
    if "resources-search-v1.js" in content:
        return "skip-exists"
    if "</head>" not in content:
        return "skip-no-head"
    new = content.replace("</head>", WIDGET_TAG + "\n</head>", 1)
    path.write_text(new, encoding="utf-8")
    return "ok"


def main() -> int:
    results = {"ok": 0, "skip-missing": 0, "skip-exists": 0, "skip-no-head": 0}
    for t in TARGETS:
        r = inject(t)
        results[r] = results.get(r, 0) + 1
    print(f"✓ inject_search_widget — ok {results['ok']} / 기존 {results['skip-exists']} / 없음 {results['skip-missing']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
