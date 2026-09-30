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
      use='나는 처음 해 본 일이 있었다', charge='처음 해 본 일을 하고 나면 보통 어땠나요?',
      well='나는 이번 주에 처음 해 본 일이 있다', low='나의 하루가 똑같이 반복되고 궁금한 것이 없다', over='나는 시작만 많이 하고 끝낸 일이 없다',
      less='나는 새로 시작하는 일을 하나 줄이고, 이미 시작한 일 중 하나를 이번 주에 끝냅니다.', more='나는 가 본 적 없는 길로 20분 걷거나, 안 먹어 본 음식 하나를 먹어 봅니다.'),
 dict(k='maker', name='만들기', en='Maker', color='#FFC857', verb='손으로 무언가를 완성해 내는 마음',
      use='나는 결과물 하나를 끝까지 만들었다', charge='무언가를 끝까지 만들고 나면 보통 어땠나요?',
      well='나는 결과물 하나를 끝까지 만들었다', low='나에게 해야 할 일만 있고 만든 것이 없다', over='나는 쉬지 못하고 계속 만들기만 한다',
      less='나는 만드는 시간을 하루 1시간 줄이고, 끝낼 일을 하나만 정합니다.', more='나는 30분 안에 끝나는 작은 일 하나를 완성합니다. 책상 정리, 요리 한 가지, 글 한 편.'),
 dict(k='connector', name='연결', en='Connector', color='#3B82F6', verb='사람과 이어지고 대화하는 마음',
      use='나는 속마음을 나눈 사람이 있었다', charge='속마음을 나누고 나면 보통 어땠나요?',
      well='나는 속마음을 나눈 사람이 있다', low='나는 며칠째 제대로 이야기한 사람이 없다', over='나는 남의 일정에 맞추느라 내 시간이 없다',
      less='나는 약속을 하나 줄이고, 그 시간을 나를 위해 비워 둡니다.', more='나는 한 사람에게 요즘의 내 마음을 세 줄로 보냅니다.'),
 dict(k='supporter', name='돕기', en='Supporter', color='#10B981', verb='누군가를 돌보고 보탬이 되는 마음',
      use='나는 누군가를 도와주고 고맙다는 말을 들었다', charge='누군가를 도와주고 나면 보통 어땠나요?',
      well='나는 누군가를 돕고 고맙다는 말을 들었다', low='나는 내 문제만으로 벅차서 남을 볼 여유가 없다', over='나는 남을 챙기느라 내 끼니와 잠을 거른다',
      less='나는 남을 챙기기 전에 내 끼니와 잠을 먼저 챙깁니다. 부탁 하나는 거절합니다.', more='나는 작은 도움 하나를 스스로 나서서 합니다. 문 잡아 주기, 길 설명해 주기.'),
 dict(k='thinker', name='생각', en='Thinker', color='#8B5CF6', verb='멈춰서 돌아보고 이해하는 마음',
      use='나는 하루를 돌아보고 정리한 순간이 있었다', charge='하루를 돌아보고 나면 보통 어땠나요?',
      well='나는 하루를 돌아보고 정리한 순간이 있다', low='나는 생각할 틈 없이 반응만 하며 지낸다', over='나는 생각만 계속하고 행동으로 옮기지 못한다',
      less='나는 생각하는 시간을 10분으로 제한하고, 끝에 행동 하나를 적습니다.', more='나는 자기 전에 오늘 있었던 일과 느낌을 세 줄 적습니다.'),
 dict(k='enjoyer', name='즐기기', en='Enjoyer', color='#F472B6', verb='지금 이 순간을 즐기고 쉬는 마음',
      use='나는 이유 없이 좋았던 시간이 있었다', charge='그 시간을 보내고 나면 보통 어땠나요?',
      well='나는 이유 없이 좋았던 시간이 있다', low='나는 즐거운 것이 없고 쉬어도 쉰 것 같지 않다', over='나는 할 일을 피하려고 놀다가 할 일이 늦어진다',
      less='나는 즐기는 시간 앞에 끝낼 일 하나를 먼저 두고, 즐기는 시간은 정해 둔 만큼만 씁니다.', more='나는 이유 없이 좋은 20분을 하루에 한 번 만듭니다. 음악, 바다, 산책.'),
]
TOTAL = [
 dict(k='sleep', name='잠', q='나는 잠들고 깨는 시간이 일정했다', tip='나는 잠드는 시간을 이번 주 3일만 같게 맞춥니다.'),
 dict(k='move', name='움직임', q='나는 하루 20분 이상 몸을 움직였다', tip='나는 하루 20분 걷습니다. 걷는 시간을 미리 정해 둡니다.'),
 dict(k='drive', name='의욕', q='나는 아침에 하고 싶은 일이 하나는 있었다', tip='나는 전날 밤에 내일 하고 싶은 일 하나를 적어 둡니다.'),
]
_CH = {x['k']: x for x in json.loads((ROOT / '.moai/project/six-minds-data.json').read_text(encoding='utf-8'))}
for _m in MINDS: _m['char'] = _CH[_m['k']]['char']; _m['full'] = _CH[_m['k']]['n']; _m['color'] = _CH[_m['k']]['c']
USE_LK = ['전혀', '한두 번', '가끔', '자주', '거의 매일']
CHG_LK = ['많이 지침', '조금 지침', '그대로', '조금 힘남', '힘이 남']

RESULT_JS = r'''
  var fresh=false;
  // 결과는 저장하지 않습니다. 상태는 2주마다 바뀌므로 새로 고침하면 사라지고, 카드함 주소로만 다시 엽니다.
  function finish(){ fresh=true; try{ NWD.clear('minds'); }catch(e){} showResult(compute(ans), new Date(), null); }
  function chgWord(c){ return c>=1?'힘이 남':(c<=-1?'지침':''); }
  function chgColor(c){ return c>=1?'#10B981':(c<=-1?'#E11D48':'#9a948c'); }
  function quad(m){ var hi=m.use>=3, lo=m.use<=1; if(hi&&m.chg>=1) return 'engine'; if(hi&&m.chg<=-1) return 'overload'; if(lo&&m.chg>=1) return 'hidden'; if(lo&&m.chg<=-1) return 'rest'; if(m.use===4&&m.chg<=0) return 'overload'; return 'mid'; }
  var QUAD={engine:{k:'지킬 마음',d:'내가 많이 쓰고, 쓰고 나면 힘이 나는 마음입니다. 지금 나를 움직이는 마음이니 지킵니다.',c:'#10B981'},overload:{k:'줄일 마음',d:'내가 많이 쓰는데, 쓰고 나면 지치는 마음입니다. 양이 아니라 방식을 바꿀 자리입니다.',c:'#E11D48'},hidden:{k:'늘릴 마음',d:'내가 적게 쓰는데, 쓰면 힘이 나는 마음입니다. 가장 적은 힘으로 총량을 올릴 수 있는 마음입니다.',c:'#1D4ED8'},rest:{k:'기다릴 마음',d:'내가 적게 쓰고, 써도 지치는 마음입니다. 지금은 억지로 늘리지 말고 4주 뒤 다시 봅니다.',c:'#9a948c'},mid:{k:'보통',d:'내가 쓰는 양도 반응도 중간인 마음입니다. 지금은 지켜보기만 하면 됩니다.',c:'#9a948c'}};
  function stateOf(m){ if(m.use>=3&&m.chg<=-1) return {k:'지나치게 씀',c:'#E11D48'}; if(m.use>=3) return {k:'잘 쓰고 있음',c:'#10B981'}; if(m.use<=1) return {k:'거의 안 씀',c:'#B45309'}; return {k:'보통',c:'#9a948c'}; }
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
    // 늘릴 마음: hidden > low use and not tiring > lowest use
    var G = hidden[0] || r.minds.filter(function(m){return m.use<=1&&m.chg>=0;}).sort(function(a,b){return b.chg-a.chg;})[0] || B;
    var mG=mindOf(G.k);
    // 줄일 마음: overload > highest use
    var L = overload.sort(function(a,b){return b.use-a.use;})[0] || A; var mL=mindOf(L.k);
    var spread=Math.round((A.use-B.use)/4*100);
    var spreadTxt= spread>=75?'나는 몇 가지 마음만 크게 많이 썼습니다':(spread>=50?'나는 많이 쓴 마음과 적게 쓴 마음의 차이가 있습니다':'나는 여섯 마음을 비교적 고르게 쓰고 있습니다');
    var band= r.energy>=70?'넉넉':(r.energy>=50?'보통':(r.energy>=30?'낮음':'회복이 먼저'));
    var summary= r.energy>=70?'나는 잠과 움직임이 안정되어 있고, 여섯 마음을 고르게 쓰고 있습니다.':(r.energy>=50?'나는 몸의 기본은 괜찮고, 몇 가지 마음만 많이 쓰고 있습니다.':(r.energy>=30?'나는 거의 안 쓰는 마음이 몇 개 있고, 잠과 움직임부터 챙길 때입니다.':'나는 요즘 많이 지쳐 있습니다. 이번 주는 쉬는 것이 먼저입니다.'));
    var next=new Date(when.getTime()+28*86400000);
    var lowTot=T.slice().sort(function(x,y){return r.total[x.k]-r.total[y.k];})[0];
    var pattern='지난 2주 동안 나는 「'+esc(A.name)+'」을(를) 많이 쓰고 「'+esc(B.name)+'」을(를) 거의 쓰지 않았습니다.'+(A.chg<=-1?' 많이 쓰는 「'+esc(A.name)+'」이(가) 쓰고 나면 지치는 마음이라 총량이 줄고 있습니다.':(A.chg>=1?' 많이 쓰는 「'+esc(A.name)+'」이(가) 쓰고 나면 힘이 나는 마음이라 나는 아직 크게 지치지 않았습니다.':''));
    var h='<div class="dg-res" style="--rc:'+A.color+';"><p class="dg-res__k">요즘 나의 여섯 마음 · 결과</p>';
    h+='<p class="ai-note" style="margin-top:4px;">'+fmt(when)+' · 지난 2주 기준 · 다음 진단 권장: 4주 뒤 ('+fmt(next)+') · 네다바웨이가 설계한 상태 진단</p>';
    // 내 카드 먼저: 앞면 = 가장 많이 쓴 마음의 색 캐릭터, 뒷면 = 이번 진단의 내 결과
    h+='<div class="dg-mycard" style="--mc:'+A.color+';"><p class="dg-mycard__k">이번 진단의 카드함</p><p class="dg-mycard__t">요즘 나는 「'+esc(mA.full)+'」을 가장 많이 썼습니다. 나의 캐릭터는 <b>'+esc(mA.char)+'</b>입니다.</p><div id="dgBox"></div>';
    h+='<div class="dg-team"><p class="dg-team__t">우리 팀·학급의 카드를 모으면 무엇이 보일까요</p><p class="dg-team__d">구성원이 각자 진단하면 강사가 카드 뒷면을 이름 없이 모아 <b>한 장의 팀 배분 지도</b>로 만듭니다. 우리 팀이 어느 마음을 많이 쓰고 어느 마음을 거의 안 쓰는지, 혼자서는 볼 수 없는 모습을 90분 동안 함께 읽습니다.</p><p class="dg-team__cta"><a class="btn-dark" href="/minds/#invite">팀 워크숍 안내</a><a class="btn-link" href="/proposal/">대상별 제안서 &#8599;</a></p></div></div>';
    h+='<h3 class="dg-h3" style="margin-top:34px;">해설지 · 내 결과 자세히 보기</h3>';
    h+='<div class="dg-legend"><span><b>총량</b> 몸 3문항 60% + 쓰고 난 뒤 상태 40%</span><span><b>배분</b> 사용량 6 → 막대</span><span><b>쓰고 난 뒤</b> 힘이 남·지침 6 → 색·네 자리</span><span><b>조정</b> 줄일 마음 1 · 늘릴 마음 1</span></div>';
    // ① 총량
    h+='<h3 class="dg-h3">① 에너지 총량</h3>';
    h+='<div class="dg-res__head" style="margin-top:10px;">'+ring(r.energy)+'<div><p class="dg-res__t" style="font-size:clamp(22px,3vw,30px);">'+r.energy+' / 100 · '+band+'</p><p class="dg-res__d" style="margin-top:6px;">'+esc(summary)+'</p><p class="dg-res__d" style="margin-top:4px;">총량의 60%는 잠·움직임·의욕에서, 40%는 여섯 마음을 쓰고 난 뒤의 상태에서 옵니다.</p></div></div>';
    h+='<div class="dg-chips" style="margin-top:14px;">'+T.map(function(t){ var v=r.total[t.k]; var c=v>=3?'#DCFCE7':(v<=1?'#FFE4D6':'var(--chip)'); return '<span style="background:'+c+';">'+esc(t.name)+' '+v+'/4</span>'; }).join('')+'<span>힘이 나는 마음 '+chargers.length+' · 지치는 마음 '+drainers.length+' · 차이 '+spread+'%</span></div>';
    // ② 배분
    h+='<h3 class="dg-h3">② 여섯 마음의 배분</h3>';
    h+='<div class="dg-bars" style="margin-top:12px;" role="list" aria-label="마음별 에너지">'+sorted.map(function(m){ var p=Math.round(m.use/4*100), w=chgWord(m.chg); return '<div class="dg-bar" role="listitem" style="--bc:'+chgColor(m.chg)+';grid-template-columns:78px 1fr 92px;"><span class="dg-bar__l">'+esc(m.name)+'</span><span class="dg-bar__tr"><span class="dg-bar__f" style="width:'+p+'%;display:block;"></span></span><span class="dg-bar__v">'+p+'%'+(w?' <b style="color:'+chgColor(m.chg)+';">'+w+'</b>':'')+'</span></div>'; }).join('')+'</div>';
    h+='<p class="ai-note" style="margin-top:10px;">막대는 사용량, 색은 쓰고 난 뒤의 상태입니다. 초록은 쓰고 나서 힘이 난 마음, 빨강은 쓰고 나서 지친 마음, 회색은 그대로인 마음입니다. 사용량 차이 '+spread+'%. '+spreadTxt+'.</p>';
    // ③ 4사분면
    h+='<h3 class="dg-h3">③ 사용량 × 쓰고 난 뒤로 본 네 자리</h3><p class="ai-note" style="margin-top:6px;">많이 쓰는가와 쓰고 나면 힘이 나는가를 겹치면 마음마다 자리가 정해집니다. 자리 이름이 곧 이번 주 할 일입니다.</p>';
    h+='<div class="dg-quad">'+['engine','overload','hidden','rest'].map(function(q){ var list=r.minds.filter(function(m){return quad(m)===q;}); return '<div class="dg-quad__c" style="--qc:'+QUAD[q].c+';"><p class="dg-quad__k">'+QUAD[q].k+'</p><p class="dg-quad__m">'+(list.length?list.map(function(m){return esc(m.name);}).join(' · '):'—')+'</p><p class="dg-quad__d">'+QUAD[q].d+'</p></div>'; }).join('')+'</div>';
    // ④ 알아차림
    h+='<h3 class="dg-h3">④ 알아차림</h3>';
    var aware='요즘 나는 「'+esc(A.name)+'」을(를) 지키려고 「'+esc(B.name)+'」을(를) 줄여 왔습니다.'+(A.chg<=-1?' 「'+esc(A.name)+'」은(는) 내가 많이 쓰는데 쓰고 나면 지치는 마음입니다.':'');
    var sharp=[];
    if(drainers.length>=3) sharp.push('여섯 마음 중 '+drainers.length+'개가 쓸수록 나를 지치게 하는 상태입니다. 나는 더 하기보다 나를 지치게 하는 마음부터 줄이는 것이 먼저입니다.');
    if(hidden.length) sharp.push('「'+hidden.map(function(m){return esc(m.name);}).join('·')+'」은(는) 내가 거의 안 쓰는데 쓰면 힘이 나는 마음입니다. 가장 적은 힘으로 총량을 올릴 수 있는 자리입니다.');
    if(overload.length&&engines.length) sharp.push('「'+esc(overload[0].name)+'」(줄일 마음) 앞뒤에 「'+esc(engines[0].name)+'」(지킬 마음)을 붙이면 나는 같은 양을 하고도 덜 지칩니다.');
    if(!chargers.length) sharp.push('쓸수록 힘이 나는 마음이 하나도 안 보입니다. 이것은 성향이 아니라 지금의 상태입니다. 나는 즐기기와 연결을 20분씩 시험해서 어느 쪽에서 먼저 힘이 나는지 봅니다.');
    if(r.total.sleep<=1) sharp.push('잠드는 시간이 흔들리면 여섯 마음 전부를 쓰기 어려워집니다. 이번 주 조정의 첫 줄은 잠입니다.');
    if(spread>=75&&A.chg>=1) sharp.push('나는 한 마음을 크게 많이 쓰고 있지만 그 마음이 쓰고 나면 힘이 나는 마음입니다. 지금은 괜찮지만, 그 마음을 쓸 수 없는 날에는 대신 쓸 마음이 없습니다. 나는 두 번째로 힘이 나는 마음을 미리 정해 둡니다.');
    h+='<div class="dg-cards"><div class="dg-card" style="--cc:#1D4ED8;"><p class="dg-card__k">요즘의 패턴</p><p class="dg-card__d">'+pattern+'<br>'+aware+'</p></div>'+(sharp.length?'<div class="dg-card" style="--cc:#8B5CF6;"><p class="dg-card__k">예리하게 보면</p><p class="dg-card__d">'+sharp.map(function(x){return '· '+x;}).join('<br>')+'</p></div>':'')+'</div>';
    // ⑤ 이번 주 조정
    h+='<h3 class="dg-h3">⑤ 이번 주 조정 · 줄일 마음 하나, 늘릴 마음 하나</h3>';
    var pairTxt= (chargers.length&&drainers.length) ? '짝지어 쓰기: 나는 「'+esc(chargers[0].name)+'」을(를) 「'+esc(drainers[0].name)+'」 앞뒤 20분에 붙입니다.' : (chargers.length?'나는 쓰고 나면 힘이 나는 「'+chargers.map(function(m){return esc(m.name);}).join('·')+'」을(를) 하루 최소 20분 지킵니다.':'');
    h+='<div class="dg-cards"><div class="dg-card" style="--cc:#E11D48;"><p class="dg-card__k">줄일 마음 · '+esc(L.name)+'</p><p class="dg-card__d">'+esc(mL.less)+'</p></div><div class="dg-card" style="--cc:#10B981;"><p class="dg-card__k">늘릴 마음 · '+esc(G.name)+'</p><p class="dg-card__d">'+esc(mG.more)+'</p></div>'+(pairTxt?'<div class="dg-card" style="--cc:#1D4ED8;"><p class="dg-card__k">붙여 쓰기</p><p class="dg-card__d">'+pairTxt+'</p></div>':'')+'</div>';
    // ⑥ 총량 키우기
    h+='<h3 class="dg-h3">⑥ 에너지 총량을 키우는 네 가지</h3>';
    h+='<ol class="ai-steps" style="margin-top:12px;"><li><b>회복이 먼저입니다.</b> 나는 쓰고 나면 힘이 나는 마음을 하루 20분 지킵니다. 총량은 더 하기가 아니라 나를 지치게 하는 것을 줄일 때 먼저 오릅니다.'+(chargers.length?' 지금 나에게 힘이 나는 마음: '+chargers.map(function(m){return esc(m.name);}).join('·')+'.':'')+'</li><li><b>나를 지치게 하는 마음은 없애지 않고 방식을 바꿉니다.</b>'+(overload.length?' 「'+esc(overload[0].name)+'」은(는) 양을 줄이는 것이 아니라 끝낼 일 하나로 좁혀서 끝내는 경험을 다시 만듭니다.':' 지금 줄일 마음은 없습니다. 나는 이 상태를 유지합니다.')+'</li><li><b>짝을 지어 씁니다.</b> 나는 나를 지치게 하는 마음 앞뒤에 힘이 나는 마음을 붙입니다. '+(pairTxt||'만들기 → 연결, 생각 → 탐험처럼.')+'</li><li><b>여섯 마음을 쓰려면 몸이 먼저입니다.</b> 총량의 60%가 잠·움직임·의욕에서 나옵니다. 가장 낮은 '+esc(lowTot.name)+'('+r.total[lowTot.k]+'/4)부터: '+esc(lowTot.tip)+'</li></ol>';
    // ⑦ 여섯 마음 깊게 읽기 (사용량 순, 가장 많이 쓴 마음만 펼쳐 둠)
    h+='<h3 class="dg-h3">⑦ 여섯 마음 깊게 읽기</h3><p class="ai-note" style="margin-top:6px;">마음마다 사용 지수(얼마나 썼나), 회복 지수(쓰고 나서 힘이 났나), 배분 비중(여섯 마음 가운데 차지한 몫), 총량 기여(에너지 총량에 보탠 점수)를 따로 계산합니다. 같은 마음이라도 이 네 수치가 다르면 해석이 달라집니다. 「한 번 더 깊게 보기」에는 이 상태에서 내가 하기 쉬운 생각, 행동, 그 밑에 있는 마음(욕구)을 적었습니다.</p>';
    h+='<div class="mr-list">'+(window.NWCards?sorted.map(function(m,i){ return NWCards.readingHTML(r,m.k,i===0); }).join(''):'')+'</div>';
    // ⑧ 다시 진단하기: 기록을 남기지 않으므로 코드로 비교
    h+='<h3 class="dg-h3">⑧ 4주 뒤 다시</h3><p class="dg-res__d" style="margin-top:8px;">이 결과는 저장하지 않습니다. 새로 고침하면 사라지고, 4주 뒤에는 그때의 2주로 새 카드함을 받습니다. 변화를 보고 싶다면 아래 ⑨의 <b>내 코드</b>를 적어 두었다가, 다음 진단 뒤 상대 코드 칸에 이번 코드를 넣으면 두 시기를 나란히 봅니다.</p>';
    if(r.energy<30){ h+='<p class="ai-note" style="margin-top:14px;">요즘 많이 힘들다면 혼자 버티지 않아도 됩니다. 청소년은 1388, 성인은 1393(자살예방)·129(보건복지상담)에서 24시간 이야기할 수 있습니다.</p>'; }
    // ⑨ 함께 보기
    var code=encode(ans_of(r));
    h+='<h3 class="dg-h3">⑨ 함께 보기 · 서로 비교</h3><p class="ai-note" style="margin-top:6px;">내 코드를 상대에게 보내고, 상대 코드를 아래에 넣으면 두 사람의 배분이 나란히 나옵니다. 누가 낫다가 아니라, 서로 어느 마음을 잘 쓰는지를 봅니다.</p>';
    h+='<div class="dg-cmp"><div class="dg-cmp__me"><span>내 코드</span><b id="dgCode">'+code+'</b><button type="button" class="btn-ghost" id="dgCodeCopy">복사</button></div><div class="dg-cmp__in"><label for="dgOther">상대 코드</label><input id="dgOther" type="text" inputmode="latin" autocomplete="off" placeholder="예: M1A2B3C" maxlength="16"><button type="button" class="btn-go" id="dgCmpGo">비교하기</button></div><div id="dgCmpOut"></div></div>';
    h+='<div class="dg-actions"><button type="button" class="btn-go" id="dgCopy">해설지 복사</button><button type="button" class="btn-ghost" id="dgRetry">다시 진단하기</button></div></div>';
    var prog = (r.energy<50||stateOf(mindOf('enjoyer')?r.minds.filter(function(m){return m.k==='enjoyer';})[0]:B).k==='거의 안 씀') ? {t:'회복이 먼저인 상태입니다',d:'총량이 낮거나 즐기는 마음을 거의 안 쓸 때는 새 계획보다 30분 무료 상담에서 이번 주에 쉬는 시간부터 함께 정합니다.',a:'/contact.html#consult-form',al:'무료 30분 상담 신청',b:'/personal.html',bl:'퍼스널 트레이닝 코스 보기'}
      : (overload.some(function(m){return m.k==='maker'||m.k==='thinker';}) ? {t:'만들기·생각이 줄일 마음이라면, 쓰는 방식을 바꿀 때입니다',d:'학습 습관 코스는 양을 늘리는 대신 끝내는 경험을 다시 만드는 데서 시작합니다. 학습 유형 진단과 함께 보면 더 정확합니다.',a:'/personal.html#study',al:'학습 습관 코스 보기',b:'/diagnosis/learning/',bl:'학습 유형 진단 하기'}
      : (r.minds.some(function(m){return m.k==='explorer'&&m.use<=1;}) ? {t:'탐험하는 마음을 거의 안 쓴다면 진로 나침반부터',d:'궁금한 게 없는 시기에는 진로 탐색 코스의 4분면 자가진단으로 내가 가고 싶은 방향을 다시 찾습니다.',a:'/personal.html#career',al:'진로 탐색 코스 보기',b:'/contact.html#consult-form',bl:'무료 30분 상담'}
      : {t:'이 상태에 맞는 다음 걸음',d:'해설지를 복사해 상담 신청서에 붙여 넣으면 첫 30분을 설명 대신 설계에 씁니다. 기관·학교는 회기 첫날과 마지막 날 같은 진단으로 변화를 봅니다.',a:'/contact.html#consult-form',al:'무료 30분 상담 신청',b:'/programs.html',bl:'기관·기업 교육 보기'}));
    h+='<div class="dg-next"><p class="dg-next__t">'+esc(prog.t)+'</p><p class="dg-next__d">'+esc(prog.d)+'</p><div class="dg-next__cta"><a class="btn-dark" href=\x27'+prog.a+'\x27>'+esc(prog.al)+'</a><a class="btn-link" href=\x27'+prog.b+'\x27>'+esc(prog.bl)+' &#8599;</a></div></div>';
    h+='<p class="dg-foot">검사가 아니라 상태 보기입니다. 여섯 마음은 누구에게나 다 있고 배분이 다를 뿐이며, 의학·심리 진단이 아닙니다. 결과는 저장하지 않으며, 새로 고침하면 사라집니다.</p>';
    $('dgResult').innerHTML=h; NWD.show('dgResult');
    $('dgCopy').addEventListener('click',function(){ var txt='[요즘 나의 여섯 마음 · 해설지] '+fmt(when)+'\n에너지 총량 '+r.energy+'/100 ('+band+') · 힘이 나는 마음 '+chargers.length+' 지치는 마음 '+drainers.length+' 차이 '+spread+'%\n'+sorted.map(function(m){return m.name+' '+Math.round(m.use/4*100)+'%'+(chgWord(m.chg)?'('+chgWord(m.chg)+')':'')+' '+QUAD[quad(m)].k;}).join(' · ')+'\n패턴: '+pattern.replace(/<[^>]+>/g,'')+'\n줄일 마음: '+L.name+' — '+mL.less+'\n늘릴 마음: '+G.name+' — '+mG.more+'\n몸의 바닥: 잠 '+r.total.sleep+' 움직임 '+r.total.move+' 의욕 '+r.total.drive+' (각 /4)\n— nedabah.org/diagnosis/minds/'; NWD.copy(txt,$('dgCopy')); });
    $('dgRetry').addEventListener('click',function(){ start(); });
    $('dgCodeCopy').addEventListener('click',function(){ NWD.copy('요즘 나의 여섯 마음 · 내 코드 '+code+' — nedabah.org/diagnosis/minds/ 에서 비교할 수 있어요', $('dgCodeCopy')); });
    $('dgCmpGo').addEventListener('click',function(){ var v=($('dgOther').value||'').trim().toUpperCase(); var oa=decode(v); if(!oa){ $('dgCmpOut').innerHTML='<p class="ai-note" style="margin-top:10px;color:#E11D48;">코드를 읽을 수 없습니다. M으로 시작하는 8자 안팎의 코드인지 확인해 주세요.</p>'; return; } $('dgCmpOut').innerHTML=compareHtml(r, compute(oa)); });
    if(window.NWCards){ NWCards.newBox($('dgBox'), ans_of(r), fresh); fresh=false; }
    var qs=new URLSearchParams(location.search).get('c'); if(qs){ $('dgOther').value=qs; $('dgCmpGo').click(); }
  }
  function ans_of(r){ var a=[]; r.minds.forEach(function(m){ a.push(m.use, m.chg); }); a.push(r.total.sleep, r.total.move, r.total.drive); return a; }
  function encode(a){ var n=0n; for(var i=0;i<15;i++){ var v=a[i]; if(i<12&&i%2===1) v=v+2; n=n*5n+BigInt(v); } var s=n.toString(36).toUpperCase(); while(s.length<10) s='0'+s; return 'M'+s; }
  function decode(str){ if(!/^M[0-9A-Z]{10}$/.test(str)) return null; var n=0n; var s=str.slice(1).toLowerCase(); for(var i=0;i<s.length;i++){ n=n*36n+BigInt(parseInt(s[i],36)); } var a=[]; for(var j=14;j>=0;j--){ var v=Number(n%5n); n=n/5n; if(j<12&&j%2===1) v=v-2; a[j]=v; } if(n!==0n) return null; return a; }
  function compareHtml(me, you){
    var h='<div class="dg-cmp__grid" style="margin-top:14px;">';
    h+='<div class="dg-cmp__tot"><span>에너지 총량</span><b>나 '+me.energy+'</b><b>상대 '+you.energy+'</b><small>'+(Math.abs(me.energy-you.energy)<10?'비슷한 총량. 배분이 어떻게 다른지 보세요.':(me.energy>you.energy?'내 총량이 높습니다. 상대를 지치게 하는 마음이 무엇인지 먼저 물어봅니다.':'상대 총량이 높습니다. 상대에게 힘이 나는 마음이 무엇인지 물어봅니다.'))+'</small></div>';
    var notes=[];
    me.minds.forEach(function(a,i){ var b=you.minds[i]; var pa=Math.round(a.use/4*100), pb=Math.round(b.use/4*100); var qa=quad(a), qb=quad(b);
      h+='<div class="dg-cmp__row" style="--mc:'+a.color+';"><span class="dg-cmp__n">'+esc(a.name)+'</span><span class="dg-cmp__bar"><i style="width:'+pa+'%;background:'+chgColor(a.chg)+';"></i><em>나 '+pa+'%</em></span><span class="dg-cmp__bar"><i style="width:'+pb+'%;background:'+chgColor(b.chg)+';"></i><em>상대 '+pb+'%</em></span></div>';
      if(qa==='engine'&&qb==='hidden') notes.push('「'+esc(a.name)+'」은 나에게 지킬 마음이고 상대에게는 늘릴 마음입니다. 내가 어떻게 쓰는지 들려주면 상대가 가장 쉽게 배웁니다.');
      else if(qb==='engine'&&qa==='hidden') notes.push('「'+esc(a.name)+'」은 상대에게 지킬 마음이고 나에게는 늘릴 마음입니다. 상대에게 어떻게 쓰는지 물어보세요.');
      else if(qa==='overload'&&qb==='overload') notes.push('둘 다 「'+esc(a.name)+'」이 줄일 마음입니다. 서로 재촉하지 말고 이번 주는 같이 줄입니다.');
      else if(Math.abs(a.use-b.use)>=2) notes.push('「'+esc(a.name)+'」 사용량 차이가 큽니다(나 '+pa+'% · 상대 '+pb+'%). 많이 쓰는 쪽이 먼저 이야기하고, 적게 쓰는 쪽이 궁금한 것 하나를 묻습니다.');
      else if(qa==='overload'&&qb==='engine') notes.push('같은 「'+esc(a.name)+'」을 쓰고 나서 나는 지치고, 상대는 힘이 납니다. 양이 아니라 쓰는 방식이 다릅니다. 상대의 방식을 물어보세요.');
      else if(qb==='overload'&&qa==='engine') notes.push('같은 「'+esc(a.name)+'」을 쓰고 나서 상대는 지치고, 나는 힘이 납니다. 내 방식을 나눠 주세요.');
    });
    h+='</div>';
    if(!notes.length) notes.push('배분이 비슷합니다. 서로의 "이번 주 한 가지"를 바꿔서 해 보세요.');
    h+='<div class="dg-card" style="--cc:#1D4ED8;margin-top:12px;"><p class="dg-card__k">서로를 이해하는 문장</p><p class="dg-card__d">'+notes.slice(0,4).map(function(x){return '· '+x;}).join('<br>')+'</p></div>';
    h+='<p class="ai-note" style="margin-top:10px;">막대는 사용량, 색은 쓰고 난 뒤의 상태(초록 힘이 남 · 빨강 지침 · 회색 그대로). 비교는 우열이 아니라 서로 잘 쓰는 마음을 찾는 일입니다.</p>';
    return h;
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
        <p class="card__d" style="font-weight:700;color:var(--ink);">캐릭터 · {esc(m["char"])}</p>
        <p class="card__d">{esc(m["verb"])}.</p>
        <ul><li><b>잘 쓰고 있을 때</b> {esc(m["well"])}</li><li><b>거의 안 쓸 때</b> {esc(m["low"])}</li><li><b>지나치게 쓸 때</b> {esc(m["over"])}</li></ul>
      </article>
''' for m in MINDS)
    out = head(title, desc, url, 'diag-minds', f'<script type="application/ld+json">\n{ld}\n</script>\n<link rel="stylesheet" href="/assets/mind-cards.css">\n<script src="/assets/js/supabase-config.js" defer></script>\n<script src="/assets/mind-data.js" defer></script>\n<script src="/assets/mind-cards.js" defer></script>\n') + HEADER
    out += f'''
<main id="main">
<section class="sec" aria-labelledby="mdTitle" style="padding-top:72px;">
  <div class="wrap dg-wrap">
    <p style="font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.08em;color:var(--cobalt);margin-bottom:12px;"><a href="/diagnosis/">&larr; 무료진단</a> · 03 요즘 나의 여섯 마음</p>
    <div class="sec-head" style="margin-bottom:28px;">
      <h1 class="sec-title" id="mdTitle">요즘 나의<br>여섯 마음<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:14px;">네다바웨이가 직접 설계해 준비한 진단입니다. 15문항, 약 4분. <strong>지난 2주</strong>를 떠올리며 답합니다. 나는 무슨 유형인가가 아니라, 요즘 여섯 마음에 에너지를 어떻게 나눠 쓰고 있는지를 봅니다. 그래서 4주 뒤에 다시 해 봐도 됩니다.</p>
    </div>

    <div class="dg-top" hidden><div class="dg-top__bar"><div class="dg-top__fill"></div></div><span class="dg-top__n">0 / 15</span></div>

    <div id="dgIntro" class="dg-intro">
      <p class="dg-intro__t">진단을 마치면, 내 결과가 뒷면에 담긴 카드를 받습니다</p>
      <p class="dg-intro__d">바쁘게 지내는 것과 힘이 나는 것은 다릅니다. 같은 하루를 살아도 나는 어떤 마음을 쓰면 힘이 나고, 어떤 마음을 쓰면 지칩니다. 그 차이를 모르면 나는 "더 열심히"만 하게 됩니다. 카드 앞면에는 내가 가장 많이 쓴 마음의 색 캐릭터가, 뒷면에는 내 에너지 총량과 여섯 마음 배분, 이번 주 줄일 마음과 늘릴 마음이 들어갑니다.</p>
      <div class="dg-intro__cta"><button type="button" class="btn-go" id="dgStart">진단 시작 {ARROW}</button><a class="btn-link" href="/minds/">여섯 마음 먼저 읽기 &#8599;</a></div>
      <div class="dg-sample"><div id="dgSample"></div></div>
      <div class="dg-why">
        <div class="dg-why__c"><b>왜 필요한가</b><span>자기결정이론(Ryan &amp; Deci)은 자율성·유능감·관계성이 충족될 때 사람이 스스로 움직인다고 말합니다. 내가 어느 마음을 거의 안 쓰는지 알면 이번 주에 무엇부터 할지 정할 수 있습니다.</span></div>
        <div class="dg-why__c"><b>무엇을 보나 · 세 층</b><span>① 총량(잠·움직임·의욕 3문항) ② 배분(여섯 마음 사용량 6문항) ③ 쓰고 난 뒤(힘이 나나, 지치나 6문항). 겹치지 않고 빠짐없이, 15문항.</span></div>
        <div class="dg-why__c"><b>어떻게 진행하나</b><span>지난 2주를 떠올리며 고르면 다음으로 넘어갑니다. 약 4분. 내 결과 카드와 해설지가 나오고, 코드로 다른 사람과 비교할 수 있습니다. 4주 뒤 다시 해 봅니다.</span></div>
      </div>
      <p class="ai-note" style="margin-top:14px;">유형을 판정하지 않습니다. 결과는 저장하지 않아 새로 고침하면 사라지고, 비교는 코드를 서로 보여 줄 때만 됩니다.</p>
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
      <p class="sec-lead">각 마음을 한 문장으로 정의하고, 잘 쓰고 있을 때·거의 안 쓸 때·지나치게 쓸 때의 신호를 적었습니다. 문항은 이 신호에서 나옵니다.</p>
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
    else if(s.kind==='chg'){{ h='<div class="dg-q"><p class="dg-q__k">'+esc(s.m.name)+' · 쓰고 난 뒤 · '+(cur+1)+' / '+N+'</p><p class="dg-q__t">'+esc(s.m.charge)+'</p><p class="ai-note" style="margin-top:6px;">거의 안 했다면 "그대로"를 고르세요.</p>'+likert(CHG_LK,-2)+'</div>'; }}
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
  var _from=window.NWCards?NWCards.trackVisit():null;
  if(_from){{ var _b=document.createElement('p'); _b.className='dg-invited'; _b.innerHTML='<b>친구가 보낸 6 MINDS입니다.</b> 4분 진단하면 나에게도 내 결과가 담긴 마음 카드 여섯 장이 생깁니다.'; $('dgIntro').insertBefore(_b,$('dgIntro').firstChild); }}
  if(window.NWCards){{ NWCards.card($('dgSample'),{{k:'enjoyer',title:'진단하면 받는 카드 · 예시',onGo:function(){{ start(); }}}}); }}
  $('dgStart').addEventListener('click',start);
  if(location.hash==='#demo'){{ showResult(compute([1,0, 4,-2, 2,1, 2,0, 3,1, 0,0, 3,3,2]), new Date(), null); }}
}});
</script>
''' + FOOTER
    out = out.replace('__RESULT_JS__', RESULT_JS)
    return out

p = ROOT / 'diagnosis' / 'minds' / 'index.html'; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(page(), encoding='utf-8')
print('ok: diagnosis/minds/index.html')
