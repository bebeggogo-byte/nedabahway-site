#!/usr/bin/env python3
"""M1 데이터 레이어: 1189장 관찰 HTML → 구조화 JSON + 검색 인덱스.

각 magazine/<BOOK>/<N>/index.html 에서 관찰 종합 텍스트·메타·요지를 추출하여
  app/data/obs/<BOOK>-<N>.json   (장별)
  app/data/search-index.json     (경량 전문 검색)
  app/data/books.json            (책 매니페스트)
를 생성한다. 무의존(표준 라이브러리만), 멱등.
"""
import json, os, re, html, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAG = os.path.join(ROOT, "magazine")
OUT = os.path.join(ROOT, "app", "data")
OBS = os.path.join(OUT, "obs")

# 책 메타(코드→한글/영문/장수)는 progress.json에서 로드
prog = json.load(open(os.path.join(ROOT, "sbm-progress.json"), encoding="utf-8"))
BOOKS = prog["books"]

# 신약 코드 (나머지는 구약)
NT = {"MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL",
      "1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN",
      "3JN","JUD","REV"}
# 정경 순서 (prev/next·오늘의 관찰 진도용)
ORDER = list(BOOKS.keys())

def strip_tags(s):
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def extract_masthead(doc):
    # "JER-031 · 선지서 · 히브리어"
    m = re.search(r"([A-Z0-9]{2,3})-(\d{3})\s*·\s*([^·<\n]+?)\s*·\s*([^·<\n]+)", doc)
    if not m:
        return None
    return m.group(1), int(m.group(2)), m.group(3).strip(), m.group(4).strip()

def extract_synthesis(doc):
    # id="synthesis" 섹션 본문
    m = re.search(r'id="synthesis".*?>(.*?)</section>', doc, flags=re.S)
    if not m:
        return ""
    txt = strip_tags(m.group(1))
    # 내장 메타 블록(--- sim_id: ... ---) 제거
    txt = re.sub(r"---\s*sim_id:.*?---", " ", txt, flags=re.S)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt

def extract_quoted(txt, limit=8):
    # "..." 인용된 핵심 어구를 키워드로 (히브리어·핵심구)
    qs = re.findall(r'"([^"]{2,40})"', txt)
    seen, out = set(), []
    for q in qs:
        q = q.strip()
        if q and q not in seen:
            seen.add(q); out.append(q)
        if len(out) >= limit:
            break
    return out

def load_essences(book):
    """책 인덱스에서 장별 2문장 요지 추출."""
    idx = os.path.join(MAG, book, "index.html")
    res = {}
    if not os.path.isfile(idx):
        return res
    doc = open(idx, encoding="utf-8").read()
    # <a ... href="/magazine/BOOK/N/"> ... <div class="toc-card__essence"...>ESS</div>
    for m in re.finditer(
        r'href="/magazine/%s/(\d+)/".*?<div class="toc-card__essence"[^>]*>(.*?)</div>' % book,
        doc, flags=re.S):
        n = int(m.group(1)); ess = strip_tags(m.group(2))
        if ess and ess != "발행 예정":
            res[n] = ess
    return res

def main():
    os.makedirs(OBS, exist_ok=True)
    search = []
    books_manifest = []
    total = 0
    errors = []

    # 전 장 (id 순서) 목록 만들어 prev/next 계산
    chapters = []  # (book, ch)
    for book in ORDER:
        bdir = os.path.join(MAG, book)
        if not os.path.isdir(bdir):
            continue
        chs = sorted(int(d) for d in os.listdir(bdir)
                     if d.isdigit() and os.path.isfile(os.path.join(bdir, d, "index.html")))
        for ch in chs:
            chapters.append((book, ch))

    id_of = lambda b, c: f"{b}-{c:03d}"
    flat_ids = [id_of(b, c) for (b, c) in chapters]

    for i, (book, ch) in enumerate(chapters):
        f = os.path.join(MAG, book, str(ch), "index.html")
        try:
            doc = open(f, encoding="utf-8").read()
        except Exception as e:
            errors.append((book, ch, f"read: {e}")); continue

        mast = extract_masthead(doc)
        genre = mast[2] if mast else ""
        lang = mast[3] if mast else ""
        syn = extract_synthesis(doc)
        if not syn:
            errors.append((book, ch, "synthesis empty"))
        meta = BOOKS.get(book, {})
        bid = id_of(book, ch)
        essmap = essences_cache.setdefault(book, load_essences(book))
        rec = {
            "id": bid,
            "book": book,
            "book_ko": meta.get("name", book),
            "book_en": meta.get("name_en", book),
            "chapter": ch,
            "testament": "NT" if book in NT else "OT",
            "genre": genre,
            "language": lang,
            "essence": essmap.get(ch, ""),
            "synthesis": syn,
            "keywords": extract_quoted(syn),
            "prev": flat_ids[i-1] if i > 0 else None,
            "next": flat_ids[i+1] if i < len(flat_ids)-1 else None,
            "url": f"/magazine/{book}/{ch}/",
        }
        json.dump(rec, open(os.path.join(OBS, f"{bid}.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, separators=(",", ":"))
        # 검색 인덱스 (경량: 요지+스니펫+키워드)
        snippet = (rec["essence"] or syn)[:180]
        search.append({
            "id": bid, "book": book, "book_ko": rec["book_ko"], "ch": ch,
            "testament": rec["testament"], "genre": genre,
            "title": f"{rec['book_ko']} {ch}장",
            "snippet": snippet, "keywords": rec["keywords"],
        })
        total += 1

    # 책 매니페스트
    for book in ORDER:
        bdir = os.path.join(MAG, book)
        if not os.path.isdir(bdir):
            continue
        meta = BOOKS.get(book, {})
        n = sum(1 for d in os.listdir(bdir)
                if d.isdigit() and os.path.isfile(os.path.join(bdir, d, "index.html")))
        if n == 0:
            continue
        books_manifest.append({
            "book": book, "book_ko": meta.get("name", book),
            "book_en": meta.get("name_en", book),
            "testament": "NT" if book in NT else "OT",
            "chapters": n,
        })

    json.dump(search, open(os.path.join(OUT, "search-index.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    json.dump(books_manifest, open(os.path.join(OUT, "books.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    print(f"장 추출: {total}")
    print(f"책 매니페스트: {len(books_manifest)}")
    print(f"검색 인덱스: {len(search)} 항목")
    if errors:
        print(f"경고 {len(errors)}건:")
        for e in errors[:20]:
            print("  ", e)
    else:
        print("경고 0건")

essences_cache = {}
if __name__ == "__main__":
    main()
