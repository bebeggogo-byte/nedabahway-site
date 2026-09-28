#!/usr/bin/env python3
"""Generate /goods/ — 6 MINDS 굿즈 소개 페이지.

Lineup lives in ITEMS below. Product visuals are CSS compositions of the six
character images (no photo needed). Orders go through /contact.html.
Re-run after editing:  python3 scripts/build-goods.py
"""
import importlib.util, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('bd', ROOT / 'scripts' / 'build-diagnosis.py')
bd = importlib.util.module_from_spec(spec); spec.loader.exec_module(bd)
esc, head, HEADER, FOOTER, ARROW, SITE = bd.esc, bd.head, bd.HEADER, bd.FOOTER, bd.ARROW, bd.SITE

URL = f'{SITE}/goods/'
TITLE = '6 MINDS 굿즈 · 마음을 손에 쥐다 | 네다바웨이'
DESC = '티셔츠, 에코백, 볼캡, 스티커, 여섯 마음 키링, 맨투맨, 포스터, 폰 배경화면, 마음 카드 덱, 4주 노트, 워크숍 키트. 네다바웨이 6 MINDS 굿즈 라인업과 단체 주문 안내.'

K = ['explorer', 'maker', 'connector', 'supporter', 'thinker', 'enjoyer']
NAME = dict(explorer='탐험하는 마음', maker='만드는 마음', connector='연결하는 마음', supporter='돕는 마음', thinker='생각하는 마음', enjoyer='즐기는 마음')
QUOTE = dict(explorer='낯선 곳에서 더 넓은 나를 만난다.', maker='좋은 생각은 언제나 현실이 될 수 있다.', connector='좋은 인연이 더 큰 세상을 만든다.', supporter='혼자가 아닌 함께라서 더 멀리.', thinker='질문이 새로운 길을 만든다.', enjoyer='지금, 여기서 행복을 찾는다.')
COLOR = dict(explorer='#FF6B3D', maker='#FFC857', connector='#3B82F6', supporter='#10B981', thinker='#8B5CF6', enjoyer='#F472B6')

def fan(keys):
    return ''.join(f'<figure style="--mc:{COLOR[k]};"><img src="/assets/brand/char-{k}.jpg" width="520" height="520" alt="" loading="lazy"><figcaption>{esc(QUOTE[k])}</figcaption></figure>' for k in keys)

def deck(keys):
    return ''.join(f'<div class="gd-card" style="--mc:{COLOR[k]};"><img src="/assets/brand/char-{k}.jpg" width="520" height="520" alt="" loading="lazy"><b>{esc(NAME[k])}</b><span>켜져 있을 때</span></div>' for k in keys)

def imgs(cls='', keys=K):
    return ''.join(f'<img class="{cls}" src="/assets/brand/char-{k}.jpg" width="520" height="520" alt="" loading="lazy" style="--mc:{COLOR[k]};">' for k in keys)

def photo(name, alt):
    return f'<div class="gd-v gd-v--photo"><img src="/assets/brand/goods-{name}.jpg" alt="{alt}" loading="lazy"></div>'

ITEMS = [
 dict(k='tee', n='티셔츠', en='T-shirt', tag='백 프린트 · 화이트', c='#3B82F6',
      d='등에 여섯 색의 심볼과 NEDABAHWAY. 앞은 비워 두었습니다. 캠프와 워크숍의 단체복이고, 바다 앞에서 찍으면 그대로 브랜드 사진이 됩니다.',
      use='캠프 단체복, 스태프 유니폼, 참여자 기념품.',
      visual=photo('tee', '흰 티셔츠 등판의 네다바웨이 여섯 색 심볼 프린트')),
 dict(k='tote', n='에코백', en='Tote bag', tag='내추럴 캔버스', c='#FFC857',
      d='워크숍 자료와 4주 노트를 담아 가는 가방. 심볼 로고와 JEJU · EDUCATION · LIFE. 기관 프로그램 참여자에게 첫날 지급합니다.',
      use='프로그램 웰컴 키트의 바깥.',
      visual=photo('tote', '심볼 로고가 인쇄된 캔버스 에코백')),
 dict(k='cap', n='볼캡', en='Cap', tag='딥 그린 · 자수', c='#10B981',
      d='제주 바닷바람용. 앞면에 심볼 자수. 야외 캠프와 15분도시 도민참여단 같은 현장 진행에서 스태프 표시로 씁니다.',
      use='야외 프로그램 스태프·참여자 구분.',
      visual=photo('cap', '심볼이 자수된 초록 볼캡')),
 dict(k='sticker', n='스티커 팩', en='Sticker pack', tag='로고 · 문장 · JEJU', c='#FF6B3D',
      d='심볼, 워드마크, "Different People Bigger World", 별과 야자수와 JEJU. 노트북과 텀블러에 붙이는 순간 여섯 마음 이야기가 시작됩니다.',
      use='진단 결과와 함께 나눠 주는 첫 굿즈.',
      visual=photo('sticker', '네다바웨이 로고와 문장이 든 스티커 시트')),
 dict(k='keyring', n='여섯 마음 키링', en='Mind keyrings', tag='6종 · 아크릴', c='#F472B6',
      d='탐험·만들기·연결·돕기·생각·즐기기, 여섯 마음의 모양을 그대로 딴 키링. 진단에서 "이번 주 늘릴 마음" 하나를 골라 들고 다닙니다.',
      use='4주 과정의 "늘릴 것 하나" 상징물.',
      visual=photo('keyring', '여섯 마음 모양의 컬러 아크릴 키링')),
 dict(k='sweat', n='맨투맨', en='Sweatshirt', tag='오트밀 · 작은 심볼', c='#8B5CF6',
      d='가슴에 작은 검정 심볼과 워드마크만. 일상에서 티 나지 않게 입는 버전. 겨울 캠프와 리더 모임용.',
      use='리더·스태프, 겨울 프로그램.',
      visual=photo('sweat', '작은 검정 심볼이 인쇄된 오트밀색 맨투맨')),
 dict(k='poster', n='포스터 2종', en='Posters', tag='A3 · A2 · 블랙 / 제주', c='#1D4ED8',
      d='검정 바탕의 "Different People Bigger World"와 제주 바다 위의 "다른 사람들이 만들어내는, 더 넓은 세상". 교실, 사무실, 소그룹 공간의 첫 화면.',
      use='워크숍 현장, 기관 로비.',
      visual='<div class="gd-v gd-v--pair"><img src="/assets/brand/goods-poster-black.jpg" alt="검정 바탕 Different People Bigger World 포스터" loading="lazy"><img src="/assets/brand/goods-poster-sea.jpg" alt="제주 바다 배경의 다른 사람들이 만들어내는 더 넓은 세상 포스터" loading="lazy"></div>'),
 dict(k='wallpaper', n='폰 배경화면', en='Phone wallpaper', tag='무료 · 제주 바다', c='#3B82F6',
      d='제주 바다와 브랜드 문장. 잠금화면에 두면 하루에 몇 번씩 "더 넓은 세상"을 봅니다. 진단을 마친 분께 무료로 드립니다.',
      use='무료진단 완료 후 다운로드.',
      visual=photo('wallpaper', '제주 바다와 브랜드 문장이 든 폰 잠금화면')),
 dict(k='deck', n='마음 카드 덱', en='Mind card deck', tag='36장 · 진단·나눔용', c='#10B981',
      d='마음 6 × (정의 · 켜짐 · 눌림 · 넘침 · 더 쓸 때 · 줄일 때) = 36장. 진단 없이도 카드를 고르는 것만으로 "요즘 나"를 말하게 됩니다. 코칭, 상담, 소그룹 나눔의 도구.',
      use='코치·상담사·리더가 가장 많이 찾는 품목.',
      visual=f'<div class="gd-v gd-v--deck"><div class="gd-stack">{deck(["thinker","supporter","maker"])}</div></div>'),
 dict(k='note', n='4주 기록 노트', en='4-week journal', tag='재진단 비교표 포함', c='#8B5CF6',
      d='첫 주 진단 결과를 붙이고, 매주 "줄일 것 하나, 늘릴 것 하나"를 적고, 넷째 주 재진단과 비교합니다. 총량이 오른 사람의 방법이 다음 사람의 교재가 됩니다.',
      use='소그룹·동아리 4주 과정의 기본 지급품.',
      visual=f'<div class="gd-v gd-v--note"><div class="gd-book"><div class="gd-book__cover"><img src="/assets/brand/nw-symbol.png" width="200" height="200" alt="" loading="lazy"><b>요즘 나의<br>여섯 마음</b><span>4 WEEKS</span></div><div class="gd-book__pages"></div></div></div>'),
 dict(k='kit', n='워크숍 키트', en='Workshop kit', tag='기관 · 소그룹 · 기업', c='#1D4ED8',
      d='카드 덱 1 + 4주 노트 10권 + 포스터 1 + 스티커 팩 10 + 키링 10 + 리더 진행안. 네다바웨이 프로그램을 도입하는 기관과 리더가 직접 진행하는 소그룹을 위한 한 상자.',
      use='제안서의 "결과물"과 함께 견적에 포함됩니다.',
      visual=f'<div class="gd-v gd-v--kit"><div class="gd-box"><div class="gd-box__lid">6 MINDS<br><small>Workshop Kit</small></div><div class="gd-box__in">{imgs("gd-mini", ["explorer","maker","connector","supporter","thinker","enjoyer"])}</div></div></div>'),
]

def items():
    out = ''
    for i, it in enumerate(ITEMS):
        out += f'''      <article class="gd-item{' gd-item--wide' if it['k'] == 'kit' else ''}" id="{it['k']}" style="--gc:{it['c']};">
        {it['visual']}
        <div class="gd-item__b">
          <p class="gd-item__k">{it['en']} · {esc(it['tag'])}</p>
          <h3 class="gd-item__t">{esc(it['n'])}</h3>
          <p class="gd-item__d">{esc(it['d'])}</p>
          <p class="gd-item__u"><b>쓰임</b> {esc(it['use'])}</p>
          <a class="gd-item__go" href="/contact.html">주문 문의 {ARROW}</a>
        </div>
      </article>
'''
    return out

JSONLD = json.dumps({
 "@context": "https://schema.org", "@type": "CollectionPage", "name": "6 MINDS 굿즈", "url": URL, "inLanguage": "ko", "description": DESC,
 "about": {"@type": "Organization", "name": "네다바웨이 NEDABAHWAY", "url": SITE},
 "hasPart": [{"@type": "Product", "name": it['n'], "description": it['d'], "brand": {"@type": "Brand", "name": "NEDABAHWAY 6 MINDS"}} for it in ITEMS],
}, ensure_ascii=False)

PAGE = head(TITLE, DESC, URL, 'goods', f'<link rel="stylesheet" href="/assets/goods.css">\n<script type="application/ld+json">{JSONLD}</script>\n') + HEADER + f'''
<main id="main" class="gd">

  <section class="gd-hero">
    <div class="wrap gd-hero__in">
      <div>
        <p class="gd-kicker"><span>Goods</span> 6 Minds · Better Together</p>
        <h1 class="gd-h1">마음을<br>손에 쥐다<span class="gd-dot" aria-hidden="true"></span></h1>
        <p class="gd-lead">진단은 4분이지만 마음은 4주 동안 바뀝니다. 그 사이를 붙잡아 두는 물건들. 티셔츠 한 장, 키링 하나, 카드 한 벌이 "요즘 나"를 말하게 합니다. 모두 소량 제작이고, 주문은 문의로 시작합니다.</p>
        <p class="gd-hero__b"><a class="btn-dark" href="/contact.html">주문 · 단체 문의</a><a class="btn-link" href="/minds/">6 MINDS가 뭔가요 &#8599;</a></p>
      </div>
      <div class="gd-hero__art gd-hero__art--photo"><img class="gd-hero__big" src="/assets/brand/goods-tee.jpg" alt="바다 앞에서 네다바웨이 티셔츠를 입은 뒷모습" fetchpriority="high"><img class="gd-hero__sm gd-hero__sm--1" src="/assets/brand/goods-tote.jpg" alt="" loading="lazy"><img class="gd-hero__sm gd-hero__sm--2" src="/assets/brand/goods-keyring.jpg" alt="" loading="lazy"></div>
    </div>
    <div class="gd-marquee" aria-hidden="true"><div class="gd-marquee__t"><span>Tee · Tote · Cap · Sticker · Keyring · Sweat · Poster · Wallpaper · Card deck · Journal · Workshop kit · </span><span>Tee · Tote · Cap · Sticker · Keyring · Sweat · Poster · Wallpaper · Card deck · Journal · Workshop kit · </span></div></div>
  </section>

  <section class="gd-list">
    <div class="wrap">
      <p class="sec-kicker">Lineup</p>
      <h2 class="gd-h2">열한 가지<span class="gd-dot" aria-hidden="true"></span></h2>
      <div class="gd-grid">
{items()}      </div>
    </div>
  </section>

  <section class="gd-how" style="background-image:linear-gradient(rgba(27,27,27,.86),rgba(27,27,27,.94)),url('/assets/brand/goods-camp.jpg');background-size:cover;background-position:center;">
    <div class="wrap gd-how__in">
      <div>
        <p class="sec-kicker">How to order</p>
        <h2 class="gd-h2">주문은 이렇게<span class="gd-dot" aria-hidden="true"></span></h2>
      </div>
      <ol class="gd-steps">
        <li><b>01 문의</b>품목과 수량, 받을 곳을 적어 보내 주세요. 기관·기업은 프로그램과 묶어 견적을 드립니다.</li>
        <li><b>02 확인</b>제작 가능 수량과 일정, 금액을 하루 안에 답합니다. 소량 제작이라 일정은 보통 2~3주입니다.</li>
        <li><b>03 제작·발송</b>입금 확인 뒤 제작에 들어가고, 제주에서 보냅니다. 워크숍 키트는 진행 당일 현장 지급도 됩니다.</li>
      </ol>
    </div>
    <div class="wrap gd-how__note"><p>수익은 네다바웨이(비영리단체)의 청소년·청년 프로그램 운영에 씁니다. 학교·비영리단체는 단체 할인이 있습니다.</p></div>
  </section>

  <section class="gd-cta">
    <div class="wrap">
      <h2 class="gd-h2">먼저 여섯 마음을<br>재어 보세요<span class="gd-dot" aria-hidden="true"></span></h2>
      <p class="gd-cta__b"><a class="btn-dark" href="/diagnosis/minds/">요즘 나의 여섯 마음 진단</a><a class="btn-link" href="/contact.html">주문 · 단체 문의 &#8599;</a></p>
    </div>
  </section>

</main>
''' + FOOTER

out = ROOT / 'goods' / 'index.html'; out.parent.mkdir(exist_ok=True)
out.write_text(PAGE, encoding='utf-8'); print('->', out.relative_to(ROOT))
