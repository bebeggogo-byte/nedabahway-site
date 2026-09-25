#!/usr/bin/env python3
"""Generate /diagnosis/minds/ — 「요즘 나의 여섯 마음」 15문항 상태 진단 (2026-09-25 전략 브리프 기준).

Six minds x (사용량 0~4 + 충전/고갈 -2~+2) + 총량 3문항. No type labels: all six are shown as energy
bars sorted by use, colored by charge. Result = total ring + bars + 알아차림·이번 주 조정·총량 키우기.

Usage: python3 scripts/build-minds.py   (imports chrome from build-diagnosis.py)
"""
import importlib.util, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://www.nedabah.org'
spec = importlib.util.spec_from_file_location('bd', ROOT / 'scripts' / 'build-diagnosis.py')
bd = importlib.util.module_from_spec(spec); spec.loader.exec_module(bd)
head, HEADER, FOOTER, ARROW, esc = bd.head, bd.HEADER, bd.FOOTER, bd.ARROW, bd.esc

MINDS = [
 dict(k='explorer', name='탐험', en='Explorer', color='#FF6B3D', verb='새로운 것을 시도하고 낯선 곳에 가 보는 마음',
      use='처음 해 본 일이 있었다', charge='처음 해 본 일을 하고 나면 보통 어땠나요?',
      well='이번 주 처음 해 본 일이 있다', low='같은 하루가 반복되고 궁금한 게 없다', over='시작만 많고 끝낸 게 없다',
      less='시작을 하나 줄이고, 시작한 것 중 하나만 이번 주에 끝냅니다.', more='가 본 적 없는 길로 20분 걷거나, 안 먹어 본 것 하나를 먹어 봅니다.'),
 dict(k='maker', name='만들기', en='Maker', color='#FFC857', verb='손으로 무언가를 완성해 내는 마음',
      use='결과물 하나를 끝까지 만들었다', charge='무언가를 끝까지 만들고 나면 보통 어땠나요?',
      well='결과물 하나를 끝까지 만들었다', low='해야 할 것만 있고 만든 게 없다', over='쉬지 못하고 계속 생산만 한다',
      less='만들기를 하루 1시간 덜, 끝낼 것 하나만 정합니다.', more='30분 안에 끝나는 작은 것 하나를 완성합니다. 정리, 요리, 글 한 편.'),
 dict(k='connector', name='연결', en='Connector', color='#3B82F6', verb='사람과 이어지고 대화하는 마음',
      use='속마음을 나눈 사람이 있었다', charge='속마음을 나누고 나면 보통 어땠나요?',
      well='속마음을 나눈 사람이 있다', low='며칠째 제대로 말한 사람이 없다', over='남의 일정에 끌려다녀 내 시간이 없다',
      less='약속을 하나 줄이고, 그 시간을 내 것으로 비워 둡니다.', more='한 사람에게 요즘 마음을 세 줄로 보냅니다.'),
 dict(k='supporter', name='돕기', en='Supporter', color='#10B981', verb='누군가를 돌보고 보탬이 되는 마음',
      use='누군가를 도와주고 고맙다는 말을 들었다', charge='누군가를 도와주고 나면 보통 어땠나요?',
      well='도와주고 고맙다는 말을 들었다', low='내 문제만으로 벅차 남을 볼 여유가 없다', over='남 챙기느라 내 끼니·잠을 거른다',
      less='남을 챙기기 전에 내 끼니와 잠을 먼저 챙깁니다. 부탁 하나는 거절합니다.', more='작은 도움 하나를 자원해서 합니다. 문 잡아 주기, 설명해 주기.'),
 dict(k='thinker', name='생각', en='Thinker', color='#8B5CF6', verb='멈춰서 돌아보고 이해하는 마음',
      use='하루를 돌아보고 정리한 순간이 있었다', charge='하루를 돌아보고 나면 보통 어땠나요?',
      well='하루를 돌아보고 정리한 순간이 있다', low='생각할 틈 없이 반응만 하며 지낸다', over='생각만 맴돌고 행동으로 못 옮긴다',
      less='생각을 10분으로 제한하고, 끝에 행동 하나를 적습니다.', more='자기 전 3줄, 오늘 있었던 일과 느낌을 적습니다.'),
 dict(k='enjoyer', name='즐기기', en='Enjoyer', color='#F472B6', verb='지금 이 순간을 맛보고 회복하는 마음',
      use='이유 없이 좋았던 시간이 있었다', charge='그 시간을 보내고 나면 보통 어땠나요?',
      well='이유 없이 좋았던 시간이 있다', low='즐거운 게 없고 쉬어도 쉰 것 같지 않다', over='즐거움으로만 도망쳐 해야 할 일이 밀린다',
      less='즐기는 시간 앞에 끝낼 것 하나를 먼저 두고, 즐기기는 정해진 시간만.', more='이유 없이 좋은 20분을 하루에 한 번 만듭니다. 음악, 바다, 산책.'),
]
TOTAL = [
 dict(k='sleep', name='잠', q='잠들고 깨는 시간이 일정했다', tip='잠드는 시간을 이번 주 3일만 같게 맞춥니다.'),
 dict(k='move', name='움직임', q='하루 20분 이상 몸을 움직였다', tip='하루 20분, 걷기면 충분합니다. 시간을 정해 둡니다.'),
 dict(k='drive', name='의욕', q='아침에 하고 싶은 일이 하나는 있었다', tip='전날 밤에 내일 하고 싶은 일 하나를 적어 둡니다.'),
]
USE_LK = ['전혀', '한두 번', '가끔', '자주', '거의 매일']
CHG_LK = ['많이 지침', '조금 지침', '그대로', '조금 힘남', '힘이 남']

def page():
    title = '요즘 나의 여섯 마음 — 15문항 4분 상태 진단 | 네다바웨이'
    desc = '탐험·만들기·연결·돕기·생각·즐기기. 지난 2주 동안 여섯 마음에 에너지를 어떻게 썼는지 15문항으로 봅니다. 유형 판정이 아니라 에너지 배분과 총량, 이번 주 조정 한 가지.'
    url = f'{SITE}/diagnosis/minds/'
    ld = json.dumps({"@context":"https://schema.org","@type":"WebPage","name":"요즘 나의 여섯 마음","url":url,"description":desc,"inLanguage":"ko"}, ensure_ascii=False)
    data = json.dumps({"MINDS":MINDS,"TOTAL":TOTAL,"USE_LK":USE_LK,"CHG_LK":CHG_LK}, ensure_ascii=False)
    minds_cards = ''.join(f'''      <article class="card reveal" id="{m["k"]}" style="--tc:{m["color"]};">
        <img src="/assets/brand/type-{m["k"]}.png" width="76" height="80" alt="" loading="lazy" style="height:56px;width:auto;">
        <h3 class="card__t" style="margin-top:12px;">{esc(m["name"])} <span style="font-family:var(--hand);font-weight:400;color:var(--text-3);">{m["en"]}</span></h3>
        <p class="card__d">{esc(m["verb"])}.</p>
        <ul><li><b>잘 쓰고 있을 때</b> {esc(m["well"])}</li><li><b>눌려 있을 때</b> {esc(m["low"])}</li><li><b>넘쳐 있을 때</b> {esc(m["over"])}</li></ul>
      </article>
''' for m in MINDS)
    out = head(title, desc, url, 'diag-minds', f'<script type="application/ld+json">\n{ld}\n</script>\n') + HEADER
    out += f'''
<main id="main">
<section class="sec" aria-labelledby="mdTitle" style="padding-top:72px;">
  <div class="wrap dg-wrap">
    <p style="font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.08em;color:var(--cobalt);margin-bottom:12px;"><a href="/diagnosis/">&larr; 무료진단</a> · 03 요즘 나의 여섯 마음</p>
    <div class="sec-head" style="margin-bottom:28px;">
      <h1 class="sec-title" id="mdTitle">요즘 나의<br>여섯 마음<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:14px;">15문항, 약 4분. <strong>지난 2주</strong>를 떠올리며 답합니다. 나는 무슨 유형인가가 아니라, 요즘 여섯 마음에 에너지를 어떻게 나눠 쓰고 있는지를 봅니다. 그래서 4주 뒤에 다시 재도 됩니다.</p>
    </div>

    <div class="dg-top" hidden><div class="dg-top__bar"><div class="dg-top__fill"></div></div><span class="dg-top__n">0 / 15</span></div>

    <div id="dgIntro" class="dg-intro">
      <p class="dg-intro__t">여섯 마음은 여섯 개의 통로입니다</p>
      <p class="dg-intro__d">탐험·만들기·연결·돕기·생각·즐기기. 누구나 여섯을 다 갖고 있고, 요즘 어느 통로로 에너지를 많이 흘려보내는지가 다를 뿐입니다. 어떤 통로는 쓸수록 충전되고 어떤 통로는 쓸수록 고갈됩니다. 결과는 그 배분과 총량, 그리고 이번 주에 줄일 것 하나·늘릴 것 하나입니다.</p>
      <div class="dg-intro__cta"><button type="button" class="btn-go" id="dgStart">진단 시작 {ARROW}</button><button type="button" class="btn-link" id="dgResume" hidden style="background:none;border:0;cursor:pointer;">지난 결과 다시 보기 &#8599;</button></div>
    </div>

    <div id="dgQuiz" hidden></div>
    <div id="dgResult" hidden></div>
  </div>
</section>

<section class="sec sec--alt" id="minds" aria-labelledby="mindsTitle">
  <div class="wrap">
    <div class="sec-head reveal">
      <p class="sec-kicker">6 Minds</p>
      <h2 class="sec-title" id="mindsTitle">여섯 마음의 신호<span class="dot">.</span></h2>
      <p class="sec-lead">각 마음을 한 문장으로 정의하고, 잘 쓰고 있을 때·눌려 있을 때·넘쳐 있을 때의 신호를 적었습니다. 문항은 이 신호에서 나옵니다.</p>
    </div>
    <div class="cards cards--2">
{minds_cards}    </div>
  </div>
</section>
</main>

<script id="dgData" type="application/json">{data}</script>
<script>
document.addEventListener('DOMContentLoaded',function(){{
  var D=JSON.parse(document.getElementById('dgData').textContent), M=D.MINDS, T=D.TOTAL, USE_LK=D.USE_LK, CHG_LK=D.CHG_LK;
  var STEPS=[]; M.forEach(function(m){{ STEPS.push({{kind:'use',m:m}}); STEPS.push({{kind:'chg',m:m}}); }}); T.forEach(function(t){{ STEPS.push({{kind:'tot',t:t}}); }});
  var N=STEPS.length, ans=[], cur=0;
  var $=function(id){{return document.getElementById(id);}};
  function esc(s){{return NWD.esc(s);}}
  function start(){{ans=[];cur=0;NWD.show('dgQuiz');render();}}
  function render(){{
    var s=STEPS[cur], h='';
    NWD.progress(cur,N);
    if(s.kind==='use'){{ h='<div class="dg-q"><p class="dg-q__k">'+esc(s.m.name)+' · 사용량 · '+(cur+1)+' / '+N+'</p><p class="dg-q__t">지난 2주, 이런 일이 얼마나 있었나요?<br><span style="color:var(--cobalt);">'+esc(s.m.use)+'</span></p>'+likert(USE_LK,0)+'</div>'; }}
    else if(s.kind==='chg'){{ h='<div class="dg-q"><p class="dg-q__k">'+esc(s.m.name)+' · 충전/고갈 · '+(cur+1)+' / '+N+'</p><p class="dg-q__t">'+esc(s.m.charge)+'</p><p class="ai-note" style="margin-top:6px;">거의 안 했다면 "그대로"를 고르세요.</p>'+likert(CHG_LK,-2)+'</div>'; }}
    else {{ h='<div class="dg-q"><p class="dg-q__k">총량 · '+esc(s.t.name)+' · '+(cur+1)+' / '+N+'</p><p class="dg-q__t">지난 2주, 이런 날이 얼마나 있었나요?<br><span style="color:var(--cobalt);">'+esc(s.t.q)+'</span></p>'+likert(USE_LK,0)+'</div>'; }}
    h+='<div class="dg-nav"><button type="button" class="dg-back" id="dgBack"'+(cur===0?' disabled':'')+'>&larr; 이전</button><span style="font-size:13px;color:var(--text-4);">고르면 다음으로 넘어갑니다</span></div>';
    $('dgQuiz').innerHTML=h;
    $('dgQuiz').querySelectorAll('.dg-lk').forEach(function(b){{ b.addEventListener('click',function(){{ pick(parseInt(b.getAttribute('data-v'),10),b); }}); }});
    $('dgBack').addEventListener('click',function(){{ if(cur>0){{cur--;render();NWD.scrollToQuiz();}} }});
  }}
  function likert(labels,base){{ var h='<div class="dg-likert" role="group">'; labels.forEach(function(l,i){{ var v=base+i; h+='<button type="button" class="dg-lk'+(ans[cur]===v?' is-picked':'')+'" data-v="'+v+'"><span class="dg-lk__dot" aria-hidden="true"></span><span class="dg-lk__t">'+esc(l)+'</span></button>'; }}); return h+'</div>'; }}
  function pick(v,btn){{ ans[cur]=v; btn.parentElement.querySelectorAll('.dg-lk').forEach(function(b){{b.classList.remove('is-picked');b.disabled=true;}}); btn.classList.add('is-picked'); setTimeout(function(){{ if(cur<N-1){{cur++;render();NWD.scrollToQuiz();}} else finish(); }},220); }}
  function compute(a){{
    var r={{minds:[],total:{{}}}}; var ci=0;
    M.forEach(function(m,i){{ r.minds.push({{k:m.k,name:m.name,color:m.color,use:a[i*2],chg:a[i*2+1]}}); }});
    T.forEach(function(t,i){{ r.total[t.k]=a[12+i]; }});
    var totAvg=(r.total.sleep+r.total.move+r.total.drive)/3/4*100;
    var chgAvg=r.minds.reduce(function(s,m){{return s+(m.chg+2)/4*100;}},0)/6;
    r.energy=Math.round(totAvg*0.6+chgAvg*0.4);
    return r;
  }}
  function finish(){{ var r=compute(ans); NWD.save('minds',{{a:ans,at:new Date().toISOString()}}); showResult(r,new Date()); }}
  function chgWord(c){{ return c>=1?'충전':(c<=-1?'고갈':''); }}
  function chgColor(c){{ return c>=1?'#10B981':(c<=-1?'#E11D48':'#9a948c'); }}
  function ring(v){{ var R=54,C=2*Math.PI*R,o=C*(1-v/100); return '<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="에너지 총량 '+v+'점"><circle cx="70" cy="70" r="'+R+'" fill="none" stroke="#d6cfc1" stroke-width="12"/><circle cx="70" cy="70" r="'+R+'" fill="none" stroke="#1D4ED8" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+o.toFixed(1)+'" transform="rotate(-90 70 70)"/><text x="70" y="78" text-anchor="middle" font-size="34" font-weight="800" fill="#1b1b1b">'+v+'</text></svg>'; }}
  function showResult(r,when){{
    var sorted=r.minds.slice().sort(function(a,b){{return b.use-a.use||b.chg-a.chg;}});
    var A=sorted[0], B=sorted[sorted.length-1], mA=M.filter(function(m){{return m.k===A.k;}})[0], mB=M.filter(function(m){{return m.k===B.k;}})[0];
    var top2=sorted.slice(0,2), low2=sorted.slice(-2);
    var chargers=r.minds.filter(function(m){{return m.chg>=1;}}), drainers=r.minds.filter(function(m){{return m.chg<=-1;}});
    var lowTot=T.slice().sort(function(x,y){{return r.total[x.k]-r.total[y.k];}})[0];
    var summary= r.energy>=70?'잠과 움직임이 받쳐 주고, 여섯 마음도 고르게 쓰고 있어요.':(r.energy>=50?'기본은 괜찮고, 쓰는 마음이 한쪽으로 쏠려 있어요.':(r.energy>=30?'통로 몇 개가 눌려 있고, 몸의 바닥부터 채울 때예요.':'에너지가 많이 내려가 있어요. 오늘은 회복이 먼저입니다.'));
    var next=new Date(when.getTime()+28*86400000);
    var fmt=function(d){{return d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'.';}};
    var h='<div class="dg-res" style="--rc:'+A.color+';"><p class="dg-res__k">요즘 나의 여섯 마음</p>';
    h+='<p class="ai-note" style="margin-top:4px;">'+fmt(when)+' · 지난 2주 기준 · 다음 진단 권장: 4주 뒤 ('+fmt(next)+')</p>';
    h+='<div class="dg-res__head" style="margin-top:14px;">'+ring(r.energy)+'<div><p class="dg-res__t" style="font-size:clamp(22px,3vw,30px);">에너지 총량 '+r.energy+' / 100</p><p class="dg-res__d" style="margin-top:6px;">'+esc(summary)+'</p></div></div>';
    h+='<div class="dg-bars" style="margin-top:26px;" role="list" aria-label="마음별 에너지">'+sorted.map(function(m){{ var p=Math.round(m.use/4*100), w=chgWord(m.chg); return '<div class="dg-bar" role="listitem" style="--bc:'+chgColor(m.chg)+';grid-template-columns:78px 1fr 92px;"><span class="dg-bar__l">'+esc(m.name)+'</span><span class="dg-bar__tr"><span class="dg-bar__f" style="width:'+p+'%;display:block;"></span></span><span class="dg-bar__v">'+p+'%'+(w?' <b style="color:'+chgColor(m.chg)+';">'+w+'</b>':'')+'</span></div>'; }}).join('')+'</div>';
    h+='<p class="ai-note" style="margin-top:10px;">막대는 사용량, 색은 쓰고 난 뒤의 상태입니다. 초록은 충전, 빨강은 고갈, 회색은 그대로.</p>';
    var wellTxt=top2.map(function(m){{return m.chg>=1?esc(m.name)+'은(는) 잘 쓰고 있어요':(m.chg<=-1?esc(m.name)+'은(는) 많이 쓰지만 지쳐요':esc(m.name)+'을(를) 많이 쓰고 있어요');}}).join('. ')+'.';
    var lowTxt=low2.map(function(m){{return esc(m.name);}}).join('·')+'은(는) 요즘 눌려 있어요.';
    var aware='요즘 「'+esc(A.name)+'」을(를) 지키려고 「'+esc(B.name)+'」을(를) 줄여 왔군요.'+(A.chg<=-1?' '+esc(A.name)+'은(는) 많이 쓰는데 하고 나면 지치는 방식이에요.':'');
    h+='<div class="dg-cards"><div class="dg-card" style="--cc:#1D4ED8;"><p class="dg-card__k">알아차림</p><p class="dg-card__d">'+aware+'<br>'+wellTxt+' '+lowTxt+'</p></div>';
    h+='<div class="dg-card" style="--cc:#FF6B3D;"><p class="dg-card__k">이번 주 조정</p><p class="dg-card__d"><b>줄일 것 · '+esc(A.name)+'</b> '+esc(mA.less)+'<br><b>늘릴 것 · '+esc(B.name)+'</b> '+esc(mB.more)+'</p></div>';
    var pair= chargers.length&&drainers.length ? '충전형인 「'+chargers.map(function(m){{return esc(m.name);}}).join('·')+'」을(를) 고갈형인 「'+drainers.map(function(m){{return esc(m.name);}}).join('·')+'」 앞뒤에 붙이세요. ' : (chargers.length?'충전형인 「'+chargers.map(function(m){{return esc(m.name);}}).join('·')+'」을(를) 하루 최소 20분 지키세요. ':'쓸수록 힘이 나는 마음이 아직 안 보여요. 즐기기와 연결부터 20분씩 시험해 보세요. ');
    h+='<div class="dg-card" style="--cc:#10B981;"><p class="dg-card__k">총량 키우기</p><p class="dg-card__d">'+pair+'몸의 바닥은 '+esc(lowTot.name)+'부터: '+esc(lowTot.tip)+'</p></div></div>';
    if(r.energy<30){{ h+='<p class="ai-note" style="margin-top:14px;">요즘 많이 힘들다면 혼자 버티지 않아도 됩니다. 청소년은 1388, 성인은 1393(자살예방)·129(보건복지상담)에서 24시간 이야기할 수 있습니다.</p>'; }}
    h+='<div class="dg-actions"><button type="button" class="btn-go" id="dgCopy">결과 복사</button><button type="button" class="btn-ghost" id="dgRetry">다시 진단하기</button></div></div>';
    var prog = (r.energy<50||low2.some(function(m){{return m.k==='enjoyer';}})) ? {{t:'회복이 먼저인 상태입니다',d:'총량이 낮거나 즐기기가 눌려 있을 때는 새 계획보다 30분 무료 상담에서 이번 주 회복 리듬부터 함께 잡습니다.',a:'/contact.html#consult-form',al:'무료 30분 상담 신청',b:'/personal.html',bl:'퍼스널 트레이닝 코스 보기'}}
      : (drainers.some(function(m){{return m.k==='maker'||m.k==='thinker';}}) ? {{t:'만들기·생각이 고갈형이라면 방식을 바꿀 때입니다',d:'학습 습관 코스는 양을 늘리는 대신 끝내는 경험을 되찾는 데서 시작합니다. 학습 유형 진단과 함께 보면 더 정확합니다.',a:'/personal.html#study',al:'학습 습관 코스 보기',b:'/diagnosis/learning/',bl:'학습 유형 진단 하기'}}
      : (low2.some(function(m){{return m.k==='explorer';}}) ? {{t:'탐험이 눌려 있다면 진로 나침반부터',d:'궁금한 게 없는 시기에는 진로 탐색 코스의 4분면 자가진단이 다시 방향을 켭니다.',a:'/personal.html#career',al:'진로 탐색 코스 보기',b:'/contact.html#consult-form',bl:'무료 30분 상담'}}
      : {{t:'이 상태에 맞는 다음 걸음',d:'결과를 복사해 상담 신청서에 붙여 넣으면 첫 30분을 설명 대신 설계에 씁니다. 기관·학교는 회기 첫날과 마지막 날 같은 진단으로 변화를 봅니다.',a:'/contact.html#consult-form',al:'무료 30분 상담 신청',b:'/programs.html',bl:'기관·기업 교육 보기'}}));
    h+='<div class="dg-next"><p class="dg-next__t">'+esc(prog.t)+'</p><p class="dg-next__d">'+esc(prog.d)+'</p><div class="dg-next__cta"><a class="btn-dark" href=\\x27'+prog.a+'\\x27>'+esc(prog.al)+'</a><a class="btn-link" href=\\x27'+prog.b+'\\x27>'+esc(prog.bl)+' &#8599;</a></div></div>';
    h+='<p class="dg-foot">검사가 아니라 상태 보기입니다. 여섯 마음은 누구에게나 다 있고 배분이 다를 뿐이며, 의학·심리 진단이 아닙니다. 결과는 이 기기 브라우저에만 저장됩니다.</p>';
    $('dgResult').innerHTML=h; NWD.show('dgResult');
    $('dgCopy').addEventListener('click',function(){{ var txt='[요즘 나의 여섯 마음] '+fmt(when)+' · 에너지 총량 '+r.energy+'/100\\n'+sorted.map(function(m){{return m.name+' '+Math.round(m.use/4*100)+'%'+(chgWord(m.chg)?'('+chgWord(m.chg)+')':'');}}).join(' · ')+'\\n알아차림: '+aware.replace(/<[^>]+>/g,'')+'\\n줄일 것: '+A.name+' — '+mA.less+'\\n늘릴 것: '+B.name+' — '+mB.more+'\\n— nedabah.org/diagnosis/minds/'; NWD.copy(txt,$('dgCopy')); }});
    $('dgRetry').addEventListener('click',function(){{ NWD.clear('minds'); start(); }});
  }}
  $('dgStart').addEventListener('click',start);
  var last=NWD.load('minds');
  if(last&&last.a&&last.a.length===N){{ $('dgResume').hidden=false; $('dgResume').addEventListener('click',function(){{ showResult(compute(last.a), new Date(last.at)); }}); }}
  if(location.hash==='#result'&&last&&last.a){{ showResult(compute(last.a), new Date(last.at)); }}
  if(location.hash==='#demo'){{ showResult(compute([1,0, 4,-2, 2,1, 2,0, 3,1, 0,0, 3,3,2]), new Date()); }}
}});
</script>
''' + FOOTER
    return out

p = ROOT / 'diagnosis' / 'minds' / 'index.html'; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(page(), encoding='utf-8')
print('ok: diagnosis/minds/index.html')
