#!/usr/bin/env python3
"""한국어 관점 노트용 RSS·Atom·JSON Feed 3종 동시 생성.

기존 영문 newsletter 피드는 그대로 두고, 관점 노트(한국어) 전용 피드 3종을 새로 생성.
출력:
  /blog/perspective/feed.xml      (RSS 2.0)
  /blog/perspective/feed.atom     (Atom 1.0)
  /blog/perspective/feed.json     (JSON Feed 1.1)
"""
from __future__ import annotations
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent.parent
PERSPECTIVE_DIR = ROOT / "blog" / "perspective"

SITE_URL = "https://www.nedabah.org"
PERSPECTIVE_URL = f"{SITE_URL}/blog/perspective/"

TITLE_RE = re.compile(r"<title>\s*([^<]+?)\s*</title>", re.IGNORECASE)
DESC_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]+)"', re.IGNORECASE)
DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")


def collect_posts(limit: int = 50) -> list[dict]:
    posts = []
    files = [f for f in sorted(PERSPECTIVE_DIR.glob("*.html"), reverse=True) if f.name != "index.html"]
    for f in files[:limit]:
        html = f.read_text(encoding="utf-8")
        m_title = TITLE_RE.search(html)
        title = re.split(r"[—|·\|]", m_title.group(1), maxsplit=1)[0].strip() if m_title else f.stem
        m_desc = DESC_RE.search(html)
        desc = m_desc.group(1) if m_desc else ""
        m_date = DATE_RE.search(f.name)
        date_str = m_date.group(1) if m_date else "2026-01-01"
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            dt = datetime.now(timezone.utc)
        posts.append({
            "title": title,
            "url": f"{PERSPECTIVE_URL}{f.name}",
            "id": f.stem,
            "description": desc,
            "date": dt,
        })
    return posts


def build_rss(posts: list[dict]) -> str:
    items = []
    for p in posts:
        items.append(
            "<item>"
            f"<title>{escape(p['title'])}</title>"
            f"<link>{p['url']}</link>"
            f"<guid isPermaLink=\"true\">{p['url']}</guid>"
            f"<pubDate>{p['date'].strftime('%a, %d %b %Y 00:00:00 +0000')}</pubDate>"
            f"<description>{escape(p['description'])}</description>"
            f"<author>nedabah.way@gmail.com (김창환)</author>"
            "</item>"
        )
    items_xml = "\n  ".join(items)
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        '<channel>\n'
        '<title>관점 노트 — 네다바웨이 (Kim Changhwan)</title>\n'
        f'<link>{PERSPECTIVE_URL}</link>\n'
        '<description>한 사람의 일을 다시 디자인하는 짧은 관찰. 김창환(Kim Changhwan)이 매일 쓰는 600~1,200자 관점 노트.</description>\n'
        '<language>ko-KR</language>\n'
        f'<atom:link href="{PERSPECTIVE_URL}feed.xml" rel="self" type="application/rss+xml"/>\n'
        f'<lastBuildDate>{now}</lastBuildDate>\n'
        '<copyright>© 2026 김창환·네다바웨이</copyright>\n'
        '<managingEditor>nedabah.way@gmail.com (김창환)</managingEditor>\n'
        f'  {items_xml}\n'
        '</channel></rss>\n'
    )


def build_atom(posts: list[dict]) -> str:
    entries = []
    for p in posts:
        iso = p['date'].strftime("%Y-%m-%dT00:00:00Z")
        entries.append(
            "<entry>"
            f"<title>{escape(p['title'])}</title>"
            f"<link href=\"{p['url']}\"/>"
            f"<id>{p['url']}</id>"
            f"<updated>{iso}</updated>"
            f"<published>{iso}</published>"
            f"<summary>{escape(p['description'])}</summary>"
            "<author><name>김창환</name><email>nedabah.way@gmail.com</email></author>"
            "</entry>"
        )
    entries_xml = "\n  ".join(entries)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ko-KR">\n'
        '<title>관점 노트 — 네다바웨이 (Kim Changhwan)</title>\n'
        f'<link href="{PERSPECTIVE_URL}" rel="alternate"/>\n'
        f'<link href="{PERSPECTIVE_URL}feed.atom" rel="self"/>\n'
        f'<id>{PERSPECTIVE_URL}</id>\n'
        f'<updated>{now}</updated>\n'
        '<author><name>김창환</name><email>nedabah.way@gmail.com</email></author>\n'
        '<rights>© 2026 김창환·네다바웨이</rights>\n'
        f'  {entries_xml}\n'
        '</feed>\n'
    )


def build_jsonfeed(posts: list[dict]) -> str:
    items = []
    for p in posts:
        items.append({
            "id": p["url"],
            "url": p["url"],
            "title": p["title"],
            "summary": p["description"],
            "date_published": p["date"].strftime("%Y-%m-%dT00:00:00Z"),
            "language": "ko-KR",
            "authors": [{"name": "김창환", "url": f"{SITE_URL}/about.html"}]
        })
    feed = {
        "version": "https://jsonfeed.org/version/1.1",
        "title": "관점 노트 — 네다바웨이 (Kim Changhwan)",
        "home_page_url": PERSPECTIVE_URL,
        "feed_url": f"{PERSPECTIVE_URL}feed.json",
        "description": "한 사람의 일을 다시 디자인하는 짧은 관찰. 김창환(Kim Changhwan)이 매일 쓰는 600~1,200자 관점 노트.",
        "language": "ko-KR",
        "authors": [{"name": "김창환", "url": f"{SITE_URL}/about.html"}],
        "items": items,
    }
    return json.dumps(feed, ensure_ascii=False, indent=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50)
    args = ap.parse_args()

    posts = collect_posts(args.limit)
    print(f"collected: {len(posts)} posts")

    (PERSPECTIVE_DIR / "feed.xml").write_text(build_rss(posts), encoding="utf-8")
    (PERSPECTIVE_DIR / "feed.atom").write_text(build_atom(posts), encoding="utf-8")
    (PERSPECTIVE_DIR / "feed.json").write_text(build_jsonfeed(posts), encoding="utf-8")
    print(f"wrote: {PERSPECTIVE_DIR}/feed.xml /feed.atom /feed.json")


if __name__ == "__main__":
    main()
