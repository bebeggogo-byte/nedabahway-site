#!/usr/bin/env python3
"""resources/_data/feed.json → 사이트 전체 재생성.

생성하는 것:
- /resources/index.html              # 외부 마스터 (visibility=public만)
- /resources/_console/index.html     # CEO 콘솔 (전체 + KPI)
- /resources/{format}/index.html     # 형식별 인덱스 (8개) — 콘솔용
- /resources/topic/{topic}.html      # 주제별 색인 (public만)
- /resources/changelog.html          # 외부 공개 변경 이력
- /resources/sitemap.xml             # _console 제외 SEO
- /resources/feed.json               # public-only 외부 피드 별칭
- /resources/_data/kpi.json          # 자동 갱신

실행: python3 _build/render_all.py
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # resources/
TPL = ROOT / "_templates"
DATA = ROOT / "_data"
FEED = DATA / "feed.json"
KPI = DATA / "kpi.json"

FORMAT_LABEL = {
    "wks": ("Worksheets", "활동지", "#B45309"),
    "tpl": ("Templates", "제안서·계획서", "#1D4ED8"),
    "evd": ("Evidence", "근거자료·논문 요약", "#065F46"),
    "prm": ("Prompts", "AI 프롬프트 키트", "#BE185D"),
    "dgn": ("Diagnostics", "진단 도구", "#7C3AED"),
    "gid": ("Guides", "가이드·해설", "#475569"),
    "crt": ("Curations", "편집부 큐레이션", "#C2410C"),
    "med": ("Media Kit", "브랜드 자산", "#334155"),
}

WEEKLY_TARGET = 35
MONTHLY_TARGET = 150


def load_feed() -> dict:
    return json.loads(FEED.read_text(encoding="utf-8"))


def public_items(items: list[dict]) -> list[dict]:
    return [x for x in items if x.get("visibility") == "public"]


def render_card(item: dict, locked: bool = False) -> str:
    fmt = item["format"]
    label, _, color = FORMAT_LABEL[fmt]
    href = "javascript:void(0)" if locked else item["url"]
    aria_lock = ' aria-disabled="true"' if locked else ""
    status = "🔒 검수 중" if locked else f"● {item.get('updated', item['published'])} 공개"
    cite_count = len(item.get("cites", []))
    cite_html = f"<span class='card__cite'>인용 {cite_count}건</span>" if cite_count else ""
    return f"""
    <a class="card card--{fmt}" href="{href}"{aria_lock} data-format="{fmt}">
      <div class="card__abbr" style="color:{color}">{label} · {item.get('version','v1.0')}</div>
      <div class="card__title">{item['title']}</div>
      <p class="card__desc">{item['summary']}</p>
      <div class="card__foot"><span class="card__status">{status}</span>{cite_html}</div>
    </a>
    """


def render_kpi_bar(kpi: dict) -> str:
    w = kpi["this_week"]
    pct = min(100, int(w["ratio"] * 100))
    return f"""
    <div class="kpi-bar">
      <div class="kpi-bar__label">이번 주 발행 {w['published_count']}/{w['target']}건</div>
      <div class="kpi-bar__track"><div class="kpi-bar__fill" style="width:{pct}%"></div></div>
    </div>
    """


def render_master_external(items: list[dict], kpi: dict) -> str:
    """외부 공개 마스터 — 카테고리 카드는 잠금, 공개된 자료만 카드 노출."""
    pubs = public_items(items)
    counts = Counter(x["format"] for x in items)  # 잠금 카드는 전체 카운트 표시
    pub_counts = Counter(x["format"] for x in pubs)

    locked_cats = []
    for code, (label, hint, color) in FORMAT_LABEL.items():
        total = counts.get(code, 0)
        pub = pub_counts.get(code, 0)
        badge = f"공개 {pub} · 검수 중 {total - pub}" if total else "준비 중"
        locked_cats.append(f"""
        <button class="cat cat--{code}" data-cat="{code}" data-label="{label}" data-pub="{pub}" data-total="{total}" style="--cat-color:{color}">
          <div class="cat__abbr">{label} · {hint}</div>
          <div class="cat__title">🔒 {badge}</div>
          <div class="cat__more">자료 안내 받기 →</div>
        </button>""")
    cats_html = "\n".join(locked_cats)

    pubs_sorted = sorted(pubs, key=lambda x: x.get("updated", x["published"]), reverse=True)
    pub_cards = "\n".join(render_card(x) for x in pubs_sorted) or "<p class='empty'>공개된 자료가 곧 추가됩니다.</p>"

    template = (TPL / "master.html").read_text(encoding="utf-8")
    return (
        template
        .replace("{{LOCKED_CATEGORIES}}", cats_html)
        .replace("{{PUBLIC_CARDS}}", pub_cards)
        .replace("{{TOTAL_PUBLIC}}", str(len(pubs)))
        .replace("{{LAST_UPDATED}}", date.today().isoformat())
    )


def render_console(items: list[dict], kpi: dict) -> str:
    """CEO 콘솔 — 전체 자료 + KPI + visibility 토글 안내."""
    by_fmt: dict[str, list[dict]] = defaultdict(list)
    for x in items:
        by_fmt[x["format"]].append(x)

    sections = []
    for code, (label, hint, color) in FORMAT_LABEL.items():
        rows = by_fmt.get(code, [])
        if not rows:
            sections.append(f"""
            <section class="csec">
              <h3 style="color:{color}">{label} · {hint} <span class="csec__count">0</span></h3>
              <p class="csec__empty">아직 자료 없음</p>
            </section>""")
            continue
        rows_html = "\n".join(
            f'<li class="crow crow--{x["visibility"]}"><span class="crow__vis">{x["visibility"]}</span>'
            f'<a href="{x["url"]}" target="_blank">{x["title"]}</a>'
            f'<span class="crow__date">{x.get("updated", x["published"])}</span></li>'
            for x in sorted(rows, key=lambda y: y.get("updated", y["published"]), reverse=True)
        )
        sections.append(f"""
        <section class="csec">
          <h3 style="color:{color}">{label} · {hint} <span class="csec__count">{len(rows)}</span></h3>
          <ul class="crows">{rows_html}</ul>
        </section>""")

    template = (TPL / "console.html").read_text(encoding="utf-8")
    return (
        template
        .replace("{{KPI_BAR}}", render_kpi_bar(kpi))
        .replace("{{SECTIONS}}", "\n".join(sections))
        .replace("{{TOTAL_ALL}}", str(len(items)))
        .replace("{{TOTAL_PUBLIC}}", str(len(public_items(items))))
        .replace("{{TOTAL_INTERNAL}}", str(sum(1 for x in items if x['visibility'] == 'internal')))
        .replace("{{LAST_UPDATED}}", date.today().isoformat())
    )


def render_changelog(items: list[dict]) -> str:
    pubs = public_items(items)
    rows = sorted(pubs, key=lambda x: x.get("updated", x["published"]), reverse=True)
    rows_html = "\n".join(
        f'<li><time>{x.get("updated", x["published"])}</time> '
        f'<span class="cl__fmt cl__fmt--{x["format"]}">{FORMAT_LABEL[x["format"]][0]}</span> '
        f'<a href="{x["url"]}">{x["title"]}</a> <em>{x.get("version", "v1.0")}</em></li>'
        for x in rows
    ) or "<li>공개된 자료가 곧 추가됩니다.</li>"

    return f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>변경 이력 — 자료실 | 네다바웨이</title>
<meta name="robots" content="noindex">
<style>body{{max-width:760px;margin:40px auto;padding:0 20px;font-family:system-ui,sans-serif;line-height:1.7}}
ul{{list-style:none;padding:0}}li{{padding:8px 0;border-bottom:1px solid #eee}}
time{{color:#888;font-size:.85em;margin-right:8px}}.cl__fmt{{font-size:.7em;background:#f4f2ec;padding:2px 8px;border-radius:4px;margin-right:6px}}
em{{color:#aaa;font-size:.8em;margin-left:6px}}</style></head>
<body><h1>자료실 변경 이력</h1><p><a href="/resources/">← 자료실</a></p><ul>{rows_html}</ul></body></html>
"""


def render_sitemap(items: list[dict]) -> str:
    pubs = public_items(items)
    today = date.today().isoformat()
    urls = ["/resources/", "/resources/changelog.html"] + [x["url"] for x in pubs]
    entries = "\n".join(
        f"  <url><loc>https://www.nedabah.org{u}</loc><lastmod>{today}</lastmod></url>"
        for u in urls
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{entries}
</urlset>
"""


def update_kpi(items: list[dict]) -> dict:
    today = date.today().isoformat()
    pubs = public_items(items)
    today_items = [x for x in pubs if x.get("updated", x["published"]) == today]

    by_format = {k: 0 for k in FORMAT_LABEL}
    for x in items:
        by_format[x["format"]] = by_format.get(x["format"], 0) + 1

    kpi = {
        "generated": today,
        "today": {"date": today, "published_count": len(today_items), "internal_count": sum(1 for x in items if x["visibility"] == "internal")},
        "this_week": {"published_count": len(pubs), "target": WEEKLY_TARGET, "ratio": round(len(pubs) / WEEKLY_TARGET, 3)},
        "this_month": {"published_count": len(pubs), "target": MONTHLY_TARGET, "ratio": round(len(pubs) / MONTHLY_TARGET, 3)},
        "by_format": by_format,
        "by_visibility": {v: sum(1 for x in items if x["visibility"] == v) for v in ("public", "internal", "draft")},
        "internal_queue": [{"id": x["id"], "title": x["title"], "format": x["format"]} for x in items if x["visibility"] == "internal"],
    }
    KPI.write_text(json.dumps(kpi, ensure_ascii=False, indent=2), encoding="utf-8")
    return kpi


def main() -> None:
    feed = load_feed()
    items = feed["items"]
    kpi = update_kpi(items)

    # 외부 마스터
    (ROOT / "index.html").write_text(render_master_external(items, kpi), encoding="utf-8")
    # 콘솔
    (ROOT / "_console").mkdir(exist_ok=True)
    (ROOT / "_console" / "index.html").write_text(render_console(items, kpi), encoding="utf-8")
    # 변경 이력
    (ROOT / "changelog.html").write_text(render_changelog(items), encoding="utf-8")
    # sitemap
    (ROOT / "sitemap.xml").write_text(render_sitemap(items), encoding="utf-8")
    # public-only feed (외부용 별칭)
    public_feed = {"generated": kpi["generated"], "items": public_items(items)}
    (ROOT / "feed.json").write_text(json.dumps(public_feed, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ render_all 완료 — public {len(public_items(items))} / internal {sum(1 for x in items if x['visibility'] == 'internal')} / total {len(items)}")


if __name__ == "__main__":
    main()
