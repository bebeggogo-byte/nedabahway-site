#!/usr/bin/env python3
"""magazine.html 책 그리드 동기화.
1) 신약 서신서 placeholder(REV-LIST 카드)를 실제 19권 카드로 확장하고 HEB를 정경 순서로 재배치한다(최초 1회).
2) 모든 book-card의 진행(완성/총장수)·아크·CTA를 magazine/{CODE}/ 실제 완성 장 수로 다시 맞춘다(반복 실행 가능).
완성 기준: index.html 크기 > 40KB (placeholder와 구분).
사용: python3 magazine/_meta/build_magazine_index.py [--write]
"""
import os, re, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HTML = os.path.join(ROOT, "magazine.html")
DONE_BYTES = 30000  # score_chapter.py 깊이 바닥과 일치(placeholder ~15.6KB와 구분). 30~40KB 전심층 장도 정확히 계수.

TOTALS = {
 "GEN":50,"EXO":40,"LEV":27,"NUM":36,"DEU":34,"JOS":24,"JDG":21,"RUT":4,"1SA":31,"2SA":24,
 "1KI":22,"2KI":25,"1CH":29,"2CH":36,"EZR":10,"NEH":13,"EST":10,"JOB":42,"PSA":150,"PRO":31,
 "ECC":12,"SNG":8,"ISA":66,"JER":52,"LAM":5,"EZK":48,"DAN":12,"HOS":14,"JOL":3,"AMO":9,
 "OBA":1,"JON":4,"MIC":7,"NAM":3,"HAB":3,"ZEP":3,"HAG":2,"ZEC":14,"MAL":4,"MAT":28,"MRK":16,
 "LUK":24,"JHN":21,"ACT":28,"ROM":16,"1CO":16,"2CO":13,"GAL":6,"EPH":6,"PHP":4,"COL":4,
 "1TH":5,"2TH":3,"1TI":6,"2TI":4,"TIT":3,"PHM":1,"HEB":13,"JAS":5,"1PE":5,"2PE":3,
 "1JN":5,"2JN":1,"3JN":1,"JUD":1,"REV":22,
}

# 신약 서신서 확장: ROM 다음에 들어갈 정경 순서(1CO..PHM, HEB, JAS..JUD). (ACT/ROM은 기존 유지)
INSERT = [
 ("1CO","고린도전서","1 Corinthians","한 몸의 결. 갈라진 자리에 십자가의 지혜가 들어선다."),
 ("2CO","고린도후서","2 Corinthians","질그릇의 결. 약한 곳에서 능력이 온전해진다."),
 ("GAL","갈라디아서","Galatians","자유의 결. 종의 자리에서 아들의 자리로 옮겨간다."),
 ("EPH","에베소서","Ephesians","하나 됨의 결. 둘로 갈린 자리가 한 새 사람이 된다."),
 ("PHP","빌립보서","Philippians","기쁨의 결. 매인 자리에서 더 깊은 기쁨이 흐른다."),
 ("COL","골로새서","Colossians","으뜸의 결. 헛된 그림자 위로 그리스도의 충만이 선다."),
 ("1TH","데살로니가전서","1 Thessalonians","기다림의 결. 우상을 떠난 발이 강림을 향해 선다."),
 ("2TH","데살로니가후서","2 Thessalonians","굳게 섬의 결. 미혹의 소문 가운데 진리가 버틴다."),
 ("1TI","디모데전서","1 Timothy","기둥의 결. 집 안에서 어떻게 설지가 정해진다."),
 ("2TI","디모데후서","2 Timothy","이어달림의 결. 꺼지기 전 불을 다음 손에 넘긴다."),
 ("TIT","디도서","Titus","은혜의 결. 길러내는 은혜가 행실을 빛나게 한다."),
 ("PHM","빌레몬서","Philemon","형제의 결. 종과 주인 사이에 형제가 들어선다."),
 ("HEB","히브리서","Hebrews","더 나은 결. 같은 단어 하나가 본문을 끌어간다."),
 ("JAS","야고보서","James","행함의 결. 들은 말이 손끝까지 내려온다."),
 ("1PE","베드로전서","1 Peter","나그네의 결. 고난의 길 위에 산 소망이 깔린다."),
 ("2PE","베드로후서","2 Peter","자라남의 결. 거짓을 분별하며 참 지식으로 자란다."),
 ("1JN","요한일서","1 John","사랑의 결. 빛 가운데서 서로 사랑이 확인된다."),
 ("2JN","요한이서","2 John","진리의 결. 사랑과 진리가 한 길로 간다."),
 ("3JN","요한삼서","3 John","환대의 결. 나그네를 맞는 손이 진리를 돕는다."),
 ("JUD","유다서","Jude","지킴의 결. 단번에 받은 믿음을 위해 선다."),
]

ENTER_SVG = ('<span class="book-card__enter" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" '
             'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
             '<path d="M5 12h14M13 6l6 6-6 6"/></svg></span>')

def done_count(code):
    base = os.path.join(ROOT, "magazine", code)
    return sum(1 for d in glob.glob(os.path.join(base, "*", "index.html"))
               if os.path.basename(os.path.dirname(d)).isdigit() and os.path.getsize(d) > DONE_BYTES)

def progress_html(code):
    total = TOTALS.get(code, 0); d = done_count(code)
    pct = round(100 * d / total) if total else 0
    cta = "권으로 들어가기 →" if d > 0 else "서장 보기 →"
    prog = (f'<span class="book-card__progress"><span class="book-card__progress-arc" '
            f'style="--p:{pct}"></span>{d} / {total}</span>')
    return prog, cta

def make_card(code, kor, en, essence):
    prog, cta = progress_html(code)
    return (f'<a class="book-card" href="/magazine/{code}/" data-book="{code}">{ENTER_SVG}{prog}'
            f'<div class="book-card__title">{kor}</div><div class="book-card__en">{en} · {code}</div>'
            f'<div class="book-card__meta">서신서<span class="sep">·</span>헬라어</div>'
            f'<div class="book-card__essence">{essence}</div>'
            f'<span class="book-card__cta">{cta}</span></a>')

def expand_letters(html):
    """REV-LIST placeholder를 실제 카드로 확장 + 기존 단독 HEB 카드 제거(최초 1회)."""
    if 'href="/magazine/REV-LIST/"' not in html:
        return html, False
    # 1) 기존 단독 HEB 카드 제거 (정경 순서로 INSERT에 다시 포함되므로)
    heb_re = re.compile(r'\s*<a class="book-card" href="/magazine/HEB/" data-book="HEB">.*?</a>', re.S)
    html = heb_re.sub("", html, count=1)
    # 2) REV-LIST placeholder 카드 → 20개 카드
    cards = "\n      ".join(make_card(c, k, e, s) for c, k, e, s in INSERT)
    rev_re = re.compile(r'<a class="book-card" href="/magazine/REV-LIST/".*?</a>', re.S)
    html = rev_re.sub(cards, html, count=1)
    return html, True

def sync_progress(html):
    """모든 data-book 카드의 progress 스팬 + CTA를 디스크 기준으로 갱신."""
    prog_re = re.compile(r'<span class="book-card__progress">.*?\d+\s*/\s*\d+\s*</span>', re.S)
    cta_re = re.compile(r'<span class="book-card__cta">[^<]*</span>')
    def repl(m):
        card = m.group(0); code = m.group(1)
        if code not in TOTALS:
            return card
        prog, cta = progress_html(code)
        card = prog_re.sub(prog, card, count=1)
        card = cta_re.sub(f'<span class="book-card__cta">{cta}</span>', card, count=1)
        return card
    return re.sub(r'<a class="book-card" href="/magazine/[A-Z0-9]{3}/" data-book="([A-Z0-9]{3})">.*?</a>', repl, html, flags=re.S)

def main():
    html = open(HTML, encoding="utf-8").read()
    html, expanded = expand_letters(html)
    html = sync_progress(html)
    n_cards = html.count('class="book-card"')
    write = "--write" in sys.argv
    if write:
        open(HTML, "w", encoding="utf-8").write(html)
    # 요약
    total_done = sum(done_count(c) for c in TOTALS)
    total_ch = sum(TOTALS.values())
    started = sum(1 for c in TOTALS if done_count(c) > 0)
    print(f"{'WROTE' if write else 'DRY'}: book-cards={n_cards}, letters_expanded={expanded}, "
          f"completed={total_done}/{total_ch}, started_books={started}/66")

if __name__ == "__main__":
    main()
