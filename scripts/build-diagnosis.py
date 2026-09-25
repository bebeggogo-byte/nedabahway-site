#!/usr/bin/env python3
"""Generate the free-diagnosis pages: /diagnosis/ hub, /diagnosis/learning/, /diagnosis/hexaco/.

Both tests run entirely in the browser. Nothing is sent anywhere; the last
result is kept only in that browser's localStorage so the person can reopen it.

Usage: python3 scripts/build-diagnosis.py
"""
import html, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://www.nedabah.org'

def esc(s): return html.escape(s, quote=False)

# ---------------------------------------------------------------- shared chrome
def head(title, desc, url, og, extra=''):
    t = html.escape(title); d = html.escape(desc)
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="{SITE}/assets/og/{og}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{SITE}/assets/og/{og}.jpg">
<meta name="theme-color" content="#f1ede5">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/assets/sky.css">
<link rel="stylesheet" href="/assets/diag.css">
{extra}</head>
'''

HEADER = '''<body>
<a class="skip-link" href="#main">본문 바로가기</a>
<header class="sk-head">
  <div class="sk-head__in">
    <a class="sk-logo" href="/" aria-label="네다바웨이 홈"><img class="sk-logo__word" src="/assets/brand/nw-wordmark-color.png" width="1128" height="180" alt="NEDABAHWAY"></a>
    <nav class="sk-nav" id="skNav" aria-label="주요 메뉴">
      <a href="/about.html">About</a>
      <a href="/programs.html">Programs</a>
      <a href="/personal.html">Personal</a>
      <a href="/ai/">AI</a>
      <a href="/contact.html">Contact</a>
    </nav>
    <div class="sk-head__r">
      <a class="sk-diag" href="/diagnosis/" aria-current="page"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>무료진단</a>
      <button class="sk-burger" type="button" aria-controls="skNav" aria-expanded="false" aria-label="메뉴 열기">
        <svg class="i-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        <svg class="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
  </div>
</header>
'''

FOOTER = '''<footer class="sk-foot">
  <div class="wrap sk-foot__bottom">
    <span><strong class="sk-foot__logo"><img class="sk-logo__word" src="/assets/brand/nw-wordmark-color.png" width="1128" height="180" alt="NEDABAHWAY"></strong> &copy; 2026 NEDABAHWAY</span>
    <span class="sk-foot__links">
      <a href="https://www.youtube.com/channel/UCWnbno58Hrtiu8fPjrCCTfQ" rel="noopener">YouTube</a>
      <a href="https://blog.naver.com/nedabah" rel="noopener">Blog</a>
      <a href="/privacy.html">개인정보처리방침</a>
      <a href="/locked/" class="sk-foot__vault">자료실</a>
    </span>
  </div>
</footer>
<script src="/assets/sky.js" defer></script>
<script src="/assets/diag.js" defer></script>
<script src="/assets/analytics.js" defer></script>
</body>
</html>
'''

ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
ICON_LIST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>'
ICON_FREE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

# ---------------------------------------------------------------- learning-type data (existing 10-question test)
QQ = [
  {"q":"시험공부를 시작할 때 가장 먼저 하는 행동은?","o":[{"t":"친구에게 연락해서 같이 공부하자고 한다","y":"C"},{"t":"시험 범위를 정리하고 계획표를 만든다","y":"A"},{"t":"가장 중요한 과목부터 바로 문제를 푼다","y":"D"},{"t":"유튜브에서 관련 영상을 먼저 찾아본다","y":"E"}]},
  {"q":"모르는 문제를 만났을 때 나의 반응은?","o":[{"t":"친구나 선생님에게 바로 물어본다","y":"C"},{"t":"교과서를 처음부터 다시 훑으며 단서를 찾는다","y":"A"},{"t":"비슷한 유형 문제를 찾아서 패턴을 분석한다","y":"D"},{"t":"왜 이런 문제가 나왔는지 배경부터 궁금해한다","y":"E"}]},
  {"q":"가장 집중이 잘 되는 환경은?","o":[{"t":"사람이 적당히 있는 카페나 도서관","y":"C"},{"t":"내 방 책상, 정돈된 공간에서 혼자","y":"A"},{"t":"어디든 상관없다. 목표만 명확하면 된다","y":"D"},{"t":"분위기 좋은 곳. 음악이나 조명이 중요하다","y":"E"}]},
  {"q":"새로운 개념을 가장 빨리 이해하는 방법은?","o":[{"t":"누군가가 설명해주는 걸 들으며 대화하기","y":"C"},{"t":"교과서를 정독하고 노트에 정리하기","y":"A"},{"t":"바로 문제를 풀어보면서 감 잡기","y":"D"},{"t":"실생활 예시나 영상으로 맥락 파악하기","y":"E"}]},
  {"q":"계획을 지키지 못했을 때?","o":[{"t":"친구한테 상황을 이야기하고 위로받는다","y":"C"},{"t":"왜 실패했는지 분석하고 계획을 수정한다","y":"A"},{"t":"짜증나지만 밀린 분량을 바로 몰아서 한다","y":"D"},{"t":"그날 기분에 따라 유연하게 공부한다","y":"E"}]},
  {"q":"시험에서 가장 자신 있는 유형은?","o":[{"t":"조별 발표, 토론 등 협력형 과제","y":"C"},{"t":"객관식, 단답형 등 정확한 답이 있는 문제","y":"A"},{"t":"응용 문제, 고난도 문제 도전","y":"D"},{"t":"서술형, 창의형 등 자유롭게 쓰는 문제","y":"E"}]},
  {"q":"동기부여가 되는 순간은?","o":[{"t":"친구들이 나를 인정해줄 때","y":"C"},{"t":"체크리스트를 하나씩 완료할 때","y":"A"},{"t":"등수가 오르거나 목표를 달성했을 때","y":"D"},{"t":"새로운 것을 알게 되는 '아하!' 순간","y":"E"}]},
  {"q":"필기 스타일은?","o":[{"t":"친구 노트를 빌려 보충하거나 같이 정리","y":"C"},{"t":"색깔 펜으로 깔끔하게 정리된 노트","y":"A"},{"t":"중요한 것만 간단하게, 나머지는 문제로","y":"D"},{"t":"마인드맵, 그림, 나만의 기호로 자유롭게","y":"E"}]},
  {"q":"주말에 공부 외 시간은?","o":[{"t":"친구들과 놀거나 이야기","y":"C"},{"t":"다음 주 계획이나 정리 정돈","y":"A"},{"t":"운동, 게임 등 경쟁적 활동","y":"D"},{"t":"새로운 취미나 다양한 시도","y":"E"}]},
  {"q":"\"이건 시험에 안 나와요\"라고 했을 때?","o":[{"t":"친구들이랑 \"그래도 봐둘까?\" 의논","y":"C"},{"t":"시험 범위에서 제외하고 효율화","y":"A"},{"t":"상관없다. 나오는 것만 집중","y":"D"},{"t":"오히려 더 궁금해진다","y":"E"}]}
]
TT = {
  "C":{"shape":"○","name":"커넥터","en":"The Connector","hex":"#10B981","tagline":"함께할 때 최고의 에너지가 나오는 관계형 학습자","desc":"대화와 토론 속에서 개념을 소화하는 유형입니다. 팀 학습에서 빛을 발합니다.","str":"그룹 스터디, 토론, 가르치기에서 최고 성과","weak":"혼자 공부할 때 집중력 저하 위험","strat":"혼자 인출 연습 후 → 친구와 검증하는 2단계 루틴","traits":["관계중심","공감","협력","소통"]},
  "A":{"shape":"□","name":"아키텍트","en":"The Architect","hex":"#3B82F6","tagline":"체계적 설계로 빈틈없이 쌓아가는 구조형 학습자","desc":"계획과 구조 속에서 안정감을 느끼는 유형입니다. 꼼꼼한 정리가 강점입니다.","str":"체계적 노트 정리, 세부 기억력 우수","weak":"계획에 시간 과다 투자, 유연성 부족","strat":"계획:실행 비율을 2:8로 고정, 전체 구조 먼저 파악","traits":["계획주의","꼼꼼함","구조화","성실"]},
  "D":{"shape":"△","name":"드라이버","en":"The Driver","hex":"#FF6B3D","tagline":"목표를 향해 직진하는 성과 지향 학습자","desc":"명확한 목표가 있을 때 최강의 추진력을 발휘하는 유형입니다.","str":"실행력, 시험 집중력, 우선순위 판단 탁월","weak":"과정의 즐거움을 놓치면 번아웃 위험","strat":"성적 목표 외에 '이해도 목표' 병행 설정","traits":["목표지향","경쟁심","효율","추진력"]},
  "E":{"shape":"∼","name":"익스플로러","en":"The Explorer","hex":"#8B5CF6","tagline":"호기심으로 탐험하는 창의 융합 학습자","desc":"호기심과 '왜?'라는 질문이 학습의 원동력인 유형입니다.","str":"서술형·창의형 문제에 강함, 융합 사고","weak":"흥미 없는 과목 쉽게 포기, 반복 학습에 약함","strat":"모든 과목에서 의미 찾기 + 25분 포모도로 집중","traits":["호기심","창의성","융합","탐구"]}
}

# ---------------------------------------------------------------- HEXACO-style data (original items, 6 factors x 6, half reversed)
HEX_ITEMS = [
 ("H", "아무도 모른다 해도 부정한 이득은 취하지 않는다.", False),
 ("E", "큰일을 앞두면 걱정이 앞서고 마음이 불안해진다.", False),
 ("X", "처음 보는 사람들과도 어렵지 않게 어울린다.", False),
 ("A", "나에게 잘못한 사람도 비교적 쉽게 용서한다.", False),
 ("C", "일을 시작하기 전에 계획과 순서를 정한다.", False),
 ("O", "새로운 아이디어나 낯선 방식에 호기심이 생긴다.", False),
 ("H", "원하는 것을 얻기 위해 사람을 치켜세운 적이 있다.", True),
 ("E", "힘든 일이 있어도 감정이 크게 흔들리지 않는다.", True),
 ("X", "여러 사람 앞에 나서는 자리는 되도록 피하고 싶다.", True),
 ("A", "의견이 다르면 끝까지 따져서 이겨야 마음이 편하다.", True),
 ("C", "물건이나 일정을 자주 깜빡하는 편이다.", True),
 ("O", "익숙하고 늘 하던 방식이 가장 편하고 좋다.", True),
 ("H", "값비싼 물건으로 나를 드러내는 데는 관심이 없다.", False),
 ("E", "가까운 사람과 오래 떨어져 있으면 마음이 많이 쓰인다.", False),
 ("X", "나는 대체로 활기차고 에너지가 있는 편이다.", False),
 ("A", "웬만한 불편은 참고 상대를 너그럽게 대한다.", False),
 ("C", "맡은 일은 꼼꼼히 확인하고 끝까지 마무리한다.", False),
 ("O", "예술, 자연, 이야기에서 깊은 감동을 자주 느낀다.", False),
 ("H", "나는 남들보다 특별한 대우를 받을 자격이 있다고 느낀다.", True),
 ("E", "웬만한 위험 앞에서도 별로 두렵지 않다.", True),
 ("X", "모임에서 나는 주로 조용히 듣고만 있는 편이다.", True),
 ("A", "한번 서운하면 그 감정이 꽤 오래 간다.", True),
 ("C", "급하면 대충 넘기고 완성도는 크게 신경 쓰지 않는다.", True),
 ("O", "추상적이거나 철학적인 주제에는 별로 흥미가 없다.", True),
 ("H", "실수를 하면 손해가 나더라도 먼저 인정한다.", False),
 ("E", "힘들 때는 누군가에게 기대고 싶어진다.", False),
 ("X", "사람들과 함께 있을 때 기운이 난다.", False),
 ("A", "상대가 무례하게 굴어도 부드럽게 대응하려 한다.", False),
 ("C", "결정을 내리기 전에 여러 번 생각한다.", False),
 ("O", "남들이 엉뚱하다고 하는 생각도 즐겨 해 본다.", False),
 ("H", "들키지 않을 규칙 위반이라면 그냥 넘어갈 때가 있다.", True),
 ("E", "슬픈 이야기를 들어도 비교적 담담한 편이다.", True),
 ("X", "혼자 있는 시간이 길어져도 별로 아쉽지 않다.", True),
 ("A", "남의 잘못을 지적하지 않고 넘어가기가 어렵다.", True),
 ("C", "해야 할 일을 자주 미룬다.", True),
 ("O", "미술관이나 공연 같은 곳은 지루하게 느껴진다.", True),
]
assert len(HEX_ITEMS) == 36 and all(sum(1 for f,_,_ in HEX_ITEMS if f == k) == 6 for k in 'HEXACO')

HEX_ORDER = ["H","E","X","A","C","O"]
HEX_NAME = {"H":"정직-겸손","E":"정서성","X":"외향성","A":"원만성","C":"성실성","O":"개방성"}
HEX_COLOR = {"H":"#10B981","E":"#F472B6","X":"#FF6B3D","A":"#FFC857","C":"#3B82F6","O":"#8B5CF6"}
HEX_INFO = {
 "H":{"head":"겉과 속이 같은 사람","desc":"규칙이 없어도 정직하게, 특별 대우를 바라지 않는 마음. 이익 앞에서도 양심이 먼저인 결입니다.",
      "high":{"str":"뒤가 없어 사람들이 마음 놓고 다가옵니다.","warn":"남의 얕은 술수를 놓쳐 손해 볼 수 있습니다. 순진함을 지혜로 지키세요."},
      "mid":{"str":"정직과 실리를 상황 따라 조율합니다.","warn":"원칙과 이익 사이에서 흔들릴 때가 있습니다."},
      "low":{"str":"자기표현과 협상에 능해 기회를 잘 잡습니다.","warn":"이익이 앞서면 신뢰를 잃을 수 있습니다. 작은 정직부터 연습하세요."}},
 "E":{"head":"깊이 느끼는 마음","desc":"두려움과 걱정, 소중한 사람을 향한 애착을 얼마나 깊게 느끼는가. 여림이 아니라 세심함입니다.",
      "high":{"str":"공감이 깊고 위험을 미리 살핍니다.","warn":"걱정이 앞서 지칠 수 있습니다. 안심할 자리를 먼저 만드세요."},
      "mid":{"str":"감정과 침착함 사이에서 균형을 잡습니다.","warn":"가끔 스스로 어느 쪽인지 헷갈릴 수 있습니다."},
      "low":{"str":"웬만한 압박에도 담담하고 단단합니다.","warn":"남의 불안을 가볍게 볼 수 있습니다. 한 번 더 물어봐 주세요."}},
 "X":{"head":"사람 사이에서 켜지는 에너지","desc":"사람들과 어울리고 나설 때 힘이 솟는 결. 조용함도 나쁜 것이 아니라 다른 충전 방식입니다.",
      "high":{"str":"분위기를 살리고 사람을 잇습니다.","warn":"조용한 사람의 몫을 덮을 수 있습니다. 여백을 주세요."},
      "mid":{"str":"나설 때와 물러설 때를 가립니다.","warn":"상황에 따라 에너지 차이가 큽니다."},
      "low":{"str":"차분히 관찰하고 깊게 집중합니다.","warn":"좋은 생각을 속에만 둘 수 있습니다. 한마디 꺼내 보세요."}},
 "A":{"head":"품이 넓은 사람","desc":"서운함을 얼마나 쉽게 풀고, 다툼보다 화합을 택하는가. 너그러움의 결입니다.",
      "high":{"str":"갈등을 부드럽게 풀고 오래 품습니다.","warn":"할 말을 삼켜 손해 볼 수 있습니다. 필요한 선은 지키세요."},
      "mid":{"str":"참을 때와 짚을 때를 가립니다.","warn":"상대에 따라 태도 차이가 날 수 있습니다."},
      "low":{"str":"옳고 그름을 분명히 짚어 문제를 바로잡습니다.","warn":"서운함이 오래가면 관계가 굳습니다. 먼저 풀어 보세요."}},
 "C":{"head":"끝까지 해내는 힘","desc":"계획을 세우고 맡은 일을 끝까지 붙드는 결. 신뢰의 바탕입니다.",
      "high":{"str":"믿고 맡길 수 있고 마무리가 깔끔합니다.","warn":"완벽을 좇다 지칠 수 있습니다. 충분히 좋음도 허락하세요."},
      "mid":{"str":"중요한 일에는 꼼꼼하고 나머지는 유연합니다.","warn":"우선순위에 따라 완성도가 갈립니다."},
      "low":{"str":"유연하고 빠르게 큰 그림을 봅니다.","warn":"마무리가 새어 나갈 수 있습니다. 작은 체크리스트를 두세요."}},
 "O":{"head":"새로움에 열린 눈","desc":"새 아이디어, 예술, 깊은 질문에 끌리는 호기심의 결. 상상과 배움의 문입니다.",
      "high":{"str":"새 길을 먼저 보고 배움이 넘칩니다.","warn":"익숙한 기본을 소홀히 할 수 있습니다. 기초도 챙기세요."},
      "mid":{"str":"익숙함과 새로움을 상황에 맞게 씁니다.","warn":"때때로 어느 쪽에도 깊이 들지 못할 수 있습니다."},
      "low":{"str":"검증된 방식으로 안정감을 줍니다.","warn":"새 기회를 놓칠 수 있습니다. 가끔 낯선 문을 열어 보세요."}},
}

# ---------------------------------------------------------------- hub
def hub():
    title = '무료진단 — 학습 유형 진단지 · 성품 6요인(HEXACO) 진단 | 네다바웨이'
    desc = '회원가입 없이 바로 하는 무료진단 두 가지. 10문항 2분 학습 유형 진단지, 36문항 6분 성품 6요인 진단. 결과는 그 자리에서 바로 보고 복사할 수 있습니다.'
    url = f'{SITE}/diagnosis/'
    ld = json.dumps({"@context":"https://schema.org","@type":"CollectionPage","name":"무료진단","url":url,"description":desc,"inLanguage":"ko",
                     "isPartOf":{"@type":"WebSite","name":"네다바웨이","url":SITE+"/"}}, ensure_ascii=False)
    out = head(title, desc, url, 'diagnosis', f'<script type="application/ld+json">\n{ld}\n</script>\n') + HEADER
    out += f'''
<main id="main">
<section class="sec" aria-labelledby="dgTitle" style="padding-top:72px;">
  <div class="wrap">
    <div class="sec-head reveal" style="margin-bottom:44px;">
      <p class="sec-kicker">Free Diagnosis</p>
      <h1 class="sec-title" id="dgTitle">무료진단, 둘 중 하나를<br>고르세요<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:18px;">회원가입도, 이메일도 필요 없습니다. 고르고, 답하고, 그 자리에서 결과를 봅니다. 결과는 복사해서 상담 신청서에 붙여 넣으면 첫 대화가 훨씬 빨라집니다.</p>
    </div>

    <div class="dg-pick">
      <a class="dg-box dg-box--learning reveal" href="/diagnosis/learning/">
        <span class="dg-box__k">01 · 학습 유형 진단지</span>
        <span class="dg-box__t">나는 어떻게 배울 때<br>가장 잘 배우는가</span>
        <span class="dg-box__d">공부 상황 10가지에서 내가 실제로 하는 행동을 고릅니다. 커넥터·아키텍트·드라이버·익스플로러 네 유형 중 나의 학습 유형과 비율이 나옵니다.</span>
        <span class="dg-meta"><span>{ICON_LIST}10문항</span><span>{ICON_CLOCK}약 2분</span><span>{ICON_FREE}무료 · 가입 없음</span></span>
        <span class="dg-shot"><img src="/assets/diagnosis/learning-result.jpg" width="1200" height="900" alt="학습 유형 진단 결과 예시: 나의 유형 이름과 네 유형 비율 막대, 강점·주의할 점·추천 전략 카드" loading="lazy"><span class="dg-shot__cap">완료하면 이렇게 나옵니다</span></span>
        <ul class="dg-get">
          <li>나의 학습 유형 이름과 한 줄 설명</li>
          <li>네 유형 비율 막대 (섞여 있는 정도까지)</li>
          <li>강점 · 주의할 점 · 이번 주 바로 쓰는 공부 전략</li>
        </ul>
        <span class="dg-box__cta"><span class="btn-go">학습 유형 진단 시작 {ARROW}</span></span>
      </a>

      <a class="dg-box dg-box--hexaco reveal" href="/diagnosis/hexaco/">
        <span class="dg-box__k">02 · 성품 6요인 진단 (HEXACO)</span>
        <span class="dg-box__t">나는 어떤 결의<br>사람인가</span>
        <span class="dg-box__d">정직-겸손·정서성·외향성·원만성·성실성·개방성, 여섯 요인을 36문항으로 살핍니다. 우열 없는 여섯 빛깔의 조합으로 나를 봅니다.</span>
        <span class="dg-meta"><span>{ICON_LIST}36문항</span><span>{ICON_CLOCK}약 6분</span><span>{ICON_FREE}무료 · 가입 없음</span></span>
        <span class="dg-shot"><img src="/assets/diagnosis/hexaco-result.jpg" width="1200" height="900" alt="성품 6요인 진단 결과 예시: 육각형 레이더 그래프와 요인별 높음·중간·낮음 띠, 강점과 주의할 점" loading="lazy"><span class="dg-shot__cap">완료하면 이렇게 나옵니다</span></span>
        <ul class="dg-get">
          <li>여섯 요인을 한눈에 보는 육각형 그래프</li>
          <li>요인마다 높음 · 중간 · 낮음 띠와 해설</li>
          <li>가장 선명한 결과 자라는 결, 각각의 강점과 주의할 점</li>
        </ul>
        <span class="dg-box__cta"><span class="btn-go">성품 6요인 진단 시작 {ARROW}</span></span>
      </a>
    </div>

    <p class="dg-note"><strong>답은 어디에도 전송되지 않습니다.</strong> 진단은 이 브라우저 안에서만 돌아가고, 마지막 결과만 이 기기에 남아 다시 열어 볼 수 있습니다. 성품 진단은 HEXACO 6요인 모형의 구조를 빌려 네다바웨이가 새로 쓴 문항이며, 심리검사나 의학적 판단이 아닌 자기이해와 코칭의 출발점입니다.</p>

    <div class="mailcard reveal" style="margin-top:56px;">
      <h2 class="mailcard__t">결과를 들고 30분 무료 상담으로</h2>
      <p class="mailcard__d">진단 결과를 복사해 상담 신청서에 붙여 넣으면, 첫 30분을 설명 대신 설계에 씁니다. 학생도 어른도 환영합니다.</p>
      <a class="mailcard__btn" href="/contact.html#consult-form">무료 상담 신청하기 <span aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</section>
</main>

''' + FOOTER
    return out

# ---------------------------------------------------------------- learning test page
def learning():
    title = '학습 유형 진단지 — 10문항 2분 무료진단 | 네다바웨이'
    desc = '공부 상황 10가지에서 내가 실제로 하는 행동을 고르면 커넥터·아키텍트·드라이버·익스플로러 중 나의 학습 유형과 비율, 강점·주의점·이번 주 전략이 바로 나옵니다.'
    url = f'{SITE}/diagnosis/learning/'
    ld = json.dumps({"@context":"https://schema.org","@type":"WebPage","name":"학습 유형 진단지","url":url,"description":desc,"inLanguage":"ko"}, ensure_ascii=False)
    data = json.dumps({"QQ":QQ,"TT":TT}, ensure_ascii=False)
    out = head(title, desc, url, 'diag-learning', f'<script type="application/ld+json">\n{ld}\n</script>\n') + HEADER
    out += f'''
<main id="main">
<section class="sec" aria-labelledby="lgTitle" style="padding-top:72px;">
  <div class="wrap dg-wrap">
    <p class="ai-crumb" style="font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.08em;color:var(--cobalt);margin-bottom:12px;"><a href="/diagnosis/">&larr; 무료진단</a> · 01 학습 유형 진단지</p>
    <div class="sec-head" style="margin-bottom:28px;">
      <h1 class="sec-title" id="lgTitle">학습 유형 진단지<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:14px;">10문항, 약 2분. 정답은 없습니다. 바람직한 답이 아니라 <strong>내가 실제로 하는 행동</strong>을 고르세요.</p>
    </div>

    <div class="dg-top" hidden><div class="dg-top__bar"><div class="dg-top__fill"></div></div><span class="dg-top__n">0 / 10</span></div>

    <div id="dgIntro" class="dg-intro">
      <p class="dg-intro__t">공부 상황 10가지,<br>나는 어떻게 움직이는가</p>
      <p class="dg-intro__d">커넥터(함께), 아키텍트(구조), 드라이버(목표), 익스플로러(호기심). 네 유형은 우열이 아니라 배우는 방식의 차이입니다. 결과에는 유형 비율과 이번 주 바로 쓰는 공부 전략이 함께 나옵니다.</p>
      <div class="dg-intro__cta"><button type="button" class="btn-go" id="dgStart">진단 시작 {ARROW}</button><button type="button" class="btn-link" id="dgResume" hidden style="background:none;border:0;cursor:pointer;">지난 결과 다시 보기 &#8599;</button></div>
    </div>

    <div id="dgQuiz" hidden></div>
    <div id="dgResult" hidden></div>
  </div>
</section>
</main>

<script id="dgData" type="application/json">{data}</script>
<script>
document.addEventListener('DOMContentLoaded',function(){{
  var D=JSON.parse(document.getElementById('dgData').textContent), QQ=D.QQ, TT=D.TT, N=QQ.length;
  var ans=[], cur=0;
  var $=function(id){{return document.getElementById(id);}};
  function esc(s){{return NWD.esc(s);}}
  function start(){{ans=[];cur=0;NWD.show('dgQuiz');render();}}
  function render(){{
    var q=QQ[cur], L='ABCD';
    NWD.progress(cur, N);
    var h='<div class="dg-q"><p class="dg-q__k">질문 '+(cur+1)+' / '+N+'</p><p class="dg-q__t">'+esc(q.q)+'</p><div class="dg-opts" role="group" aria-label="선택지">';
    q.o.forEach(function(o,j){{ h+='<button type="button" class="dg-opt'+(ans[cur]===o.y?' is-picked':'')+'" data-y="'+o.y+'"><span class="dg-opt__l">'+L[j]+'</span><span>'+esc(o.t)+'</span></button>'; }});
    h+='</div></div><div class="dg-nav"><button type="button" class="dg-back" id="dgBack"'+(cur===0?' disabled':'')+'>&larr; 이전 질문</button><span style="font-size:13px;color:var(--text-4);">고르면 다음으로 넘어갑니다</span></div>';
    $('dgQuiz').innerHTML=h;
    $('dgQuiz').querySelectorAll('.dg-opt').forEach(function(b){{ b.addEventListener('click',function(){{ pick(b.getAttribute('data-y'), b); }}); }});
    $('dgBack').addEventListener('click',function(){{ if(cur>0){{cur--;render();NWD.scrollToQuiz();}} }});
  }}
  function pick(y,btn){{
    ans[cur]=y; btn.parentElement.querySelectorAll('.dg-opt').forEach(function(b){{b.classList.remove('is-picked');b.disabled=true;}}); btn.classList.add('is-picked');
    setTimeout(function(){{ if(cur<N-1){{cur++;render();NWD.scrollToQuiz();}} else {{ finish(); }} }},260);
  }}
  function score(){{ var s={{C:0,A:0,D:0,E:0}}; ans.forEach(function(y){{s[y]++;}}); return s; }}
  function finish(){{ var s=score(); NWD.save('learning',{{s:s,at:new Date().toISOString()}}); showResult(s); }}
  function showResult(s){{
    var keys=Object.keys(s).sort(function(a,b){{return s[b]-s[a];}}), m=keys[0], t=TT[m];
    var order=['C','A','D','E'];
    var h='<div class="dg-res" style="--rc:'+t.hex+';"><p class="dg-res__k">나의 학습 유형</p>';
    h+='<div class="dg-res__head"><span class="dg-res__badge" aria-hidden="true">'+t.shape+'</span><div><p class="dg-res__t">'+esc(t.name)+'형</p><p class="dg-res__en">'+esc(t.en)+'</p></div></div>';
    h+='<p class="dg-res__tag">“'+esc(t.tagline)+'”</p><p class="dg-res__d">'+esc(t.desc)+'</p>';
    h+='<div class="dg-chips">'+t.traits.map(function(x){{return '<span>'+esc(x)+'</span>';}}).join('')+'</div>';
    h+='<div class="dg-bars" role="list" aria-label="유형 비율">'+order.map(function(k){{var p=Math.round(s[k]/N*100);return '<div class="dg-bar" role="listitem" style="--bc:'+TT[k].hex+';"><span class="dg-bar__l">'+esc(TT[k].name)+'</span><span class="dg-bar__tr"><span class="dg-bar__f" style="width:'+p+'%;display:block;"></span></span><span class="dg-bar__v">'+p+'%</span></div>';}}).join('')+'</div>';
    h+='<div class="dg-cards"><div class="dg-card" style="--cc:'+t.hex+';"><p class="dg-card__k">강점</p><p class="dg-card__d">'+esc(t.str)+'</p></div><div class="dg-card" style="--cc:#FF6B3D;"><p class="dg-card__k">주의할 점</p><p class="dg-card__d">'+esc(t.weak)+'</p></div><div class="dg-card" style="--cc:#1D4ED8;"><p class="dg-card__k">이번 주 전략</p><p class="dg-card__d">'+esc(t.strat)+'</p></div></div>';
    h+='<div class="dg-actions"><button type="button" class="btn-go" id="dgCopy">결과 복사</button><button type="button" class="btn-ghost" id="dgRetry">다시 진단하기</button></div>';
    h+='</div>';
    h+='<div class="dg-next"><p class="dg-next__t">'+esc(t.name)+'형에게 맞는 공부법을 1:1로 설계합니다</p><p class="dg-next__d">퍼스널 트레이닝 코스는 학습 유형 진단에서 출발해 환경 설계, SPARK 학습법, 시험 전략까지 4단계 12교시로 이어집니다. 첫 30분 상담은 무료입니다.</p><div class="dg-next__cta"><a class="btn-dark" href="/contact.html#consult-form">무료 30분 상담 신청</a><a class="btn-link" href="/personal.html">퍼스널 트레이닝 코스 보기 &#8599;</a></div></div>';
    h+='<p class="dg-foot">이 결과는 이 기기 브라우저에만 저장됩니다. 다른 사람과 나누려면 결과 복사를 눌러 붙여 넣으세요.</p>';
    $('dgResult').innerHTML=h; NWD.show('dgResult');
    $('dgCopy').addEventListener('click',function(){{
      var txt='[학습 유형 진단 결과] '+t.name+'형 ('+t.en+')\\n'+t.tagline+'\\n'+order.map(function(k){{return TT[k].name+' '+Math.round(s[k]/N*100)+'%';}}).join(' · ')+'\\n강점: '+t.str+'\\n주의: '+t.weak+'\\n전략: '+t.strat+'\\n— nedabah.org/diagnosis/learning/';
      NWD.copy(txt,$('dgCopy'));
    }});
    $('dgRetry').addEventListener('click',function(){{ NWD.clear('learning'); start(); }});
  }}
  $('dgStart').addEventListener('click',start);
  var last=NWD.load('learning');
  if(last&&last.s){{ $('dgResume').hidden=false; $('dgResume').addEventListener('click',function(){{showResult(last.s);}}); }}
  if(location.hash==='#result'&&last&&last.s){{ showResult(last.s); }}
  if(location.hash==='#demo'){{ showResult({{C:2,A:5,D:2,E:1}}); }}
}});
</script>
''' + FOOTER
    return out

# ---------------------------------------------------------------- hexaco test page
def hexaco():
    title = '성품 6요인 진단 (HEXACO) — 36문항 6분 무료진단 | 네다바웨이'
    desc = '정직-겸손·정서성·외향성·원만성·성실성·개방성. 36문항으로 여섯 요인의 결을 살피고 육각형 그래프와 요인별 강점·주의점을 바로 봅니다. 회원가입 없음.'
    url = f'{SITE}/diagnosis/hexaco/'
    ld = json.dumps({"@context":"https://schema.org","@type":"WebPage","name":"성품 6요인 진단 (HEXACO)","url":url,"description":desc,"inLanguage":"ko"}, ensure_ascii=False)
    items = [{"f":f,"t":t,"r":r} for f,t,r in HEX_ITEMS]
    data = json.dumps({"ITEMS":items,"ORDER":HEX_ORDER,"NAME":HEX_NAME,"COLOR":HEX_COLOR,"INFO":HEX_INFO}, ensure_ascii=False)
    out = head(title, desc, url, 'diag-hexaco', f'<script type="application/ld+json">\n{ld}\n</script>\n') + HEADER
    out += f'''
<main id="main">
<section class="sec" aria-labelledby="hxTitle" style="padding-top:72px;">
  <div class="wrap dg-wrap">
    <p style="font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.08em;color:var(--cobalt);margin-bottom:12px;"><a href="/diagnosis/">&larr; 무료진단</a> · 02 성품 6요인 진단</p>
    <div class="sec-head" style="margin-bottom:28px;">
      <h1 class="sec-title" id="hxTitle">성품 6요인 진단<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:14px;">36문항, 약 6분. 문장마다 <strong>평소의 나</strong>에 얼마나 가까운지 다섯 단계로 답합니다. 높고 낮음에 우열은 없습니다.</p>
    </div>

    <div class="dg-top" hidden><div class="dg-top__bar"><div class="dg-top__fill"></div></div><span class="dg-top__n">0 / 36</span></div>

    <div id="dgIntro" class="dg-intro">
      <p class="dg-intro__t">여섯 빛깔의 조합으로<br>나를 봅니다</p>
      <p class="dg-intro__d">정직-겸손(H) · 정서성(E) · 외향성(X) · 원만성(A) · 성실성(C) · 개방성(O). HEXACO 6요인 모형의 구조를 빌려 네다바웨이가 새로 쓴 문항입니다. 결과는 육각형 그래프와 요인마다의 강점·주의할 점으로 나옵니다.</p>
      <div class="dg-intro__cta"><button type="button" class="btn-go" id="dgStart">진단 시작 {ARROW}</button><button type="button" class="btn-link" id="dgResume" hidden style="background:none;border:0;cursor:pointer;">지난 결과 다시 보기 &#8599;</button></div>
    </div>

    <div id="dgQuiz" hidden></div>
    <div id="dgResult" hidden></div>
  </div>
</section>
</main>

<script id="dgData" type="application/json">{data}</script>
<script>
document.addEventListener('DOMContentLoaded',function(){{
  var D=JSON.parse(document.getElementById('dgData').textContent), IT=D.ITEMS, N=IT.length, ORDER=D.ORDER, NAME=D.NAME, COLOR=D.COLOR, INFO=D.INFO;
  var LK=['전혀 아니다','아닌 편이다','보통이다','그런 편이다','매우 그렇다'];
  var ans=[], cur=0;
  var $=function(id){{return document.getElementById(id);}};
  function esc(s){{return NWD.esc(s);}}
  function start(){{ans=[];cur=0;NWD.show('dgQuiz');render();}}
  function render(){{
    var q=IT[cur];
    NWD.progress(cur, N);
    var h='<div class="dg-q"><p class="dg-q__k">문항 '+(cur+1)+' / '+N+'</p><p class="dg-q__t">'+esc(q.t)+'</p><div class="dg-likert" role="group" aria-label="평소의 나와 얼마나 가까운가">';
    for(var v=1;v<=5;v++){{ h+='<button type="button" class="dg-lk'+(ans[cur]===v?' is-picked':'')+'" data-v="'+v+'"><span class="dg-lk__dot" aria-hidden="true"></span><span class="dg-lk__t">'+LK[v-1]+'</span></button>'; }}
    h+='</div></div><div class="dg-nav"><button type="button" class="dg-back" id="dgBack"'+(cur===0?' disabled':'')+'>&larr; 이전 문항</button><span style="font-size:13px;color:var(--text-4);">고르면 다음으로 넘어갑니다</span></div>';
    $('dgQuiz').innerHTML=h;
    $('dgQuiz').querySelectorAll('.dg-lk').forEach(function(b){{ b.addEventListener('click',function(){{ pick(parseInt(b.getAttribute('data-v'),10), b); }}); }});
    $('dgBack').addEventListener('click',function(){{ if(cur>0){{cur--;render();NWD.scrollToQuiz();}} }});
  }}
  function pick(v,btn){{
    ans[cur]=v; btn.parentElement.querySelectorAll('.dg-lk').forEach(function(b){{b.classList.remove('is-picked');b.disabled=true;}}); btn.classList.add('is-picked');
    setTimeout(function(){{ if(cur<N-1){{cur++;render();NWD.scrollToQuiz();}} else {{ finish(); }} }},220);
  }}
  function avgs(a){{ var sum={{}},cnt={{}}; ORDER.forEach(function(k){{sum[k]=0;cnt[k]=0;}}); IT.forEach(function(q,i){{ if(a[i]){{ var v=q.r?(6-a[i]):a[i]; sum[q.f]+=v; cnt[q.f]++; }} }}); var o={{}}; ORDER.forEach(function(k){{o[k]=cnt[k]?Math.round(sum[k]/cnt[k]*100)/100:0;}}); return o; }}
  function band(v){{ return v<2.6?'low':(v>3.6?'high':'mid'); }}
  function bandKo(b){{ return b==='high'?'높음':(b==='low'?'낮음':'중간'); }}
  function hexSvg(av){{
    var cx=200,cy=200,R=150,n=6,pts=[],grid='',axes='',labels='';
    function pt(i,r){{ var a=-Math.PI/2+i*2*Math.PI/n; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }}
    [1,2,3,4,5].forEach(function(g){{ var r=R*g/5; grid+='<polygon points="'+ORDER.map(function(_,i){{return pt(i,r).map(function(x){{return x.toFixed(1);}}).join(',');}}).join(' ')+'" fill="none" stroke="#d6cfc1" stroke-width="'+(g===5?1.6:1)+'"/>'; }});
    ORDER.forEach(function(k,i){{ var p=pt(i,R), l=pt(i,R+30); axes+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'" stroke="#d6cfc1"/>'; labels+='<text x="'+l[0].toFixed(1)+'" y="'+(l[1]+5).toFixed(1)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#1b1b1b">'+esc(NAME[k])+'</text><text x="'+l[0].toFixed(1)+'" y="'+(l[1]+21).toFixed(1)+'" text-anchor="middle" font-size="12" font-weight="800" fill="'+COLOR[k]+'">'+av[k].toFixed(1)+'</text>'; }});
    var poly=ORDER.map(function(k,i){{ return pt(i,R*av[k]/5).map(function(x){{return x.toFixed(1);}}).join(','); }}).join(' ');
    var dots=ORDER.map(function(k,i){{ var p=pt(i,R*av[k]/5); return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="6" fill="'+COLOR[k]+'" stroke="#1b1b1b" stroke-width="1.5"/>'; }}).join('');
    return '<svg viewBox="0 0 400 400" role="img" aria-label="여섯 요인 육각형 그래프">'+grid+axes+'<polygon points="'+poly+'" fill="rgba(29,78,216,.18)" stroke="#1D4ED8" stroke-width="2.5" stroke-linejoin="round"/>'+dots+labels+'</svg>';
  }}
  function finish(){{ var av=avgs(ans); NWD.save('hexaco',{{av:av,at:new Date().toISOString()}}); showResult(av); }}
  function showResult(av){{
    var hi=ORDER[0],lo=ORDER[0]; ORDER.forEach(function(k){{ if(av[k]>av[hi])hi=k; if(av[k]<av[lo])lo=k; }});
    var h='<div class="dg-res" style="--rc:'+COLOR[hi]+';"><p class="dg-res__k">나의 여섯 빛깔</p>';
    h+='<div class="dg-res__head"><span class="dg-res__badge" aria-hidden="true">'+hi+'</span><div><p class="dg-res__t">'+esc(INFO[hi].head)+'</p><p class="dg-res__en">가장 선명한 결 · '+esc(NAME[hi])+'</p></div></div>';
    h+='<p class="dg-res__tag">지금 가장 선명한 빛깔은 「'+esc(NAME[hi])+'」, 앞으로 자라는 결은 「'+esc(NAME[lo])+'」입니다.</p>';
    h+='<p class="dg-res__d">점수는 1점에서 5점 사이 평균입니다. 높다고 좋고 낮다고 나쁜 것이 아니라, 여섯 결이 어떻게 섞여 있는지가 나입니다.</p>';
    h+='<div class="dg-hex">'+hexSvg(av)+'</div>';
    h+='<div class="dg-fac">'+ORDER.map(function(k){{ var b=band(av[k]), inf=INFO[k], bd=inf[b]; return '<div class="dg-f" style="--fc:'+COLOR[k]+';"><div class="dg-f__head"><span class="dg-f__n">'+esc(NAME[k])+'<small>'+k+'</small></span><span class="dg-f__b dg-f__b--'+b+'">'+bandKo(b)+' · '+av[k].toFixed(1)+'</span></div><div class="dg-f__tr"><div class="dg-f__fl" style="width:'+Math.round(av[k]/5*100)+'%;"></div></div><p class="dg-f__h">'+esc(inf.head)+'</p><p class="dg-f__d">'+esc(inf.desc)+'</p><p class="dg-f__sw"><b>강점</b> '+esc(bd.str)+'<br><b>주의</b> '+esc(bd.warn)+'</p></div>'; }}).join('')+'</div>';
    h+='<div class="dg-actions"><button type="button" class="btn-go" id="dgCopy">결과 복사</button><button type="button" class="btn-ghost" id="dgRetry">다시 진단하기</button></div>';
    h+='</div>';
    h+='<div class="dg-next"><p class="dg-next__t">여섯 결을 일과 관계에 어떻게 쓸지, 30분 무료 상담</p><p class="dg-next__d">결과를 복사해 상담 신청서에 붙여 넣으세요. 진로, 학습, 리더십 중 지금 필요한 곳부터 함께 설계합니다.</p><div class="dg-next__cta"><a class="btn-dark" href="/contact.html#consult-form">무료 30분 상담 신청</a><a class="btn-link" href="/personal.html">퍼스널 트레이닝 코스 보기 &#8599;</a></div></div>';
    h+='<p class="dg-foot">HEXACO 6요인 모형의 구조를 빌린 네다바웨이 자작 문항입니다. 규준(norm) 비교가 아닌 1~5점 평균과 띠로만 해석하며, 심리검사나 의학적 판단이 아닙니다. 결과는 이 기기 브라우저에만 저장됩니다.</p>';
    $('dgResult').innerHTML=h; NWD.show('dgResult');
    $('dgCopy').addEventListener('click',function(){{
      var txt='[성품 6요인 진단 결과]\\n'+ORDER.map(function(k){{return NAME[k]+'('+k+') '+av[k].toFixed(1)+' '+bandKo(band(av[k]));}}).join(' · ')+'\\n가장 선명한 결: '+NAME[hi]+' / 자라는 결: '+NAME[lo]+'\\n— nedabah.org/diagnosis/hexaco/';
      NWD.copy(txt,$('dgCopy'));
    }});
    $('dgRetry').addEventListener('click',function(){{ NWD.clear('hexaco'); start(); }});
  }}
  $('dgStart').addEventListener('click',start);
  var last=NWD.load('hexaco');
  if(last&&last.av){{ $('dgResume').hidden=false; $('dgResume').addEventListener('click',function(){{showResult(last.av);}}); }}
  if(location.hash==='#result'&&last&&last.av){{ showResult(last.av); }}
  if(location.hash==='#demo'){{ showResult({{H:4.2,E:3.1,X:2.4,A:3.8,C:4.5,O:3.3}}); }}
}});
</script>
''' + FOOTER
    return out

def write(p, s):
    p = ROOT / p; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(s, encoding='utf-8')

write('diagnosis/index.html', hub())
write('diagnosis/learning/index.html', learning())
write('diagnosis/hexaco/index.html', hexaco())
print('ok: diagnosis/index.html diagnosis/learning/index.html diagnosis/hexaco/index.html')
