#!/usr/bin/env python3
"""
모든 HTML 페이지의 <footer class="foot"> ... </footer> 블록을
단일 미니 footer로 일괄 치환.

- 고유번호 137-82-94771 표기
- 빌드 ID(git short hash) + 빌드 시각 자동 갱신
- _archive*, node_modules 제외
- 최소한의 정보만 (브랜드·고유번호·빌드)
"""
from __future__ import annotations
import os, re, subprocess, datetime, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_DIRS = {"_archive_magazine_old", "_archive_v2", "node_modules", ".git"}

def get_build_id() -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--short=7", "HEAD"],
            cwd=ROOT, capture_output=True, text=True, check=True
        )
        return r.stdout.strip()
    except Exception:
        return "dev"

def get_build_ts() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

def build_footer(build_id: str, build_ts: str) -> str:
    return f'''<footer class="foot foot--mini">
  <style>
    .foot--mini{{padding:18px 20px;border-top:1px solid #e5e7eb;background:#fafaf7;font-size:12px;color:#666;line-height:1.6}}
    .foot--mini .foot--mini__inner{{max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;align-items:center}}
    .foot--mini a{{color:#444;text-decoration:none;border-bottom:1px dotted #bbb}}
    .foot--mini a:hover{{color:#4f46e5;border-color:#4f46e5}}
    .foot--mini .foot--mini__build{{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#888}}
    @media(max-width:680px){{
      .foot--mini .foot--mini__inner{{justify-content:flex-start}}
      .foot--mini>div>span{{display:block}}
    }}
  </style>
  <div class="foot--mini__inner">
    <span>© 2026 <strong>네다바웨이</strong> · 김창환 · <a href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a></span>
    <span>고유번호 <strong>137-82-94771</strong></span>
    <span class="foot--mini__build">build {build_id} · {build_ts}</span>
  </div>
</footer>'''

# <footer class="foot"...>...</footer> 통째 치환
PATTERN = re.compile(
    r'<footer\s+class="foot[^"]*"[^>]*>.*?</footer>',
    re.DOTALL | re.IGNORECASE,
)

def should_skip(p: Path) -> bool:
    parts = set(p.parts)
    return bool(parts & EXCLUDE_DIRS)

def main():
    build_id = get_build_id()
    build_ts = get_build_ts()
    new_footer = build_footer(build_id, build_ts)
    print(f"[apply_mini_footer] build_id={build_id} ts={build_ts}")

    targets = [p for p in ROOT.rglob("*.html") if not should_skip(p.relative_to(ROOT))]
    print(f"[apply_mini_footer] candidates={len(targets)}")

    # 미니 footer 표식 (재실행 시 idempotent)
    MARK = '<footer class="foot foot--mini">'

    changed = 0
    skipped_already = 0
    skipped_no_body = 0
    for p in targets:
        try:
            txt = p.read_text(encoding="utf-8")
        except Exception as e:
            print(f"  ! read fail {p}: {e}")
            continue

        # 1) 기존 foot footer (모든 변종) 전부 제거
        cleared = PATTERN.sub("", txt)
        # 2) </body> 미존재 시 스킵 (HTML 단편 partial 등)
        if "</body>" not in cleared:
            skipped_no_body += 1
            continue
        # 3) 새 미니 footer를 </body> 직전에 등록
        new_txt = cleared.replace("</body>", new_footer + "\n\n</body>", 1)

        if new_txt == txt:
            skipped_already += 1
            continue
        p.write_text(new_txt, encoding="utf-8")
        changed += 1

    print(f"[apply_mini_footer] changed={changed} already={skipped_already} no_body={skipped_no_body}")

if __name__ == "__main__":
    main()
