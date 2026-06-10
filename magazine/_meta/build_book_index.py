#!/usr/bin/env python3
"""책 인덱스(magazine/{CODE}/index.html)를 GEN 형식으로 생성/갱신.
완성 장(>40KB)은 toc-card--done(essence 반영), 미완은 --pending.
권 전권 완성 시 PDF 다운로드 버튼 포함.
사용: python3 magazine/_meta/build_book_index.py MAT [PSA ...]
"""
import os, sys, re, glob, html

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# 코드: (이름, 영문, 정경블록, 원어, 총장수, 장단위)
META={
 "GEN":("창세기","Genesis","오경","히브리어",50,"장"),"EXO":("출애굽기","Exodus","오경","히브리어",40,"장"),
 "LEV":("레위기","Leviticus","오경","히브리어",27,"장"),"NUM":("민수기","Numbers","오경","히브리어",36,"장"),
 "DEU":("신명기","Deuteronomy","오경","히브리어",34,"장"),"JHN":("요한복음","John","복음서","헬라어",21,"장"),
 "MAT":("마태복음","Matthew","복음서","헬라어",28,"장"),"MRK":("마가복음","Mark","복음서","헬라어",16,"장"),
 "LUK":("누가복음","Luke","복음서","헬라어",24,"장"),"ACT":("사도행전","Acts","역사서(신약)","헬라어",28,"장"),
 "PSA":("시편","Psalms","시가서","히브리어",150,"편"),"REV":("요한계시록","Revelation","예언서(신약)","헬라어",22,"장"),
 "ROM":("로마서","Romans","서신서","헬라어",16,"장"),"1CO":("고린도전서","1 Corinthians","서신서","헬라어",16,"장"),
 "2CO":("고린도후서","2 Corinthians","서신서","헬라어",13,"장"),"GAL":("갈라디아서","Galatians","서신서","헬라어",6,"장"),
 "EPH":("에베소서","Ephesians","서신서","헬라어",6,"장"),"PHP":("빌립보서","Philippians","서신서","헬라어",4,"장"),
 "COL":("골로새서","Colossians","서신서","헬라어",4,"장"),
 "1TH":("데살로니가전서","1 Thessalonians","서신서","헬라어",5,"장"),"2TH":("데살로니가후서","2 Thessalonians","서신서","헬라어",3,"장"),
 "1TI":("디모데전서","1 Timothy","서신서","헬라어",6,"장"),"2TI":("디모데후서","2 Timothy","서신서","헬라어",4,"장"),
 "TIT":("디도서","Titus","서신서","헬라어",3,"장"),"PHM":("빌레몬서","Philemon","서신서","헬라어",1,"장"),
 "HEB":("히브리서","Hebrews","서신서","헬라어",13,"장"),"JAS":("야고보서","James","서신서","헬라어",5,"장"),
 "1PE":("베드로전서","1 Peter","서신서","헬라어",5,"장"),"2PE":("베드로후서","2 Peter","서신서","헬라어",3,"장"),
 "1JN":("요한일서","1 John","서신서","헬라어",5,"장"),"2JN":("요한이서","2 John","서신서","헬라어",1,"장"),
 "3JN":("요한삼서","3 John","서신서","헬라어",1,"장"),"JUD":("유다서","Jude","서신서","헬라어",1,"장"),
 "JOS":("여호수아","Joshua","역사서","히브리어",24,"장"),"JDG":("사사기","Judges","역사서","히브리어",21,"장"),
 "RUT":("룻기","Ruth","역사서","히브리어",4,"장"),"1SA":("사무엘상","1 Samuel","역사서","히브리어",31,"장"),
 "2SA":("사무엘하","2 Samuel","역사서","히브리어",24,"장"),"1KI":("열왕기상","1 Kings","역사서","히브리어",22,"장"),
 "2KI":("열왕기하","2 Kings","역사서","히브리어",25,"장"),"1CH":("역대상","1 Chronicles","역사서","히브리어",29,"장"),
 "2CH":("역대하","2 Chronicles","역사서","히브리어",36,"장"),"EZR":("에스라","Ezra","역사서","히브리어",10,"장"),
 "NEH":("느헤미야","Nehemiah","역사서","히브리어",13,"장"),"EST":("에스더","Esther","역사서","히브리어",10,"장"),
 "JOB":("욥기","Job","시가서","히브리어",42,"장"),"PRO":("잠언","Proverbs","시가서","히브리어",31,"장"),
 "ECC":("전도서","Ecclesiastes","시가서","히브리어",12,"장"),"SNG":("아가","Song of Songs","시가서","히브리어",8,"장"),
 "ISA":("이사야","Isaiah","선지서","히브리어",66,"장"),"JER":("예레미야","Jeremiah","선지서","히브리어",52,"장"),
 "LAM":("예레미야애가","Lamentations","선지서","히브리어",5,"장"),"EZK":("에스겔","Ezekiel","선지서","히브리어",48,"장"),
 "DAN":("다니엘","Daniel","선지서","히브리어",12,"장"),"HOS":("호세아","Hosea","선지서","히브리어",14,"장"),
 "JOL":("요엘","Joel","선지서","히브리어",3,"장"),"AMO":("아모스","Amos","선지서","히브리어",9,"장"),
 "OBA":("오바댜","Obadiah","선지서","히브리어",1,"장"),"JON":("요나","Jonah","선지서","히브리어",4,"장"),
 "MIC":("미가","Micah","선지서","히브리어",7,"장"),"NAM":("나훔","Nahum","선지서","히브리어",3,"장"),
 "HAB":("하박국","Habakkuk","선지서","히브리어",3,"장"),"ZEP":("스바냐","Zephaniah","선지서","히브리어",3,"장"),
 "HAG":("학개","Haggai","선지서","히브리어",2,"장"),"ZEC":("스가랴","Zechariah","선지서","히브리어",14,"장"),
 "MAL":("말라기","Malachi","선지서","히브리어",4,"장"),
}

def essence(code,n):
    f=os.path.join(ROOT,"magazine",code,str(n),"index.html")
    if os.path.exists(f) and os.path.getsize(f)>30000:
        t=open(f,encoding="utf-8").read()
        # essence는 인라인 마크업(<em> 등)을 포함할 수 있으므로 비탐욕 매칭 후 태그 제거.
        m=re.search(r'<p class="essence">(.*?)</p>',t,re.S)
        if m: return re.sub(r'<[^>]+>','',m.group(1)).strip()
    return None

def build(code):
    if code not in META: print("META 없음:",code); return
    name,en,canon,lang,total,unit=META[code]
    done=sum(1 for n in range(1,total+1) if essence(code,n))
    cards=[]
    for n in range(1,total+1):
        ess=essence(code,n)
        if ess:
            cards.append(f'<a class="toc-card toc-card--done" href="/magazine/{code}/{n}/"><div class="toc-card__num">{n}{unit}</div><div class="toc-card__essence">{html.escape(ess)}</div><div class="toc-card__status">관찰 완료 →</div></a>')
        else:
            cards.append(f'<a class="toc-card toc-card--pending" href="/magazine/{code}/{n}/"><div class="toc-card__num">{n}{unit}</div><div class="toc-card__essence" style="color:#9A9A9A">발행 예정</div><div class="toc-card__status" style="color:#C2410C">후원으로 앞당기기</div></a>')
    dl = (f'<div class="book-dl" style="margin-top:18px;"><a href="/magazine/_pdf/{code}.pdf" download '
          f'style="display:inline-flex;align-items:center;gap:8px;background:#1A1A1A;color:#FAFAF7;padding:11px 20px;border-radius:999px;font-weight:700;font-size:0.92rem;text-decoration:none;">관찰 핵심 PDF 내려받기 ↓</a>'
          f'<span style="margin-left:10px;color:#7A6F5F;font-size:0.82rem;">완성 {done}{unit} · 가상 대화 제외, 관찰·종합만 정리</span></div>') if done==total else ''
    doc=f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<title>{name} — Observatory | 네다바웨이</title>
<meta name="description" content="{name} {total}{unit}을 9단계로 관찰합니다. 진행 {done} / {total}.">
<link rel="canonical" href="https://www.nedabah.org/magazine/{code}/">
<link rel="stylesheet" href="/assets/v3.css">
<link rel="stylesheet" href="/assets/typography-v4.css">
<link rel="stylesheet" href="/assets/mobile-v1.css">
<style>
  .book-mast {{ max-width: 1180px; margin: 0 auto; padding: 96px 28px 56px; border-bottom: 1px solid var(--c-line); }}
  .book-mast .crumb {{ font-size: 0.82rem; color: var(--c-mute); }}
  .book-mast .crumb a {{ border-bottom: 1px solid currentColor; padding-bottom:1px; }}
  .book-mast h1 {{ font-family: var(--ff-serif); font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 800; margin: 18px 0 8px; text-wrap: balance; }}
  .book-mast .en {{ font-size: 1rem; color: var(--c-mute); letter-spacing: 0.06em; }}
  .book-mast .meta-row {{ margin-top: 22px; display: flex; gap: 18px; flex-wrap: wrap; color: var(--c-mute); font-size: 0.92rem; }}
  .book-mast .meta-row span {{ padding: 4px 10px; background: #F4F2EC; border-radius: 4px; }}
  .toc {{ max-width: 1180px; margin: 0 auto; padding: 40px 28px 96px; }}
  .toc h2 {{ font-family: var(--ff-serif); font-size: 1.4rem; font-weight: 800; margin-bottom: 18px; }}
  .toc-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }}
  .toc-card {{ display: block; border: 1px solid var(--c-line); border-radius: 10px; padding: 16px 18px; text-decoration: none; color: inherit; transition: border-color .2s, transform .2s; background: var(--c-surface); }}
  .toc-card:hover {{ border-color: var(--c-copper); transform: translateY(-2px); }}
  .toc-card--done {{ background: #FAF7F2; }}
  .toc-card__num {{ font-family: var(--ff-serif); font-weight: 800; font-size: 1.05rem; }}
  .toc-card__essence {{ font-size: 0.86rem; color: var(--c-ink); margin: 6px 0 10px; line-height: 1.55; text-wrap: pretty; }}
  .toc-card__status {{ font-size: 0.78rem; color: var(--c-copper); font-weight: 600; }}
</style>
  <link rel="stylesheet" href="/assets/global-fonts.css">
  <link rel="stylesheet" href="/assets/global-nav.css">
</head>
<body>
<nav class="gnav" role="navigation" aria-label="주요 메뉴">
  <div class="gnav__inner">
    <a href="/" class="gnav__logo">네다바웨이</a>
    <button class="gnav__toggle" type="button" aria-label="메뉴" onclick="document.querySelector('.gnav__links').classList.toggle('is-open')">≡</button>
    <ul class="gnav__links" id="gnavLinks">
      <li><a href="/blog/perspective/" class="gnav__link">관점 노트</a></li>
      <li><a href="/learning.html" class="gnav__link">학습 노트</a></li>
      <li><a href="/ai.html" class="gnav__link">AI 작업실</a></li>
      <li><a href="/programs.html" class="gnav__link">강의·코칭</a></li>
      <li><a href="/sbm.html" class="gnav__link">SBM</a></li>
      <li><a href="/about.html" class="gnav__link">소개</a></li>
      <li><a href="/contact.html" class="gnav__cta">강의 의뢰 →</a></li>
    </ul>
  </div>
</nav>
<header class="book-mast">
  <div class="crumb"><a href="/magazine.html">Observatory</a> · {canon} · {name}</div>
  <h1>{name}</h1>
  <div class="en">{en} · {code}</div>
  <div class="meta-row">
    <span>{canon}</span>
    <span>{lang}</span>
    <span>{total}{unit} · 진행 {done} / {total}</span>
  </div>
  {dl}
</header>
<main>
  <section class="toc">
    <h2>차례 — {total}{unit}</h2>
    <div class="toc-grid">
      {''.join(cards)}
    </div>
  </section>
</main>
<footer class="foot foot--mini">
  <style>.foot--mini{{padding:18px 20px;border-top:1px solid #d8cdb8;background:#efe7d6;font-size:12px;color:#6b6155;line-height:1.6}}.foot--mini .foot--mini__inner{{max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;align-items:center}}.foot--mini strong{{color:#2a241c}}.foot--mini a{{color:#3a322a;text-decoration:none;border-bottom:1px dotted #a4541a}}</style>
  <div class="foot--mini__inner">
    <span>© 2026 <strong>네다바웨이</strong> · 김창환 · <a href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a></span>
    <span>Observatory · SBM 관찰 Atlas</span>
  </div>
</footer>
</body>
</html>'''
    open(os.path.join(ROOT,"magazine",code,"index.html"),"w",encoding="utf-8").write(doc)
    print(f"{code} 인덱스 생성: {done}/{total} 완료")

for c in (sys.argv[1:] or list(META)): build(c)
