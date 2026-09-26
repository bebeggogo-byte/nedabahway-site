#!/usr/bin/env python3
"""Generate the 「방구석고민, 바닷가코칭」 pages: /gomin/ (intro + 상시 벽), /gomin/new/ (운영자 보드 만들기), /gomin/b/ (보드).

Usage: python3 scripts/build-gomin.py
"""
import importlib.util, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://www.nedabah.org'
spec = importlib.util.spec_from_file_location('bd', ROOT / 'scripts' / 'build-diagnosis.py')
bd = importlib.util.module_from_spec(spec); spec.loader.exec_module(bd)
head, HEADER, FOOTER, ARROW = bd.head, bd.HEADER.replace(' aria-current="page"', ''), bd.FOOTER, bd.ARROW

EXTRA = '<link rel="stylesheet" href="/assets/gomin.css">\n'
SCRIPTS = '<script src="/assets/gomin-config.js"></script>\n<script src="/assets/qrcode.js"></script>\n<script src="/assets/gomin.js"></script>\n'
FOOT = FOOTER.replace('<script src="/assets/diag.js" defer></script>\n', '')

TOPICS = ['문제에 직면한 순간', '인간관계', '주체적 자아', '판단 기준', '진로 상담', '자기소개서', '면접 1분 자기소개', '자기 이해', '과제와 미루기', '문제 해결 프로젝트 프로세스']

def intro():
    title = '방구석고민, 바닷가코칭 — 고민 포스트잇 벽 | 네다바웨이'
    desc = '방구석에서 적은 고민을 바닷가 코칭으로 답합니다. 포스트잇처럼 고민을 붙이고, 공감 하트가 많은 고민부터 유튜브 콘텐츠로 다룹니다. 가입 없이 바로 붙일 수 있습니다.'
    url = f'{SITE}/gomin/'
    ld = json.dumps({"@context":"https://schema.org","@type":"WebPage","name":"방구석고민, 바닷가코칭","url":url,"description":desc,"inLanguage":"ko","isPartOf":{"@type":"WebSite","name":"네다바웨이","url":SITE+"/"}}, ensure_ascii=False)
    topics = ''.join(f'<span>{bd.esc(t)}</span>' for t in TOPICS)
    return head(title, desc, url, 'gomin', EXTRA + f'<script type="application/ld+json">\n{ld}\n</script>\n') + HEADER + f'''
<main id="main">
<section class="sec" aria-labelledby="gmTitle" style="padding-top:72px;">
  <div class="wrap">
    <div class="sec-head reveal" style="margin-bottom:0;">
      <p class="sec-kicker">YouTube · 고민 벽</p>
      <h1 class="sec-title" id="gmTitle">방구석고민,<br>바닷가코칭<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:18px;">방구석에서 혼자 굴리던 고민을 여기에 한 장 붙여 주세요. 공감 하트가 많이 모인 고민부터 제주 바닷가에서 코칭으로 답하는 유튜브 콘텐츠를 만듭니다. 이름도, 가입도 필요 없습니다.</p>
      <div class="gm-topics" aria-label="다루는 주제">{topics}</div>
    </div>

    <div class="gm-steps">
      <div class="gm-step reveal" style="--tc:var(--maker);"><p class="gm-step__n">01</p><p class="gm-step__t">붙인다</p><p class="gm-step__d">아래 벽에 고민을 200자 안에 적어 붙입니다. 닉네임은 적어도 되고 안 적어도 됩니다.</p></div>
      <div class="gm-step reveal" style="--tc:var(--enjoyer);"><p class="gm-step__n">02</p><p class="gm-step__t">공감한다</p><p class="gm-step__d">나도 그렇다 싶은 고민에 하트를 누릅니다. 하트가 많은 고민이 위로 올라옵니다. 한 기기에서 메모마다 한 번만.</p></div>
      <div class="gm-step reveal" style="--tc:var(--connector);"><p class="gm-step__n">03</p><p class="gm-step__t">코칭으로 답한다</p><p class="gm-step__d">위로 올라온 고민을 골라 바닷가에서 코칭 대화로 풀고 유튜브에 올립니다. 고민 주인은 밝히지 않습니다.</p></div>
    </div>

    <div class="gm-wall" id="gmWall" data-code="MAIN"></div>

    <div class="dg-next" style="margin-top:32px;">
      <p class="dg-next__t">벽에 붙이기엔 무거운 고민이라면</p>
      <p class="dg-next__d">공개 벽 대신 1:1로 이야기하고 싶다면 30분 무료 상담이 있습니다. 학생도 어른도, 이름만 적어도 됩니다.</p>
      <div class="dg-next__cta"><a class="btn-dark" href="/contact.html#consult-form">무료 30분 상담 신청</a><a class="btn-link" href="/diagnosis/">먼저 무료진단 해 보기 &#8599;</a></div>
    </div>

    <p class="dg-note" style="margin-top:28px;font-size:14px;color:var(--text-3);">붙인 글은 누구나 볼 수 있습니다. 이름, 학교, 연락처처럼 사람을 알아볼 수 있는 정보는 적지 마세요. 운영자는 부적절한 글을 숨길 수 있습니다. 하트는 기기 단위로 세므로 같은 사람이 여러 기기에서 누르면 막지 못합니다.</p>

    <div class="mailcard reveal" style="margin-top:56px;">
      <h2 class="mailcard__t">강의·워크숍 현장에서도 그대로 씁니다</h2>
      <p class="mailcard__d">주제와 장소만 적으면 그 자리에서 고민 보드가 생깁니다. 참여자는 QR로 들어와 붙이고, 큰 화면에는 하트순으로 올라옵니다.</p>
      <a class="mailcard__btn" href="/gomin/new/">현장용 보드 만들기 <span aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</section>
</main>
''' + SCRIPTS + '''<script>
document.addEventListener('DOMContentLoaded',function(){ var el=document.getElementById('gmWall'); if(el) GOMIN.mountWall({code:el.getAttribute('data-code'),root:el,showHead:false}); });
</script>
''' + FOOT

def newboard():
    title = '현장용 고민 보드 만들기 — 방구석고민, 바닷가코칭 | 네다바웨이'
    desc = '주제·장소·대상만 적으면 참여 코드와 QR이 나오는 현장용 고민 포스트잇 보드. 운영자 PIN으로 메모 숨기기와 CSV 내보내기.'
    url = f'{SITE}/gomin/new/'
    return head(title, desc, url, 'gomin', EXTRA + '<meta name="robots" content="noindex">\n') + HEADER + f'''
<main id="main">
<section class="sec" aria-labelledby="nbTitle" style="padding-top:72px;">
  <div class="wrap dg-wrap">
    <p style="font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.08em;color:var(--cobalt);margin-bottom:12px;"><a href="/gomin/">&larr; 방구석고민, 바닷가코칭</a> · 운영자</p>
    <div class="sec-head" style="margin-bottom:28px;">
      <h1 class="sec-title" id="nbTitle">현장용 고민 보드<br>만들기<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:14px;">세 칸만 적으면 됩니다. 만들면 참여 코드(4글자)와 QR이 나오고, 참여자는 그 자리에서 붙이기 시작합니다. 큰 화면용 보기를 프로젝터에 띄우면 하트순으로 올라옵니다.</p>
    </div>

    <form class="gm-new" id="nbForm">
      <div class="field" style="margin-top:0;"><label for="nbTitleIn">주제 <span aria-hidden="true">*</span></label><input id="nbTitleIn" type="text" maxlength="80" required placeholder="예: 진로, 지금 가장 막막한 것"></div>
      <div class="field"><label for="nbPlace">장소 · 강의처</label><input id="nbPlace" type="text" maxlength="80" placeholder="예: 서귀포고 2학년 진로 특강"></div>
      <div class="field"><label for="nbAud">대상</label><input id="nbAud" type="text" maxlength="80" placeholder="예: 고2 학생 28명"></div>
      <div class="field"><label for="nbPin">운영자 PIN <span aria-hidden="true">*</span></label><input id="nbPin" type="text" inputmode="numeric" minlength="4" maxlength="12" required autocomplete="off" placeholder="4~12자. 메모 숨기기·CSV·보드 닫기에 씁니다"><p class="hint">PIN은 해시로만 저장되어 잊으면 되찾을 수 없습니다. 어딘가 적어 두세요.</p></div>
      <div class="dg-intro__cta" style="margin-top:24px;"><button type="submit" class="btn-go" id="nbGo">보드 만들기 {ARROW}</button><span class="hint" id="nbMsg"></span></div>
    </form>

    <div id="nbDone" hidden></div>

    <div class="dg-next" style="margin-top:40px;">
      <p class="dg-next__t">현장에서 이렇게 씁니다</p>
      <ol class="ai-steps" style="margin-top:14px;">
        <li>강의 시작 전에 보드를 만들고 큰 화면용 보기를 프로젝터에 띄웁니다. QR과 코드가 화면 위에 계속 보입니다.</li>
        <li>참여자는 QR을 찍거나 nedabah.org/gomin/b/ 에서 코드를 넣고 고민을 붙입니다. 하트로 공감을 모읍니다.</li>
        <li>하트가 많은 고민부터 그 자리에서 다룹니다. 끝나면 운영자 모드에서 CSV로 내보내 콘텐츠 주제로 씁니다.</li>
      </ol>
    </div>
  </div>
</section>
</main>
''' + SCRIPTS + '''<script>
document.addEventListener('DOMContentLoaded',function(){
  var f=document.getElementById('nbForm'), msg=document.getElementById('nbMsg'), done=document.getElementById('nbDone');
  if(!GOMIN.ready){ msg.textContent='아직 데이터 저장소가 연결되지 않아 보드를 만들 수 없습니다.'; document.getElementById('nbGo').disabled=true; return; }
  f.addEventListener('submit',function(e){
    e.preventDefault(); msg.textContent='';
    var t=document.getElementById('nbTitleIn').value.trim(), p=document.getElementById('nbPlace').value.trim(), a=document.getElementById('nbAud').value.trim(), pin=document.getElementById('nbPin').value.trim();
    if(t.length<1||pin.length<4){ msg.textContent='주제와 PIN(4자 이상)을 적어 주세요.'; return; }
    var btn=document.getElementById('nbGo'); btn.disabled=true;
    GOMIN.createBoard(t,p,a,pin).then(function(b){
      GOMIN.pinSet(b.code,pin);
      var url=GOMIN.boardUrl(b.code);
      done.hidden=false;
      done.innerHTML='<div class="gm-done"><div><div class="gm-qr" id="nbQr"></div></div><div><p class="gm-head__k">보드가 만들어졌습니다</p><p class="gm-done__code">'+GOMIN.esc(b.code)+'</p><p class="gm-done__url">'+GOMIN.esc(url)+'</p><div class="gm-done__cta"><a class="btn-dark" href=\\x27'+GOMIN.esc(url)+'\\x27>보드 열기</a><a class="btn-link" href=\\x27'+GOMIN.esc(url)+'&screen=1\\x27 target="_blank" rel="noopener">큰 화면용 보기 &#8599;</a><button type="button" class="btn-link" id="nbCopy" style="background:none;border:0;cursor:pointer;">주소 복사</button></div></div></div>';
      GOMIN.qr(document.getElementById('nbQr'),url,170);
      document.getElementById('nbCopy').addEventListener('click',function(){ NWD.copy(url,this); });
      done.scrollIntoView({behavior:'smooth',block:'start'});
      btn.disabled=false;
    }).catch(function(err){ btn.disabled=false; msg.textContent=GOMIN.errMsg(err); });
  });
});
</script>
''' + FOOT.replace('<script src="/assets/sky.js" defer></script>', '<script src="/assets/sky.js" defer></script>\n<script src="/assets/diag.js" defer></script>')

def board():
    title = '고민 보드 — 방구석고민, 바닷가코칭 | 네다바웨이'
    desc = '참여 코드로 들어와 고민을 붙이고 하트로 공감합니다. 하트가 많은 고민이 위로 올라옵니다.'
    url = f'{SITE}/gomin/b/'
    return head(title, desc, url, 'gomin', EXTRA + '<meta name="robots" content="noindex">\n') + HEADER + f'''
<main id="main">
<section class="sec" aria-label="고민 보드" style="padding-top:56px;">
  <div class="wrap">
    <div id="gmEnter" hidden>
      <p style="font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.08em;color:var(--cobalt);margin-bottom:12px;"><a href="/gomin/">&larr; 방구석고민, 바닷가코칭</a></p>
      <div class="dg-intro">
        <p class="dg-intro__t">참여 코드를 넣어 주세요</p>
        <p class="dg-intro__d">강사가 화면에 띄운 4글자 코드입니다. QR을 찍었다면 자동으로 들어갑니다.</p>
        <form class="gm-form__row" id="gmEnterForm" style="border:0;padding-top:16px;"><label class="sr-only" for="gmCode">참여 코드</label><input id="gmCode" type="text" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="예: A7KQ" style="font-family:var(--display);font-size:22px;letter-spacing:.2em;text-transform:uppercase;"><button type="submit" class="btn-go">들어가기 {ARROW}</button></form>
      </div>
    </div>
    <div class="gm-wall" id="gmWall"></div>
  </div>
</section>
</main>
''' + SCRIPTS + '''<script>
document.addEventListener('DOMContentLoaded',function(){
  var q=new URLSearchParams(location.search), code=(q.get('c')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8), screen=q.get('screen')==='1';
  var enter=document.getElementById('gmEnter'), wall=document.getElementById('gmWall');
  if(screen) document.documentElement.classList.add('gm-screen');
  if(!code){ enter.hidden=false; document.getElementById('gmEnterForm').addEventListener('submit',function(e){ e.preventDefault(); var c=document.getElementById('gmCode').value.toUpperCase().replace(/[^A-Z0-9]/g,''); if(c) location.search='?c='+c; }); return; }
  document.title=code+' · 고민 보드 | 네다바웨이';
  GOMIN.mountWall({code:code,root:wall,showHead:true,screen:screen});
});
</script>
''' + FOOT

def write(p, s):
    p = ROOT / p; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(s, encoding='utf-8')

write('gomin/index.html', intro())
write('gomin/new/index.html', newboard())
write('gomin/b/index.html', board())
print('ok: gomin/index.html gomin/new/index.html gomin/b/index.html')
