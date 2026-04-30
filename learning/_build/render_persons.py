#!/usr/bin/env python3
"""인물 페이지 빌더 — persons.json → persons/{id}.html + persons.html 인덱스.

호출: python3 learning/_build/render_persons.py
출력:
  - learning/persons/{id}.html  (22명, 1명당 1페이지)
  - learning/persons.html       (22명 카드 그리드 + 4시대×4영역 필터)

기존 render_all.py는 건드리지 않는 별도 빌더 (코드 분리·중복 제거 원칙).
"""
from __future__ import annotations

import html
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent.parent           # learning/
DATA = ROOT / "_data"
PERSONS_DIR = ROOT / "persons"
PERSONS_DIR.mkdir(parents=True, exist_ok=True)

PERSONS = json.loads((DATA / "persons.json").read_text(encoding="utf-8"))
ERAS = json.loads((DATA / "eras.json").read_text(encoding="utf-8"))
NOTES = json.loads((DATA / "notes.json").read_text(encoding="utf-8"))

ERA_LABEL = {e["id"]: f"{e['label']} ({e['span']})" for e in ERAS["eras"]}
ERA_ORDER = [e["id"] for e in ERAS["eras"]]

DOMAIN_LABEL = {
    "theology": "신학·기독교 사상",
    "science": "자연과학·수학",
    "philosophy": "철학",
    "art": "예술 (회화·음악·조각)",
    "culture": "문화·역사·문학",
    "language": "언어·번역",
    "vision": "시각·관찰·공학",
}

CW_LABEL = {
    "affirming": ("신앙 명시", "#0d9488"),
    "theist_compatible": ("유신론 호환", "#0891b2"),
    "wrestling": ("씨름의 자리", "#ca8a04"),
    "secular_christian_heritage": ("세속 · 기독 전통 위에", "#6b7280"),
    "critic": ("비판자", "#7f1d1d"),
}


PAGE_CSS = """
:root{--ink:#1f1f23;--muted:#6b7280;--accent:#b45309;--warm:#d97706;--bg:#fafaf7;--card:transparent;--line:#e5d8c4}
*{box-sizing:border-box}
body{font-family:'Pretendard','Noto Sans KR',sans-serif;background:var(--bg);color:var(--ink);line-height:1.7;margin:0}
.wrap{max-width:880px;margin:0 auto;padding:48px 24px}
.crumb{font-size:13px;color:var(--muted);margin-bottom:16px}
.crumb a{color:var(--accent);text-decoration:none}
h1{font-size:34px;letter-spacing:-.02em;margin:0 0 8px;line-height:1.25}
.subtitle{font-size:15px;color:var(--muted);margin-bottom:28px}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.tag{font-size:12px;padding:4px 12px;border-radius:999px;background:transparent;border:1px solid var(--line);color:#374151}
.tag.cw{color:inherit;background:transparent;border-width:1.5px}
.hero-photo{width:100%;max-height:480px;object-fit:contain;background:#f3eee2;border-radius:14px;border:1px solid var(--line);margin-bottom:24px;display:block}
section{background:transparent;border:1px solid var(--line);border-radius:14px;padding:24px;margin-bottom:18px}
section h2{font-size:18px;margin:0 0 14px;letter-spacing:-.01em}
section p{margin:0 0 12px;font-size:15px}
.works{list-style:none;padding:0;margin:0}
.works li{padding:10px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;font-size:14px}
.works li:last-child{border-bottom:0}
.works .year{color:var(--muted);font-variant-numeric:tabular-nums;flex-shrink:0}
.cites{font-size:13px;color:#374151}
.cites li{margin-bottom:6px}
.related{display:flex;flex-wrap:wrap;gap:8px}
.related a{font-size:13px;padding:6px 12px;border-radius:8px;background:transparent;border:1px solid var(--line);color:#374151;text-decoration:none;transition:border-color .15s,color .15s}
.related a:hover{border-color:var(--accent);color:var(--accent)}
.back{display:inline-block;margin-top:32px;font-size:13px;color:var(--accent);text-decoration:none}
.entries{margin-top:8px}
.entries li{padding:10px 0;border-bottom:1px solid var(--line);font-size:14px}
.entries li:last-child{border-bottom:0}
.entries a{color:var(--accent);text-decoration:none}
.entries a:hover{text-decoration:underline}
"""

INDEX_CSS = """
:root{--ink:#1f1f23;--muted:#6b7280;--accent:#b45309;--warm:#d97706;--bg:#fafaf7;--card:transparent;--line:#e5d8c4}
*{box-sizing:border-box}
body{font-family:'Pretendard','Noto Sans KR',sans-serif;background:var(--bg);color:var(--ink);line-height:1.6;margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:48px 24px}
.crumb{font-size:13px;color:var(--muted);margin-bottom:16px}
.crumb a{color:var(--accent);text-decoration:none}
h1{font-size:36px;letter-spacing:-.02em;margin:0 0 8px}
.lead{font-size:15px;color:var(--muted);margin-bottom:24px;max-width:680px}
.kpi{display:flex;gap:18px;margin-bottom:32px;flex-wrap:wrap}
.kpi .box{background:transparent;border:1px solid var(--line);border-radius:10px;padding:14px 20px;min-width:120px}
.kpi .num{font-size:24px;font-weight:600;color:var(--accent)}
.kpi .lab{font-size:12px;color:var(--muted);margin-top:4px}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.filters button{font-size:13px;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:transparent;color:#374151;cursor:pointer}
.filters button.active{background:transparent;color:var(--accent);border-color:var(--accent);border-width:1.5px}
.matrix{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.card{background:transparent;border:1px solid var(--line);border-radius:14px;padding:0;overflow:hidden;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:0;transition:transform .25s,border-color .25s;position:relative}
.card .imgwrap{aspect-ratio:1/1;background:#f3eee2;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
.card .photo{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;filter:grayscale(.15) contrast(1.04);opacity:.92;transition:opacity .3s ease,filter .3s ease,transform .3s ease;display:block}
.card:hover .photo{opacity:.35;filter:grayscale(.3) contrast(.95) blur(.5px);transform:scale(1.02)}
.card .hover{position:absolute;left:0;right:0;top:0;bottom:auto;height:0;background:linear-gradient(180deg,rgba(250,250,247,.94) 0%,rgba(250,250,247,.98) 100%);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:14px 16px;text-align:center;opacity:0;transition:opacity .3s ease;pointer-events:none}
.card:hover .hover{opacity:1;height:100%;bottom:0}
.card .hover .h-name{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:4px;letter-spacing:-.01em}
.card .hover .h-lived{font-size:11px;color:var(--muted);margin-bottom:8px;font-variant-numeric:tabular-nums}
.card .hover .h-why{font-size:12px;color:#374151;line-height:1.55;margin-bottom:10px}
.card .hover .h-cta{font-size:11px;font-weight:700;color:var(--accent);border:1px solid var(--accent);padding:4px 10px;border-radius:999px;letter-spacing:.04em}
.card .body{padding:14px 16px;display:flex;flex-direction:column;gap:6px;flex-grow:1}
.card:hover{transform:translateY(-2px);border-color:var(--accent);border-width:1.5px}
.card .name{font-size:15px;font-weight:600;letter-spacing:-.01em}
.card .lived{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.card .why{font-size:12px;color:#374151;line-height:1.55;flex-grow:1;display:none}
.card .meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.card .chip{font-size:10px;padding:2px 8px;border-radius:999px;background:transparent;border:1px solid var(--line);color:#4b5563}
.card .chip.cw{color:inherit;background:transparent;border-width:1.5px}
.legend{font-size:12px;color:var(--muted);margin-top:24px}
.legend span{display:inline-block;padding:3px 10px;border-radius:999px;color:inherit;background:transparent;border:1.5px solid currentColor;margin-right:6px;font-size:11px}
.era-section{margin-top:32px}
.era-section h2{font-size:20px;margin:0 0 4px;letter-spacing:-.01em}
.era-section .span{font-size:12px;color:var(--muted);margin-bottom:14px}
"""


def _esc(s: str) -> str:
    return html.escape(str(s or ""), quote=True)


def _entries_for(person_id: str) -> List[Dict]:
    return [n for n in NOTES.get("entries", []) if n.get("person_id") == person_id]


def render_person_page(p: Dict) -> str:
    cw_label, cw_color = CW_LABEL.get(p.get("cw_orientation", ""), ("미분류", "#374151"))
    era = ERA_LABEL.get(p.get("era_id", ""), "")
    domain = DOMAIN_LABEL.get(p.get("domain_id", ""), p.get("domain_id", ""))
    works = "\n".join(
        f"<li><span>{_esc(w.get('title',''))}</span><span class='year'>{_esc(w.get('year',''))}</span></li>"
        for w in p.get("key_works", [])
    )
    sources = "\n".join(f"<li>{_esc(s)}</li>" for s in p.get("primary_sources", []))
    links = p.get("giants_link", [])
    link_lookup = {x["id"]: x.get("name_ko", x["id"]) for x in PERSONS["persons"]}
    related = "\n".join(
        f"<a href='/learning/persons/{lid}.html'>{_esc(link_lookup.get(lid, lid))}</a>"
        for lid in links if lid in link_lookup
    )

    related_entries = _entries_for(p["id"])
    entries_html = ""
    if related_entries:
        items = "\n".join(
            f"<li><a href='{_esc(e.get('url','#'))}'>{_esc(e.get('title',''))}</a></li>"
            for e in related_entries
        )
        entries_html = f"<section><h2>이 인물 학습노트</h2><ul class='entries'>{items}</ul></section>"

    title = f"{p.get('name_ko','')} ({p.get('lived','')}) — 인물 페이지"
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{_esc(title)} · 네다바웨이 학습</title>
<meta name="description" content="{_esc(p.get('why_giant',''))[:140]}">
<link rel="canonical" href="https://www.nedabah.org/learning/persons/{_esc(p['id'])}.html">
<style>{PAGE_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="crumb"><a href="/learning.html">← 학습노트</a> · <a href="/learning/persons.html">2026 인물들</a></div>
  <img class="hero-photo" src="/learning/assets/persons/{_esc(p['id'])}.jpg" alt="{_esc(p.get('name_ko',''))}" onerror="this.style.display='none'">
  <h1>{_esc(p.get('name_ko',''))}</h1>
  <div class="subtitle">{_esc(p.get('name_en',''))} · {_esc(p.get('lived',''))}</div>
  <div class="tags">
    <span class="tag">{_esc(era)}</span>
    <span class="tag">{_esc(domain)}</span>
    <span class="tag cw" style="border-color:{cw_color};color:{cw_color}">{_esc(cw_label)}</span>
  </div>

  <section>
    <h2>왜 이 사람인가</h2>
    <p>{_esc(p.get('why_giant',''))}</p>
  </section>

  <section>
    <h2>기독교세계관 좌표</h2>
    <p>{_esc(p.get('cw_note',''))}</p>
  </section>

  <section>
    <h2>핵심 작품</h2>
    <ul class="works">{works}</ul>
  </section>

  <section>
    <h2>1차 출처</h2>
    <ul class="cites">{sources}</ul>
  </section>

  {entries_html}

  {f"<section><h2>연결된 사람들</h2><div class='related'>{related}</div></section>" if related else ""}

  <a class="back" href="/learning/persons.html">← 2026 인물들로</a>
</div>
</body>
</html>
"""


def render_index_page() -> str:
    persons = PERSONS["persons"]

    # KPI
    by_era = defaultdict(int)
    by_domain = defaultdict(int)
    by_cw = defaultdict(int)
    for p in persons:
        by_era[p.get("era_id", "")] += 1
        by_domain[p.get("domain_id", "")] += 1
        by_cw[p.get("cw_orientation", "")] += 1

    # 시대별 그룹
    era_sections = []
    for eid in ERA_ORDER:
        era_persons = [p for p in persons if p.get("era_id") == eid]
        if not era_persons:
            continue
        era_meta = next((e for e in ERAS["eras"] if e["id"] == eid), {})
        cards = "\n".join(_render_card(p) for p in era_persons)
        era_sections.append(
            f"""<div class="era-section">
  <h2>{_esc(era_meta.get('label',''))}</h2>
  <div class="span">{_esc(era_meta.get('span',''))} · {len(era_persons)}명</div>
  <div class="matrix">{cards}</div>
</div>"""
        )

    # 시드 시대 미지정 (5거인 등)
    no_era = [p for p in persons if not p.get("era_id")]
    if no_era:
        cards = "\n".join(_render_card(p) for p in no_era)
        era_sections.append(
            f"""<div class="era-section">
  <h2>다섯 사람 — 첫 만남의 자리</h2>
  <div class="span">시대 매트릭스 base · {len(no_era)}명</div>
  <div class="matrix">{cards}</div>
</div>"""
        )

    legend = " ".join(
        f"<span style='color:{c};border-color:{c}'>{_esc(l)}</span>"
        for l, c in CW_LABEL.values()
    )

    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>2026 인물들 — 한 해의 학습 동반자 22명 · 네다바웨이 학습</title>
<meta name="description" content="2026년 한 해 동안 함께 만나는 22명. 다섯 사람(에라스무스·라이프니츠·바전·Lewis·다 빈치) + 뉴턴·바흐·반 고흐·라흐마니노프 외 17명. 4시대 × 5영역 매트릭스, 기독교세계관 정직 라벨, 1차 출처 직접 연결.">
<link rel="canonical" href="https://www.nedabah.org/learning/persons.html">
<style>{INDEX_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="crumb"><a href="/learning.html">← 학습노트</a> · 2026 인물들</div>
  <h1>2026 인물들 — 한 해의 학습 동반자 22명</h1>
  <p class="lead">2026년 김창환 강사가 만나는 자리. 다섯 사람(에라스무스·라이프니츠·바전·Lewis·다 빈치)을 base로 두고 인류사에 지대한 영향을 준 17명을 더 등재. 4시대 × 5영역 매트릭스. 각 사람에 기독교세계관 정직 라벨과 1차 출처 디렉터리. 2026년 동안 한 명씩 좌표를 채워 간다.</p>

  <div class="kpi">
    <div class="box"><div class="num">{len(persons)}</div><div class="lab">총 인물</div></div>
    <div class="box"><div class="num">{by_era.get('renaissance',0)}</div><div class="lab">르네상스</div></div>
    <div class="box"><div class="num">{by_era.get('modern',0)}</div><div class="lab">근대</div></div>
    <div class="box"><div class="num">{by_era.get('nineteenth',0)}</div><div class="lab">19세기</div></div>
    <div class="box"><div class="num">{by_era.get('twentieth',0)}</div><div class="lab">20세기</div></div>
    <div class="box"><div class="num">{by_cw.get('affirming',0)}</div><div class="lab">신앙 명시</div></div>
  </div>

  {''.join(era_sections)}

  <p class="legend">기독교세계관 정직 라벨 — {legend}</p>
</div>
</body>
</html>
"""


def _render_card(p: Dict) -> str:
    cw_label, cw_color = CW_LABEL.get(p.get("cw_orientation", ""), ("미분류", "#374151"))
    domain = DOMAIN_LABEL.get(p.get("domain_id", ""), p.get("domain_id", ""))
    why = p.get("why_giant", "")[:120]
    return f"""<a class="card" href="/learning/persons/{_esc(p['id'])}.html">
  <div class="imgwrap">
    <img class="photo" src="/learning/assets/persons/{_esc(p['id'])}.jpg" alt="{_esc(p.get('name_ko',''))}" loading="lazy" onerror="this.style.display='none'">
    <div class="hover">
      <div class="h-name">{_esc(p.get('name_ko',''))}</div>
      <div class="h-lived">{_esc(p.get('lived',''))}</div>
      <div class="h-why">{_esc(why)}</div>
      <div class="h-cta">→ 자세히 보기</div>
    </div>
  </div>
  <div class="body">
    <div class="name">{_esc(p.get('name_ko',''))}</div>
    <div class="lived">{_esc(p.get('lived',''))}</div>
    <div class="meta">
      <span class="chip">{_esc(domain)}</span>
      <span class="chip cw" style="border-color:{cw_color};color:{cw_color}">{_esc(cw_label)}</span>
    </div>
  </div>
</a>"""


def main():
    persons = PERSONS["persons"]
    # 1. 인물 페이지 22개
    for p in persons:
        out = PERSONS_DIR / f"{p['id']}.html"
        out.write_text(render_person_page(p), encoding="utf-8")
    # 2. 인덱스
    (ROOT / "persons.html").write_text(render_index_page(), encoding="utf-8")
    print(f"[render_persons] OK")
    print(f"  persons: {len(persons)} pages → learning/persons/")
    print(f"  index:   learning/persons.html")


if __name__ == "__main__":
    main()
