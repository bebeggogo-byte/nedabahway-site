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

import html
import json
import re
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
    # 피드 유래 값은 HTML/속성에 넣기 전 반드시 이스케이프한다 (Bug 2).
    href = "javascript:void(0)" if locked else html.escape(item["url"], quote=True)
    aria_lock = ' aria-disabled="true"' if locked else ""
    status = "🔒 검수 중" if locked else f"● {html.escape(str(item.get('updated', item['published'])))} 공개"
    cite_count = len(item.get("cites", []))
    cite_html = f"<span class='card__cite'>인용 {cite_count}건</span>" if cite_count else ""
    version = html.escape(str(item.get('version', 'v1.0')))
    title = html.escape(str(item['title']))
    summary = html.escape(str(item['summary']))
    return f"""
    <a class="card card--{fmt}" href="{href}"{aria_lock} data-format="{fmt}">
      <div class="card__abbr" style="color:{color}">{label} · {version}</div>
      <div class="card__title">{title}</div>
      <p class="card__desc">{summary}</p>
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
    # 외부 마스터는 최신 12건만 노출 (폭주 방지). 나머지는 changelog로.
    pubs_top = pubs_sorted[:12]
    pub_cards = "\n".join(render_card(x) for x in pubs_top) or "<p class='empty'>공개된 자료가 곧 추가됩니다.</p>"

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
        # 피드 유래 값(url/title/date)은 출력 전 이스케이프한다 (Bug 2).
        rows_html = "\n".join(
            f'<li class="crow crow--{x["visibility"]}"><span class="crow__vis">{x["visibility"]}</span>'
            f'<a href="{html.escape(str(x["url"]), quote=True)}" target="_blank">'
            f'{html.escape(str(x["title"]))}</a>'
            f'<span class="crow__date">{html.escape(str(x.get("updated", x["published"])))}</span></li>'
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
    # 피드 유래 값(date/url/title/version)은 출력 전 이스케이프한다 (Bug 2).
    rows_html = "\n".join(
        f'<li><time>{html.escape(str(x.get("updated", x["published"])))}</time> '
        f'<span class="cl__fmt cl__fmt--{x["format"]}">{FORMAT_LABEL[x["format"]][0]}</span> '
        f'<a href="{html.escape(str(x["url"]), quote=True)}">{html.escape(str(x["title"]))}</a> '
        f'<em>{html.escape(str(x.get("version", "v1.0")))}</em></li>'
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


def render_format_index_console(items: list[dict], code: str) -> str:
    """형식별 인덱스 — 로컬 콘솔 전용 (전체 visibility 표시)."""
    label, hint, color = FORMAT_LABEL[code]
    rows = sorted([x for x in items if x["format"] == code], key=lambda y: y.get("updated", y["published"]), reverse=True)
    rows_html = "\n".join(
        f'<li class="row row--{x["visibility"]}">'
        f'<span class="vis">{x["visibility"]}</span>'
        f'<a href="{x["url"]}" target="_blank">{x["title"]}</a>'
        f'<span class="dt">{x.get("updated", x["published"])}</span>'
        f'<code class="id">{x["id"]}</code>'
        f'</li>'
        for x in rows
    ) or "<li class='empty'>자료 없음</li>"
    return f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>{label} — 콘솔 (로컬 전용)</title><meta name="robots" content="noindex">
<style>
body{{font-family:'Pretendard Variable',sans-serif;background:#0F172A;color:#F1F5F9;max-width:1100px;margin:0 auto;padding:30px 24px;line-height:1.6}}
a{{color:#60A5FA;text-decoration:none}}h1{{color:{color};font-size:1.6rem;margin-bottom:8px}}
.hint{{color:#94A3B8;font-size:.9rem;margin-bottom:24px}}
ul{{list-style:none;padding:0}}
.row{{display:grid;grid-template-columns:80px 1fr 100px;gap:12px;padding:10px 12px;background:#1E293B;margin-bottom:6px;border-radius:6px;align-items:center;font-size:.9rem}}
.vis{{font-size:.7rem;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;text-align:center}}
.row--public .vis{{background:#064E3B;color:#6EE7B7}}
.row--internal .vis{{background:#7C2D12;color:#FED7AA}}
.row--draft .vis{{background:#334155;color:#94A3B8}}
.dt{{color:#94A3B8;font-size:.78rem;text-align:right}}
.id{{grid-column:1/-1;font-size:.7rem;color:#64748B;background:#0B1220;padding:4px 8px;border-radius:4px;margin-top:4px;font-family:monospace}}
.empty{{color:#94A3B8;text-align:center;padding:30px}}.back{{margin-bottom:20px}}
.cmd{{background:#1E293B;border:1px solid #334155;padding:10px 14px;border-radius:6px;font-family:monospace;font-size:.82rem;color:#94A3B8;margin:18px 0}}
</style></head><body>
<div class="back"><a href="/resources/_console/">← 콘솔로</a></div>
<h1>{label} <small style="color:#94A3B8;font-size:.6em;font-weight:400;margin-left:10px">{hint}</small></h1>
<p class="hint">{len(rows)}건 · 로컬 전용 · 외부 노출 0</p>
<div class="cmd">개별 승인: <code>python3 resources/_build/approve.py &lt;id&gt;</code><br>
형식별 일괄: <code>python3 resources/_build/approve.py --batch {code} 10</code></div>
<ul>{rows_html}</ul>
</body></html>"""


# --- 개별 자료 페이지 SEO 보정 -------------------------------------------
# resources/{curations,diagnostics,evidence,guides,prompts,worksheets}/*.html 의
# 개별 자료 페이지는 과거 생성기가 만든 공통 스캐폴드를 공유한다. 이 스캐폴드는
# description / canonical / OG·Twitter / <main> / <header> / BreadcrumbList 가
# 누락되어 있고 존재하지 않는 /resources/_templates/style.css 를 참조한다.
# 아래 로직은 본문(콘텐츠)은 그대로 보존하면서 <head> 메타데이터와 랜드마크만
# 보정한다 — 시각 디자인·본문은 변경하지 않는다.

SITE_ORIGIN = "https://www.nedabah.org"
OG_DEFAULT_IMAGE = "/assets/og-default.svg"
BROKEN_STYLE_LINK = '<link rel="stylesheet" href="/resources/_templates/style.css">'

# 개별 페이지 대상 하위 디렉터리 (자료실 형식별 디렉터리)
RESOURCE_SUBDIRS = ("curations", "diagnostics", "evidence", "guides", "prompts", "worksheets")

# 자료 형식(메타 줄에 표기되는 type) → 한국어 라벨. feed.json 에 없는 페이지의
# description 을 title + type 으로 파생할 때 사용한다.
TYPE_LABEL = {
    "worksheet": "학습 활동지",
    "briefing": "브리핑 자료",
    "curation": "편집부 큐레이션",
    "diary": "리서치 일지",
    "prompt_pack": "재사용 프롬프트 팩",
    "essay": "에세이",
    "guide": "실무 가이드",
    "diagnostic": "자가 진단 도구",
    "report": "리서치 리포트",
    "paper": "약식 논문 노트",
}

# 디렉터리 → 자료실 내 한국어 분류명 (BreadcrumbList 3번째 단계)
SUBDIR_LABEL = {
    "curations": "큐레이션",
    "diagnostics": "진단 도구",
    "evidence": "근거자료",
    "guides": "가이드",
    "prompts": "프롬프트",
    "worksheets": "활동지",
}


def _clamp_description(text: str, title: str, type_label: str) -> str:
    """description 을 50~160자 범위로 보정한다."""
    text = " ".join((text or "").split())
    if len(text) < 50:
        # 너무 짧으면 제목·형식으로 보강
        suffix = f" 네다바웨이 자료실의 {type_label}." if type_label else " 네다바웨이 자료실 자료."
        base = text if text else title
        text = (base + suffix).strip()
        if len(text) < 50:
            text = (text + " 강의·제안·진단·근거에 바로 쓰는 현장 검증 자료입니다.").strip()
    if len(text) > 160:
        text = text[:157].rstrip() + "…"
    return text


def _build_head_block(*, title: str, description: str, canonical: str,
                       breadcrumb_json: str, present: str = "") -> str:
    """<title> 다음에 삽입할 SEO 메타데이터 블록을 만든다.

    present 에 이미 페이지에 존재하는 항목 키워드가 담겨 있으면 해당 줄은
    건너뛴다 — 손으로 작성한 페이지의 기존 메타데이터를 보존하기 위함.
    """
    esc = html.escape
    lines: list[str] = []
    if 'name="description"' not in present:
        lines.append(f'<meta name="description" content="{esc(description)}">')
    if 'rel="canonical"' not in present:
        lines.append(f'<link rel="canonical" href="{esc(canonical)}">')
    if 'og:title' not in present:
        lines.append(f'<meta property="og:title" content="{esc(title)}">')
    if 'og:description' not in present:
        lines.append(f'<meta property="og:description" content="{esc(description)}">')
    if 'og:url' not in present:
        lines.append(f'<meta property="og:url" content="{esc(canonical)}">')
    if 'og:type' not in present:
        lines.append('<meta property="og:type" content="article">')
    if 'og:image' not in present:
        lines.append(f'<meta property="og:image" content="{esc(SITE_ORIGIN + OG_DEFAULT_IMAGE)}">')
    if 'twitter:card' not in present:
        lines.append('<meta name="twitter:card" content="summary">')
    if 'application/ld+json' not in present:
        lines.append(f'<script type="application/ld+json">\n{breadcrumb_json}\n</script>')
    return "\n".join(lines)


# --- 전환 CTA 블록 -------------------------------------------------------
# S2 무료가치 감사(REQ-FV-007)에서 자료실 개별 페이지는 무료 가치를 전달하지만
# 본문에 다음 단계 CTA 가 없는 '퍼널 고아' 로 확인됐다. 아래 블록은 모든 공개
# 자료 페이지 본문 끝(</main> 직전)에 무료 30분 상담으로 향하는 CTA 1개를 넣는다.
# site-strategy.yaml 의 cta_secondary("무료 30분 ... 상담/진단") · voice_rules 를
# 따른다 — 본문 중간 CTA 는 넣지 않는다.
CTA_MARKER = 'class="cta-next"'

# @MX:ANCHOR: [AUTO] 모든 공개 자료 페이지가 공유하는 단일 전환 CTA 블록
# @MX:REASON: render_all 재실행 시 페이지 1281건이 이 문자열에 의존한다. 문구·링크
#             변경은 site-strategy.yaml voice_rules / contact 경로와 함께 검토할 것.
CTA_BLOCK = """<aside class="cta-next" aria-labelledby="cta-next-title">
  <h2 id="cta-next-title">다음 한 걸음</h2>
  <p>자료를 읽고 한 사람의 일을 다시 디자인하고 싶다면, 무료 30분 상담에서 좌표를 함께 잡아 봅니다.</p>
  <p class="cta-next__links">
    <a class="cta-next__primary" href="/contact.html">무료 30분 상담 신청</a>
    <a class="cta-next__secondary" href="/p/">5개 과정 라인업 보기</a>
  </p>
</aside>
"""


def _inject_manifest(text: str) -> str:
    """<head> 에 PWA manifest 링크를 1개 보장한다 (S4 노출 빈도, 멱등)."""
    if 'rel="manifest"' in text or "</head>" not in text:
        return text
    return text.replace(
        "</head>",
        '<link rel="manifest" href="/manifest.webmanifest">\n</head>', 1)


def _inject_cta(text: str) -> str:
    """본문 끝(</main> 직전)에 전환 CTA 블록을 1개 삽입한다.

    이미 CTA 가 있으면(멱등성) 그대로 반환한다. <main> 이 없으면 보정 단계에서
    추가되므로 호출 순서상 항상 <main> 이 있는 상태에서 실행돼야 한다.
    """
    if CTA_MARKER in text:
        return text
    if "</main>" not in text:
        return text
    return text.replace("</main>", CTA_BLOCK + "</main>", 1)


def _breadcrumb_jsonld(*, subdir: str, page_title: str, canonical: str) -> str:
    """경로(홈 → 자료실 → 분류 → 페이지)를 반영한 BreadcrumbList JSON-LD."""
    subdir_label = SUBDIR_LABEL.get(subdir, subdir)
    data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "홈",
             "item": f"{SITE_ORIGIN}/"},
            {"@type": "ListItem", "position": 2, "name": "자료실",
             "item": f"{SITE_ORIGIN}/resources/"},
            {"@type": "ListItem", "position": 3, "name": subdir_label,
             "item": f"{SITE_ORIGIN}/resources/{subdir}/"},
            {"@type": "ListItem", "position": 4, "name": page_title,
             "item": canonical},
        ],
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def _fix_resource_page(path: Path, subdir: str, by_url: dict[str, dict]) -> bool:
    """개별 자료 페이지 1건을 보정한다. 변경되면 True 를 반환한다."""
    original = path.read_text(encoding="utf-8")
    text = original

    # noindex 페이지(검수 대기 비공개 스텁)는 의도적으로 비공개이므로
    # canonical/OG/breadcrumb 등 발견 가능성 메타데이터를 추가하지 않는다.
    if re.search(r'<meta name="robots"[^>]*content="[^"]*noindex', text):
        return False

    # 모든 보정 항목이 이미 갖춰져 있으면 건너뛴다 (멱등성).
    # 전환 CTA(REQ-FV-007) 도 보정 항목에 포함 — 이미 SEO 보정된 페이지라도
    # CTA 가 없으면 다시 처리해야 한다.
    fully_done = (
        BROKEN_STYLE_LINK not in text
        and 'rel="canonical"' in text
        and "name=\"description\"" in text
        and "og:url" in text and "og:image" in text and "og:type" in text
        and "twitter:card" in text
        and "application/ld+json" in text
        and "<main" in text and "<header" in text
        and CTA_MARKER in text
    )
    if fully_done:
        return False

    url = "/resources/" + subdir + "/" + path.name
    canonical = SITE_ORIGIN + url
    record = by_url.get(url)

    # 제목: <title> 의 앞부분 ("| 네다바웨이 자료실" / "— 네다바웨이" 등 접미사 제거)
    m_title = re.search(r"<title>(.*?)</title>", text, re.S)
    raw_title = m_title.group(1).strip() if m_title else path.stem
    page_title = re.split(r"\s*[|]\s*", raw_title)[0].strip()
    page_title = re.sub(r"\s*[—-]\s*네다바웨이\s*$", "", page_title).strip()

    # 형식(type): 본문 메타 줄 _DEPT · TYPE · DATE_ 에서 추출
    m_meta = re.search(r"<p>_[^·]+·\s*([^·]+)·\s*[0-9-]+_</p>", text)
    type_key = m_meta.group(1).strip() if m_meta else ""
    type_label = TYPE_LABEL.get(type_key, "")

    # description: 기존 meta description 우선, 없으면 feed.json summary,
    # 그래도 없으면 title + type 으로 파생. 모두 50~160자로 보정한다.
    m_desc = re.search(r'<meta name="description" content="(.*?)">', text)
    existing_desc = html.unescape(m_desc.group(1)) if m_desc else ""
    summary = record.get("summary", "") if record else ""
    description = _clamp_description(existing_desc or summary, page_title, type_label)

    breadcrumb = _breadcrumb_jsonld(subdir=subdir, page_title=page_title,
                                    canonical=canonical)
    head_block = _build_head_block(title=page_title, description=description,
                                   canonical=canonical, breadcrumb_json=breadcrumb,
                                   present=text)

    # 0) 기존 description 이 50~160자 범위를 벗어나면 보정값으로 교체
    if m_desc and html.unescape(m_desc.group(1)) != description:
        text = text.replace(
            m_desc.group(0),
            f'<meta name="description" content="{html.escape(description)}">',
            1,
        )
        # OG description 도 동일하게 맞춘다 (있을 경우)
        text = re.sub(
            r'<meta property="og:description" content=".*?">',
            f'<meta property="og:description" content="{html.escape(description)}">',
            text, count=1,
        )

    # 1) 끊어진 style.css <link> 제거 (앞 공백·줄바꿈 포함)
    text = re.sub(r"[ \t]*" + re.escape(BROKEN_STYLE_LINK) + r"\n?", "", text)

    # 2) <title> 바로 뒤에 누락된 SEO 메타 항목만 삽입.
    #    </title> 다음 문자가 줄바꿈/공백/태그 무엇이든(개행 비의존) 삽입한다.
    if head_block:
        text = re.sub(
            r"(</title>)",
            lambda mm: mm.group(1) + "\n" + head_block + "\n",
            text, count=1,
        )

    # 3) <header> 랜드마크: 선두 <h1> (+ 이어지는 이탤릭 메타 <p>) 를 감싼다
    if "<header" not in text:
        text = re.sub(
            r"(<h1[^>]*>.*?</h1>(?:\s*<p>_.*?_</p>)?)",
            lambda mm: '<header class="resource-header">\n'
                       + mm.group(1) + "\n</header>",
            text, count=1, flags=re.S,
        )

    # 4) <main> 랜드마크: 없으면 콘텐츠 영역을 감싼다.
    #    4a) 표준 스캐폴드: </nav> 이후 ~ <footer> 이전을 <main> 으로 감싼다.
    #    4b) <article> 만 있는 최소 스캐폴드: <article> 을 <main> 으로 감싼다.
    if "<main" not in text:
        def wrap_main(mm: re.Match) -> str:
            return ("</nav>\n<main class=\"article-body\">\n"
                    + mm.group(1).strip()
                    + "\n</main>\n")
        # footer 클래스가 약간 달라도(foot--mini / foot--full 등)
        # 콘텐츠가 조용히 누락되지 않도록 <footer ...class="foot...">
        # 또는 어떤 <footer> 든 후보로 본다.
        new_text, n = re.subn(
            r"</nav>(.*?)(?=<footer\b[^>]*class=\"[^\"]*\bfoot\b)",
            wrap_main, text, count=1, flags=re.S,
        )
        if not n:
            new_text, n = re.subn(
                r"</nav>(.*?)(?=<footer\b)",
                wrap_main, text, count=1, flags=re.S,
            )
        if n:
            text = new_text
        elif "<article>" in text and "</article>" in text:
            text = re.sub(
                r"(<article>.*?</article>)",
                lambda mm: '<main class="article-body">\n'
                           + mm.group(1) + "\n</main>",
                text, count=1, flags=re.S,
            )

    # 5) 전환 CTA: 본문 끝(</main> 직전)에 다음 단계 CTA 1개 삽입 (REQ-FV-007).
    #    멱등 — 이미 cta-next 가 있으면 그대로 둔다. 4)에서 <main> 이 보장된 뒤 실행.
    text = _inject_cta(text)

    if text == original:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def regenerate_resource_pages(items: list[dict]) -> int:
    """개별 자료 페이지의 SEO 메타데이터·랜드마크를 보정한다.

    본문(콘텐츠)·시각 디자인은 변경하지 않으며, description / canonical /
    OG·Twitter / <main> / <header> / BreadcrumbList 를 추가하고
    끊어진 style.css 링크를 제거한다.
    """
    by_url = {x["url"]: x for x in items}
    fixed = 0
    for subdir in RESOURCE_SUBDIRS:
        sub_path = ROOT / subdir
        if not sub_path.is_dir():
            continue
        for page in sorted(sub_path.glob("*.html")):
            if _fix_resource_page(page, subdir, by_url):
                fixed += 1
    return fixed


def main() -> None:
    feed = load_feed()
    items = feed["items"]
    kpi = update_kpi(items)

    # 외부 마스터 (최신 12건 카드만)
    # 재생성 시에도 S2 전환 CTA 와 S4 PWA manifest 링크가 보존되도록 후처리한다.
    _master = render_master_external(items, kpi)
    _master = _inject_cta(_inject_manifest(_master))
    (ROOT / "index.html").write_text(_master, encoding="utf-8")
    # 콘솔 — _templates/console.html 이 있을 때만 생성 (내부 전용·noindex).
    # 템플릿이 없으면 외부 페이지 생성을 막지 않도록 건너뛴다.
    if (TPL / "console.html").is_file():
        (ROOT / "_console").mkdir(exist_ok=True)
        (ROOT / "_console" / "index.html").write_text(render_console(items, kpi), encoding="utf-8")
        # 형식별 콘솔 인덱스 (8개)
        for code in FORMAT_LABEL:
            fmt_dir = ROOT / "_console" / code
            fmt_dir.mkdir(exist_ok=True)
            (fmt_dir / "index.html").write_text(render_format_index_console(items, code), encoding="utf-8")
    else:
        print("  (콘솔 건너뜀 — _templates/console.html 없음)")
    # 변경 이력 (외부 공개분만)
    (ROOT / "changelog.html").write_text(render_changelog(items), encoding="utf-8")
    # sitemap
    (ROOT / "sitemap.xml").write_text(render_sitemap(items), encoding="utf-8")
    # public-only feed (외부용 별칭)
    public_feed = {"generated": kpi["generated"], "items": public_items(items)}
    (ROOT / "feed.json").write_text(json.dumps(public_feed, ensure_ascii=False, indent=2), encoding="utf-8")

    # 개별 자료 페이지 SEO 보정 (description / canonical / OG·Twitter / main / header / breadcrumb)
    resource_pages_fixed = regenerate_resource_pages(items)

    pub_n = len(public_items(items))
    int_n = sum(1 for x in items if x['visibility'] == 'internal')
    print(f"✓ render_all 완료 — public {pub_n} / internal {int_n} / total {len(items)}")
    print(f"  외부 노출 카드: 최신 {min(12, pub_n)}건 / 검수 대기 {int_n}건")
    print(f"  개별 자료 페이지 SEO 보정: {resource_pages_fixed}건")


if __name__ == "__main__":
    main()
