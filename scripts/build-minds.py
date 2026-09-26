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

RESULT_JS = r'''
  var HIST_MAX=6;
  function finish(){ var r=compute(ans); var now=new Date().toISOString(); var st=NWD.load('minds')||{}; var hist=(st.hist||[]).slice(-HIST_MAX+1); hist.push({a:ans,at:now}); NWD.save('minds',{a:ans,at:now,hist:hist}); showResult(r,new Date(),prevOf(hist)); }
  function prevOf(hist){ if(!hist||hist.length<2) return null; var cur=new Date(hist[hist.length-1].at).getTime(); for(var i=hist.length-2;i>=0;i--){ if(cur-new Date(hist[i].at).getTime()>=6*86400000) return hist[i]; } return null; }
  function chgWord(c){ return c>=1?'충전':(c<=-1?'고갈':''); }
  function chgColor(c){ return c>=1?'#10B981':(c<=-1?'#E11D48':'#9a948c'); }
  function quad(m){ var hi=m.use>=3, lo=m.use<=1; if(hi&&m.chg>=1) return 'engine'; if(hi&&m.chg<=-1) return 'overload'; if(lo&&m.chg>=1) return 'hidden'; if(lo&&m.chg<=-1) return 'rest'; if(m.use===4&&m.chg<=0) return 'overload'; return 'mid'; }
  var QUAD={engine:{k:'엔진',d:'많이 쓰고 힘도 나는 통로. 지금 나를 굴리는 마음입니다. 지키세요.',c:'#10B981'},overload:{k:'과부하',d:'많이 쓰는데 하고 나면 빠지는 통로. 양이 아니라 방식을 바꿀 자리입니다.',c:'#E11D48'},hidden:{k:'숨은 자원',d:'적게 쓰는데 쓰면 힘이 나는 통로. 총량을 가장 싸게 올리는 지렛대입니다.',c:'#1D4ED8'},rest:{k:'쉬는 통로',d:'적게 쓰고 써도 빠지는 통로. 지금은 억지로 열지 말고 4주 뒤 다시 봅니다.',c:'#9a948c'},mid:{k:'보통',d:'쓰는 양도 반응도 중간. 관찰만 하면 되는 통로입니다.',c:'#9a948c'}};
  function stateOf(m){ if(m.use>=3&&m.chg<=-1) return {k:'넘쳐 있음',c:'#E11D48'}; if(m.use>=3) return {k:'잘 쓰고 있음',c:'#10B981'}; if(m.use<=1) return {k:'눌려 있음',c:'#B45309'}; return {k:'보통',c:'#9a948c'}; }
  function mindOf(k){ return M.filter(function(m){return m.k===k;})[0]; }
  function ring(v){ var R=54,C=2*Math.PI*R,o=C*(1-v/100); return '<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="에너지 총량 '+v+'점"><circle cx="70" cy="70" r="'+R+'" fill="none" stroke="#d6cfc1" stroke-width="12"/><circle cx="70" cy="70" r="'+R+'" fill="none" stroke="#1D4ED8" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+o.toFixed(1)+'" transform="rotate(-90 70 70)"/><text x="70" y="78" text-anchor="middle" font-size="34" font-weight="800" fill="#1b1b1b">'+v+'</text></svg>'; }
  function fmt(d){ return d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'.'; }
  function showResult(r,when,prev){
    var sorted=r.minds.slice().sort(function(a,b){return b.use-a.use||b.chg-a.chg;});
    var A=sorted[0], B=sorted[sorted.length-1], mA=mindOf(A.k);
    var chargers=r.minds.filter(function(m){return m.chg>=1;}), drainers=r.minds.filter(function(m){return m.chg<=-1;});
    var hidden=r.minds.filter(function(m){return quad(m)==='hidden';}).sort(function(a,b){return b.chg-a.chg||a.use-b.use;});
    var overload=r.minds.filter(function(m){return quad(m)==='overload';});
    var engines=r.minds.filter(function(m){return quad(m)==='engine';});
    // 늘릴 것: 숨은 자원 > 눌려 있고 고갈 아님 > 최저 사용
    var G = hidden[0] || r.minds.filter(function(m){return m.use<=1&&m.chg>=0;}).sort(function(a,b){return b.chg-a.chg;})[0] || B;
    var mG=mindOf(G.k);
    // 줄일 것: 과부하 > 최고 사용
    var L = overload.sort(function(a,b){return b.use-a.use;})[0] || A; var mL=mindOf(L.k);
    var spread=Math.round((A.use-B.use)/4*100);
    var spreadTxt= spread>=75?'한쪽으로 크게 쏠려 있습니다':(spread>=50?'쏠림이 있습니다':'비교적 고르게 쓰고 있습니다');
    var band= r.energy>=70?'넉넉':(r.energy>=50?'보통':(r.energy>=30?'눌림':'회복 우선'));
    var summary= r.energy>=70?'잠과 움직임이 받쳐 주고, 여섯 마음도 고르게 쓰고 있어요.':(r.energy>=50?'기본은 괜찮고, 쓰는 마음이 한쪽으로 쏠려 있어요.':(r.energy>=30?'통로 몇 개가 눌려 있고, 몸의 바닥부터 채울 때예요.':'에너지가 많이 내려가 있어요. 오늘은 회복이 먼저입니다.'));
    var next=new Date(when.getTime()+28*86400000);
    var lowTot=T.slice().sort(function(x,y){return r.total[x.k]-r.total[y.k];})[0];
    var pattern='「'+esc(A.name)+'」에 몰아 쓰고 「'+esc(B.name)+'」을(를) 닫아 둔 2주'+(A.chg<=-1?'. 몰아 쓰는 통로가 고갈형이라 총량이 새고 있습니다':(A.chg>=1?'. 몰아 쓰는 통로가 충전형이라 버티는 힘은 있습니다':''))+'.';
    var h='<div class="dg-res" style="--rc:'+A.color+';"><p class="dg-res__k">요즘 나의 여섯 마음 · 해설지</p>';
    h+='<p class="ai-note" style="margin-top:4px;">'+fmt(when)+' · 지난 2주 기준 · 다음 진단 권장: 4주 뒤 ('+fmt(next)+') · 네다바웨이가 설계한 상태 진단</p>';
    // ① 총량
    h+='<h3 class="dg-h3">① 에너지 총량</h3>';
    h+='<div class="dg-res__head" style="margin-top:10px;">'+ring(r.energy)+'<div><p class="dg-res__t" style="font-size:clamp(22px,3vw,30px);">'+r.energy+' / 100 · '+band+'</p><p class="dg-res__d" style="margin-top:6px;">'+esc(summary)+'</p><p class="dg-res__d" style="margin-top:4px;">총량의 60%는 잠·움직임·의욕에서, 40%는 여섯 마음을 쓰고 난 뒤의 상태에서 옵니다.</p></div></div>';
    h+='<div class="dg-chips" style="margin-top:14px;">'+T.map(function(t){ var v=r.total[t.k]; var c=v>=3?'#DCFCE7':(v<=1?'#FFE4D6':'var(--chip)'); return '<span style="background:'+c+';">'+esc(t.name)+' '+v+'/4</span>'; }).join('')+'<span>충전 '+chargers.length+' · 고갈 '+drainers.length+' · 쏠림 '+spread+'%</span></div>';
    // ② 배분
    h+='<h3 class="dg-h3">② 여섯 마음의 배분</h3>';
    h+='<div class="dg-bars" style="margin-top:12px;" role="list" aria-label="마음별 에너지">'+sorted.map(function(m){ var p=Math.round(m.use/4*100), w=chgWord(m.chg); return '<div class="dg-bar" role="listitem" style="--bc:'+chgColor(m.chg)+';grid-template-columns:78px 1fr 92px;"><span class="dg-bar__l">'+esc(m.name)+'</span><span class="dg-bar__tr"><span class="dg-bar__f" style="width:'+p+'%;display:block;"></span></span><span class="dg-bar__v">'+p+'%'+(w?' <b style="color:'+chgColor(m.chg)+';">'+w+'</b>':'')+'</span></div>'; }).join('')+'</div>';
    h+='<p class="ai-note" style="margin-top:10px;">막대는 사용량, 색은 쓰고 난 뒤의 상태입니다. 초록은 충전, 빨강은 고갈, 회색은 그대로. 사용량 차이 '+spread+'%, '+spreadTxt+'.</p>';
    // ③ 4사분면
    h+='<h3 class="dg-h3">③ 사용량 × 충전으로 본 네 자리</h3><p class="ai-note" style="margin-top:6px;">많이 쓰는가와 쓰고 나면 힘이 나는가를 겹치면 마음마다 자리가 정해집니다. 자리가 곧 처방입니다.</p>';
    h+='<div class="dg-quad">'+['engine','overload','hidden','rest'].map(function(q){ var list=r.minds.filter(function(m){return quad(m)===q;}); return '<div class="dg-quad__c" style="--qc:'+QUAD[q].c+';"><p class="dg-quad__k">'+QUAD[q].k+'</p><p class="dg-quad__m">'+(list.length?list.map(function(m){return esc(m.name);}).join(' · '):'—')+'</p><p class="dg-quad__d">'+QUAD[q].d+'</p></div>'; }).join('')+'</div>';
    // ④ 알아차림
    h+='<h3 class="dg-h3">④ 알아차림</h3>';
    var aware='요즘 「'+esc(A.name)+'」을(를) 지키려고 「'+esc(B.name)+'」을(를) 줄여 왔군요.'+(A.chg<=-1?' '+esc(A.name)+'은(는) 많이 쓰는데 하고 나면 지치는 방식이에요.':'');
    var sharp=[];
    if(drainers.length>=3) sharp.push('여섯 통로 중 '+drainers.length+'개가 쓸수록 빠지는 상태입니다. 더 하기보다 새는 곳을 막는 게 먼저입니다.');
    if(hidden.length) sharp.push('「'+hidden.map(function(m){return esc(m.name);}).join('·')+'」은(는) 거의 안 쓰는데 쓰면 힘이 나는 통로입니다. 가장 적은 비용으로 총량을 올릴 자리입니다.');
    if(overload.length&&engines.length) sharp.push('「'+esc(overload[0].name)+'」(과부하) 앞뒤에 「'+esc(engines[0].name)+'」(엔진)을 붙이면 같은 양을 하고도 덜 빠집니다.');
    if(!chargers.length) sharp.push('쓸수록 힘이 나는 통로가 하나도 안 보입니다. 이건 성향이 아니라 지금 상태입니다. 즐기기와 연결을 20분씩 시험해 어느 쪽이 먼저 켜지는지 보세요.');
    if(r.total.sleep<=1) sharp.push('잠드는 시간이 흔들리면 여섯 통로 전부가 좁아집니다. 이번 주 조정의 첫 줄은 잠입니다.');
    if(spread>=75&&A.chg>=1) sharp.push('한 통로에 크게 쏠렸지만 그 통로가 충전형입니다. 지금은 잘 버티지만, 그 통로가 막히는 날 대체 통로가 없습니다. 두 번째 통로를 미리 열어 두세요.');
    h+='<div class="dg-cards"><div class="dg-card" style="--cc:#1D4ED8;"><p class="dg-card__k">요즘의 패턴</p><p class="dg-card__d">'+pattern+'<br>'+aware+'</p></div>'+(sharp.length?'<div class="dg-card" style="--cc:#8B5CF6;"><p class="dg-card__k">예리하게 보면</p><p class="dg-card__d">'+sharp.map(function(x){return '· '+x;}).join('<br>')+'</p></div>':'')+'</div>';
    // ⑤ 이번 주 조정
    h+='<h3 class="dg-h3">⑤ 이번 주 조정 · 줄일 것 하나, 늘릴 것 하나</h3>';
    var pairTxt= (chargers.length&&drainers.length) ? '짝지어 쓰기: 「'+esc(chargers[0].name)+'」을(를) 「'+esc(drainers[0].name)+'」 앞뒤 20분에 붙입니다.' : (chargers.length?'충전형 「'+chargers.map(function(m){return esc(m.name);}).join('·')+'」을(를) 하루 최소 20분 지킵니다.':'');
    h+='<div class="dg-cards"><div class="dg-card" style="--cc:#E11D48;"><p class="dg-card__k">줄일 것 · '+esc(L.name)+(quad(L)==='overload'?' (과부하)':'')+'</p><p class="dg-card__d">'+esc(mL.less)+'</p></div><div class="dg-card" style="--cc:#10B981;"><p class="dg-card__k">늘릴 것 · '+esc(G.name)+(quad(G)==='hidden'?' (숨은 자원)':'')+'</p><p class="dg-card__d">'+esc(mG.more)+'</p></div>'+(pairTxt?'<div class="dg-card" style="--cc:#1D4ED8;"><p class="dg-card__k">붙여 쓰기</p><p class="dg-card__d">'+pairTxt+'</p></div>':'')+'</div>';
    // ⑥ 총량 키우기
    h+='<h3 class="dg-h3">⑥ 에너지 총량을 키우는 네 가지</h3>';
    h+='<ol class="ai-steps" style="margin-top:12px;"><li><b>회복이 먼저.</b> 충전형 통로를 하루 20분 보장합니다. 총량은 더 하기가 아니라 새는 것 막기에서 먼저 오릅니다.'+(chargers.length?' 지금 나의 충전형: '+chargers.map(function(m){return esc(m.name);}).join('·')+'.':'')+'</li><li><b>고갈형은 없애지 말고 방식을 바꿉니다.</b>'+(overload.length?' 「'+esc(overload[0].name)+'」은(는) 양을 줄이는 게 아니라 끝낼 것 하나로 좁혀 완성 경험을 되찾습니다.':' 지금 과부하 통로는 없습니다. 이 상태를 유지하세요.')+'</li><li><b>짝을 지어 씁니다.</b> 고갈형 앞뒤에 충전형을 붙입니다. '+(pairTxt||'만들기 → 연결, 생각 → 탐험처럼.')+'</li><li><b>몸이 통로의 바닥.</b> 총량의 60%가 여기서 나옵니다. 가장 낮은 '+esc(lowTot.name)+'('+r.total[lowTot.k]+'/4)부터: '+esc(lowTot.tip)+'</li></ol>';
    // ⑦ 여섯 마음 모두
    h+='<h3 class="dg-h3">⑦ 여섯 마음 하나씩</h3>';
    h+='<div class="dg-fac" style="margin-top:12px;">'+sorted.map(function(m){ var mm=mindOf(m.k), st=stateOf(m), q=QUAD[quad(m)]; var act= st.k==='넘쳐 있음'?mm.less:(st.k==='눌려 있음'?mm.more:(m.chg<=-1?'방식을 바꿉니다: '+mm.less:'지금처럼 유지하고, 4주 뒤 다시 잽니다.')); return '<div class="dg-f" style="--fc:'+m.color+';"><div class="dg-f__head"><span class="dg-f__n">'+esc(m.name)+'<small>'+esc(mm.en)+'</small></span><span class="dg-f__b" style="background:'+st.c+'22;color:'+st.c+';">'+st.k+' · '+q.k+'</span></div><div class="dg-f__tr"><div class="dg-f__fl" style="width:'+Math.round(m.use/4*100)+'%;"></div></div><p class="dg-f__d" style="margin-top:8px;">'+esc(mm.verb)+'. 신호: '+esc(st.k==='넘쳐 있음'?mm.over:(st.k==='눌려 있음'?mm.low:mm.well))+'</p><p class="dg-f__sw"><b>이번 주</b> '+esc(act)+'</p></div>'; }).join('')+'</div>';
    // ⑧ 4주 비교
    if(prev&&prev.a){ var pr=compute(prev.a); var pd=new Date(prev.at); var rows=r.minds.map(function(m,i){ var d=Math.round((m.use-pr.minds[i].use)/4*100); return {n:m.name,d:d,c:m.chg-pr.minds[i].chg}; }); var dt=r.energy-pr.energy;
      h+='<h3 class="dg-h3">⑧ 지난번과 비교 · '+fmt(pd)+' → '+fmt(when)+'</h3>';
      h+='<p class="dg-res__d" style="margin-top:8px;">에너지 총량 '+pr.energy+' → '+r.energy+' ('+(dt>=0?'+':'')+dt+'). '+(dt>=5?'총량이 올랐습니다. 지난 조정이 통했다는 신호입니다.':(dt<=-5?'총량이 내려갔습니다. 무엇을 더 했는지보다 무엇이 새어 나갔는지 보세요.':'총량은 비슷합니다. 배분이 어떻게 움직였는지 보세요.'))+'</p>';
      h+='<div class="dg-chips" style="margin-top:10px;">'+rows.map(function(x){ return '<span'+(x.d>0?' style="background:#DCFCE7;"':(x.d<0?' style="background:#FFE4D6;"':''))+'>'+esc(x.n)+' '+(x.d>0?'▲':(x.d<0?'▼':'—'))+(x.d?Math.abs(x.d)+'%':'')+(x.c>0?' 충전↑':(x.c<0?' 충전↓':''))+'</span>'; }).join('')+'</div>';
    } else { h+='<p class="ai-note" style="margin-top:22px;">4주 뒤 다시 재면 이 자리에 지난번과의 변화가 나옵니다. 이 기기 브라우저에 최근 6회까지 남습니다.</p>'; }
    if(r.energy<30){ h+='<p class="ai-note" style="margin-top:14px;">요즘 많이 힘들다면 혼자 버티지 않아도 됩니다. 청소년은 1388, 성인은 1393(자살예방)·129(보건복지상담)에서 24시간 이야기할 수 있습니다.</p>'; }
    h+='<div class="dg-actions"><button type="button" class="btn-go" id="dgCopy">해설지 복사</button><button type="button" class="btn-ghost" id="dgRetry">다시 진단하기</button></div></div>';
    var prog = (r.energy<50||stateOf(mindOf('enjoyer')?r.minds.filter(function(m){return m.k==='enjoyer';})[0]:B).k==='눌려 있음') ? {t:'회복이 먼저인 상태입니다',d:'총량이 낮거나 즐기기가 눌려 있을 때는 새 계획보다 30분 무료 상담에서 이번 주 회복 리듬부터 함께 잡습니다.',a:'/contact.html#consult-form',al:'무료 30분 상담 신청',b:'/personal.html',bl:'퍼스널 트레이닝 코스 보기'}
      : (overload.some(function(m){return m.k==='maker'||m.k==='thinker';}) ? {t:'만들기·생각이 과부하라면 방식을 바꿀 때입니다',d:'학습 습관 코스는 양을 늘리는 대신 끝내는 경험을 되찾는 데서 시작합니다. 학습 유형 진단과 함께 보면 더 정확합니다.',a:'/personal.html#study',al:'학습 습관 코스 보기',b:'/diagnosis/learning/',bl:'학습 유형 진단 하기'}
      : (r.minds.some(function(m){return m.k==='explorer'&&m.use<=1;}) ? {t:'탐험이 눌려 있다면 진로 나침반부터',d:'궁금한 게 없는 시기에는 진로 탐색 코스의 4분면 자가진단이 다시 방향을 켭니다.',a:'/personal.html#career',al:'진로 탐색 코스 보기',b:'/contact.html#consult-form',bl:'무료 30분 상담'}
      : {t:'이 상태에 맞는 다음 걸음',d:'해설지를 복사해 상담 신청서에 붙여 넣으면 첫 30분을 설명 대신 설계에 씁니다. 기관·학교는 회기 첫날과 마지막 날 같은 진단으로 변화를 봅니다.',a:'/contact.html#consult-form',al:'무료 30분 상담 신청',b:'/programs.html',bl:'기관·기업 교육 보기'}));
    h+='<div class="dg-next"><p class="dg-next__t">'+esc(prog.t)+'</p><p class="dg-next__d">'+esc(prog.d)+'</p><div class="dg-next__cta"><a class="btn-dark" href=\x27'+prog.a+'\x27>'+esc(prog.al)+'</a><a class="btn-link" href=\x27'+prog.b+'\x27>'+esc(prog.bl)+' &#8599;</a></div></div>';
    h+='<p class="dg-foot">검사가 아니라 상태 보기입니다. 여섯 마음은 누구에게나 다 있고 배분이 다를 뿐이며, 의학·심리 진단이 아닙니다. 결과는 이 기기 브라우저에만 저장됩니다.</p>';
    $('dgResult').innerHTML=h; NWD.show('dgResult');
    $('dgCopy').addEventListener('click',function(){ var txt='[요즘 나의 여섯 마음 · 해설지] '+fmt(when)+'\n에너지 총량 '+r.energy+'/100 ('+band+') · 충전 '+chargers.length+' 고갈 '+drainers.length+' 쏠림 '+spread+'%\n'+sorted.map(function(m){return m.name+' '+Math.round(m.use/4*100)+'%'+(chgWord(m.chg)?'('+chgWord(m.chg)+')':'')+' '+QUAD[quad(m)].k;}).join(' · ')+'\n패턴: '+pattern.replace(/<[^>]+>/g,'')+'\n줄일 것: '+L.name+' — '+mL.less+'\n늘릴 것: '+G.name+' — '+mG.more+'\n몸의 바닥: 잠 '+r.total.sleep+' 움직임 '+r.total.move+' 의욕 '+r.total.drive+' (각 /4)\n— nedabah.org/diagnosis/minds/'; NWD.copy(txt,$('dgCopy')); });
    $('dgRetry').addEventListener('click',function(){ start(); });
  }
'''

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
      <p class="about-lead" style="margin-top:14px;">네다바웨이가 직접 설계해 준비한 진단입니다. 15문항, 약 4분. <strong>지난 2주</strong>를 떠올리며 답합니다. 나는 무슨 유형인가가 아니라, 요즘 여섯 마음에 에너지를 어떻게 나눠 쓰고 있는지를 봅니다. 그래서 4주 뒤에 다시 재도 됩니다.</p>
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
__RESULT_JS__
  $('dgStart').addEventListener('click',start);
  var last=NWD.load('minds');
  if(last&&last.a&&last.a.length===N){{ $('dgResume').hidden=false; $('dgResume').addEventListener('click',function(){{ showResult(compute(last.a), new Date(last.at), prevOf(last.hist||[])); }}); }}
  if(location.hash==='#result'&&last&&last.a){{ showResult(compute(last.a), new Date(last.at), prevOf(last.hist||[])); }}
  if(location.hash==='#demo'){{ showResult(compute([1,0, 4,-2, 2,1, 2,0, 3,1, 0,0, 3,3,2]), new Date(), null); }}
  if(location.hash==='#demo2'){{ showResult(compute([1,1, 4,-2, 2,1, 2,0, 3,1, 0,1, 1,2,2]), new Date(), {{a:[0,0, 4,-2, 1,0, 2,0, 3,0, 0,0, 1,1,1],at:new Date(Date.now()-30*86400000).toISOString()}}); }}
}});
</script>
''' + FOOTER
    out = out.replace('__RESULT_JS__', RESULT_JS)
    return out

p = ROOT / 'diagnosis' / 'minds' / 'index.html'; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(page(), encoding='utf-8')
print('ok: diagnosis/minds/index.html')
