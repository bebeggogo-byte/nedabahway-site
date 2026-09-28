#!/usr/bin/env python3
"""Generate /minds/ — 6 MINDS 소개 페이지.

Mind copy comes from .moai/project/six-minds-data.json (same text as the home panel).
Re-run after editing:  python3 scripts/build-minds-page.py
"""
import importlib.util, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('bd', ROOT / 'scripts' / 'build-diagnosis.py')
bd = importlib.util.module_from_spec(spec); spec.loader.exec_module(bd)
esc, head, HEADER, FOOTER, ARROW, SITE = bd.esc, bd.head, bd.HEADER, bd.FOOTER, bd.ARROW, bd.SITE

M = json.loads((ROOT / '.moai/project/six-minds-data.json').read_text(encoding='utf-8'))
COLOR = dict(explorer='#FF6B3D', maker='#FFC857', connector='#3B82F6', supporter='#10B981', thinker='#8B5CF6', enjoyer='#F472B6')
URL = f'{SITE}/minds/'
TITLE = '6 MINDS · 서로 다른 6가지 마음이, 하나의 세상을 만듭니다 | 네다바웨이'
DESC = '탐험·만들기·연결·돕기·생각·즐기기. 누구나 여섯 마음을 다 갖고 있고 배분만 다릅니다. 네다바웨이 6 MINDS의 정의, 신호, 짝 마음, 그리고 재는 방법.'

def mind_sections():
    out = ''
    for i, m in enumerate(M):
        c = COLOR[m['k']]; side = 'is-flip' if i % 2 else ''
        out += f'''  <section class="mp-mind {side}" id="{m['k']}" style="--mc:{c};" aria-labelledby="mt-{m['k']}">
    <div class="wrap mp-mind__in">
      <figure class="mp-mind__fig"><img src="/assets/brand/char-{m['k']}.jpg" width="520" height="520" alt="{esc(m['n'])}을 그린 캐릭터" loading="lazy"><figcaption>&ldquo;{esc(m['q'])}&rdquo;</figcaption></figure>
      <div class="mp-mind__body">
        <p class="mp-mind__k"><span>0{i+1}</span>{m['en']}</p>
        <h2 class="mp-mind__t" id="mt-{m['k']}">{esc(m['n'])}<span class="mp-dot" aria-hidden="true"></span></h2>
        <p class="mp-mind__d">{esc(m['d'])}</p>
        <p class="mp-mind__src"><b>무엇으로 충전되나</b> {esc(m['src'])}</p>
        <ul class="mp-sig">
          <li class="mp-sig--on"><b>켜져 있을 때</b><span>{esc(m['on'])}</span></li>
          <li class="mp-sig--low"><b>눌려 있을 때</b><span>{esc(m['low'])}</span></li>
          <li class="mp-sig--over"><b>넘쳐 있을 때</b><span>{esc(m['over'])}</span></li>
        </ul>
        <p class="mp-ins"><b>예리하게 보면</b> {esc(m['ins'])}</p>
        <div class="mp-act"><p><b>더 쓰고 싶을 때</b> {esc(m['more'])}</p><p><b>줄여야 할 때</b> {esc(m['less'])}</p></div>
        <p class="mp-pair"><b>짝이 되는 마음</b> <a href="#{m['pair_k']}">{esc(m['pair_n'])}</a> · {esc(m['pair_w'])}</p>
      </div>
    </div>
  </section>
'''
    return out

def cards():
    out = ''
    for i, m in enumerate(M):
        c = COLOR[m['k']]
        out += f'''<article class="mp-cardit" style="--mc:{c};"><img src="/assets/cards/mind-{m['k']}-front.png" width="1080" height="1920" alt="{esc(m['n'])} 카드 앞면" loading="lazy"><div class="mp-cardit__b"><b>0{i+1} {esc(m['n'])}</b><span>{m['en']}</span><p><a href="/assets/cards/mind-{m['k']}-front.png" download>앞면 저장</a><a href="/assets/cards/mind-{m['k']}-back.png" download>뒷면 저장</a></p></div></article>'''
    return out

def chips():
    return ''.join(f'<a href="#{m["k"]}" style="--mc:{COLOR[m["k"]]};"><img src="/assets/brand/type-{m["k"]}.png" width="60" height="60" alt="">{esc(m["n"])}</a>' for m in M)

JSONLD = json.dumps({
 "@context": "https://schema.org", "@type": "WebPage", "name": "6 MINDS 소개", "url": URL, "inLanguage": "ko", "description": DESC,
 "about": {"@type": "Organization", "name": "네다바웨이 NEDABAHWAY", "url": SITE},
 "hasPart": [{"@type": "DefinedTerm", "name": m['n'], "description": m['d']} for m in M],
}, ensure_ascii=False)

PAGE = head(TITLE, DESC, URL, 'minds', f'<link rel="stylesheet" href="/assets/minds.css">\n<script type="application/ld+json">{JSONLD}</script>\n') + HEADER + f'''
<main id="main" class="mp">

  <section class="mp-hero">
    <div class="wrap">
      <p class="mp-kicker"><span>6 Minds</span> Different People · Bigger World</p>
      <h1 class="mp-h1">서로 다른 6가지 마음이,<br>하나의 세상을 만듭니다<span class="mp-dot" aria-hidden="true"></span></h1>
      <p class="mp-lead">탐험 · 만들기 · 연결 · 돕기 · 생각 · 즐기기. 누구나 여섯 마음을 <b>다</b> 갖고 있습니다. 다른 것은 요즘 어느 마음을 많이 쓰고, 어느 마음이 눌려 있는지, 그 배분뿐입니다. 그래서 6 MINDS는 "당신은 ○○형"이라고 말하지 않습니다.</p>
      <div class="mp-chips">{chips()}</div>
    </div>
    <img class="mp-hero__board" src="/assets/brand/nw-6minds-board.jpg" width="1536" height="1024" alt="네다바웨이 6 MINDS 브랜드 보드: 여섯 캐릭터와 각 마음의 한 줄 문장" fetchpriority="high">
  </section>

  <section class="mp-why">
    <div class="wrap mp-why__in">
      <div>
        <p class="sec-kicker">Why minds, not types</p>
        <h2 class="mp-h2">유형이 아니라<br>마음이라고 부르는 이유<span class="mp-dot" aria-hidden="true"></span></h2>
      </div>
      <ul class="mp-why__l">
        <li><b>라벨을 붙이지 않습니다</b>"너는 탐험하는 사람"은 판정이고 방어를 부릅니다. "요즘 탐험을 많이 쓰고 있네"는 관찰이라 받아들이기 쉽습니다.</li>
        <li><b>다시 잴 이유가 있습니다</b>성향은 안 바뀌지만 상태는 2주 단위로 바뀝니다. 4주 뒤 다시 재면 "이걸 더 하려고 저걸 줄여 왔구나"가 보입니다.</li>
        <li><b>처방이 곧바로 나옵니다</b>넘친 마음 하나를 줄이고 숨은 마음 하나를 늘리는 것. 코스 여섯 개가 필요 없고 이번 주 한 가지면 됩니다.</li>
        <li><b>총량이 보입니다</b>여섯 마음을 쓰고 나서 채워지는지 비는지를 따로 재기 때문에 에너지 총량이 어디쯤인지, 어디서 새는지가 나옵니다.</li>
      </ul>
    </div>
  </section>

{mind_sections()}
  <section class="mp-how" id="how">
    <div class="wrap">
      <p class="sec-kicker">How we measure</p>
      <h2 class="mp-h2">어떻게 재나<span class="mp-dot" aria-hidden="true"></span></h2>
      <ol class="mp-how__l">
        <li><b>6개 통로</b>마음마다 "이번 주 얼마나 썼나"(사용량)와 "쓰고 나면 채워지나 비나"(충전/고갈)를 따로 묻습니다.</li>
        <li><b>총량 3문항</b>잠 · 움직임 · 의욕. 총량의 60%는 여기서, 40%는 여섯 마음의 충전 평균에서 옵니다.</li>
        <li><b>네 자리</b>사용량 × 충전으로 엔진 / 과부하 / 숨은 자원 / 쉬는 통로. 줄일 것은 과부하, 늘릴 것은 숨은 자원.</li>
        <li><b>쏠림 지수</b>최고 사용량 − 최저 사용량. 한쪽으로 크게 쏠렸는지 고른지를 한 숫자로.</li>
        <li><b>트레이드오프 문장</b>"이걸 더 하려고 저걸 줄여 왔구나." 판정이 아니라 관찰의 언어입니다.</li>
        <li><b>4주 비교</b>최근 6회를 브라우저에 남겨 총량 변화와 마음별 ▲▼를 보여 줍니다.</li>
      </ol>
      <p class="mp-note">15문항, 약 4분. 우울·불안 같은 단어를 쓰지 않고, 총량이 30 미만이면 상담전화를 조용히 안내합니다. 개인 결과는 본인에게만, 기관에는 평균과 총량 변화만 갑니다. 네다바웨이가 직접 설계한 상태 진단 도구이며, 기관 성과 측정에는 표준화 척도를 함께 씁니다.</p>
    </div>
  </section>

  <section class="mp-cards" id="cards">
    <div class="wrap">
      <p class="sec-kicker">Mind cards</p>
      <h2 class="mp-h2">마음 카드 12장<span class="mp-dot" aria-hidden="true"></span></h2>
      <p class="mp-lead">핸드폰 세로 사이즈(1080×1920)로 만든 디지털 카드입니다. 앞면은 정의·충전원·신호 3개·짝 마음, 뒷면은 이번 주 행동과 통찰. 잠금화면, 프로필, 소그룹 나눔에 그대로 씁니다. 진단을 마치면 요즘 가장 많이 쓰는 마음과 이번 주 늘릴 마음의 카드를 바로 받습니다.</p>
      <div class="mp-cards__g">{cards()}</div>
      <p class="mp-note">개인 사용과 교육 현장의 나눔 자료로 자유롭게 쓰세요. 판매·재가공은 문의 후에. 실물 카드 덱(36장)은 <a href="/goods/deck/">굿즈</a>에서 주문합니다.</p>
    </div>
  </section>

  <section class="mp-use">
    <div class="wrap">
      <p class="sec-kicker">Where it lives</p>
      <h2 class="mp-h2">6 MINDS가 쓰이는 곳<span class="mp-dot" aria-hidden="true"></span></h2>
      <div class="mp-use__g">
        <a class="mp-use__c" href="/diagnosis/minds/" style="--mc:#FF6B3D;"><span class="mp-use__k">01 · 무료진단</span><b>요즘 나의 여섯 마음</b><p>15문항 4분. 총량 링, 여섯 막대, 네 자리, 이번 주 한 가지까지 해설지로.</p><span class="mp-use__go">지금 해 보기 {ARROW}</span></a>
        <a class="mp-use__c" href="/programs.html" style="--mc:#3B82F6;"><span class="mp-use__k">02 · 프로그램</span><b>학교 · 기관 · 기업 교육</b><p>첫날과 마지막 날 같은 진단. 개인에게는 해설지, 기관에는 평균과 총량 변화.</p><span class="mp-use__go">프로그램 보기 {ARROW}</span></a>
        <a class="mp-use__c" href="/proposal/" style="--mc:#10B981;"><span class="mp-use__k">03 · 제안서</span><b>자립은 자발성에서 시작된다</b><p>자발성 5단계와 6 MINDS를 엮은 고객 유형별 제안서 4종.</p><span class="mp-use__go">제안서 열기 {ARROW}</span></a>
        <a class="mp-use__c" href="/goods/" style="--mc:#F472B6;"><span class="mp-use__k">04 · 굿즈</span><b>마음을 손에 쥐다</b><p>스티커, 엽서, 포스터, 마음 카드 덱, 4주 노트, 워크숍 키트.</p><span class="mp-use__go">굿즈 보기 {ARROW}</span></a>
      </div>
    </div>
  </section>

  <section class="mp-cta">
    <div class="wrap">
      <h2 class="mp-h2">지금 어느 마음을<br>많이 쓰고 있나요<span class="mp-dot" aria-hidden="true"></span></h2>
      <p class="mp-cta__b"><a class="btn-dark" href="/diagnosis/minds/">요즘 나의 여섯 마음 진단</a><a class="btn-link" href="/contact.html">무료 30분 상담 &#8599;</a></p>
    </div>
  </section>

</main>
''' + FOOTER

out = ROOT / 'minds' / 'index.html'; out.parent.mkdir(exist_ok=True)
out.write_text(PAGE, encoding='utf-8'); print('->', out.relative_to(ROOT))
