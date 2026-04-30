/* AI 작업실 v2 — 보조 동작 모듈
 *
 * 역할:
 *   - localStorage 영속 (5블럭 입력값 자동 저장·복원)
 *   - 결과 복사·다운로드(.txt) 도구 자동 부착
 *   - 블럭 ④ 실시간 글자수 카운터 + 사전 게이트 미터
 *   - 블럭 ② 강점·결핍 동일 단어 검증
 *   - 블럭 ⑤ 시간 배분 슬라이더 (관찰·묵상·사귐 비율 사용자 지정)
 *   - 블럭마다 보조 CTA·교차 링크 자동 삽입
 *   - 블럭 ⑥ IDEN×5S 통합 진단 (별도 모듈 block6.js가 담당)
 *
 * 호환: ai.html 기존 코드를 손대지 않는다.
 *       이 스크립트는 DOMContentLoaded 후 비파괴적으로 자리만 추가한다.
 */

(function(){
  'use strict';

  const LS_KEY = 'nedabah:ai-studio:v2';
  const $ = (s, root) => (root||document).querySelector(s);
  const $$ = (s, root) => Array.from((root||document).querySelectorAll(s));

  // ─────────────────────────── 토스트
  function toast(msg, kind){
    let el = $('.as-toast');
    if(!el){
      el = document.createElement('div');
      el.className = 'as-toast';
      document.body.appendChild(el);
    }
    el.className = 'as-toast' + (kind ? ' '+kind : '') + ' show';
    el.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>{ el.classList.remove('show'); }, 2200);
  }

  // ─────────────────────────── localStorage 헬퍼
  function loadStore(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function saveStore(data){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(data)); return true; }
    catch(e){ return false; }
  }
  function setBlockData(key, payload){
    const s = loadStore();
    s[key] = Object.assign({}, payload, {ts: Date.now()});
    saveStore(s);
  }
  function getBlockData(key){
    return loadStore()[key] || null;
  }
  function clearBlockData(key){
    const s = loadStore();
    delete s[key];
    saveStore(s);
  }

  // ─────────────────────────── 자동 저장: input·textarea·select
  function autosaveField(el, key, field){
    const sync = () => {
      const cur = getBlockData(key) || {};
      cur[field] = el.value;
      setBlockData(key, cur);
    };
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
  }

  function restoreField(el, key, field){
    const data = getBlockData(key);
    if(data && data[field] !== undefined && data[field] !== ''){
      el.value = data[field];
    }
  }

  // ─────────────────────────── 출력 박스 자동 저장 (runX 함수가 갱신할 때 잡아냄)
  function watchOutput(elId, key){
    const el = document.getElementById(elId);
    if(!el) return;
    const obs = new MutationObserver(()=>{
      const text = el.textContent || '';
      if(!text.trim()) return;
      const cur = getBlockData(key) || {};
      cur._output = text;
      cur._outputTs = Date.now();
      setBlockData(key, cur);
    });
    obs.observe(el, {childList:true, characterData:true, subtree:true});
  }

  // ─────────────────────────── 도구 버튼 묶음 부착
  function attachTools(blockSel, outId, key, label){
    const block = $(blockSel);
    if(!block) return;
    const widget = $('.widget', block);
    if(!widget) return;
    const out = document.getElementById(outId);
    if(!out) return;

    const bar = document.createElement('div');
    bar.className = 'as-tools';
    bar.innerHTML = `
      <button data-act="copy">📋 결과 복사</button>
      <button data-act="download">⬇ TXT 다운로드</button>
      <button data-act="print">🖨 프린트</button>
      <button data-act="reset">↺ 입력 초기화</button>
      <span class="as-tools__hint">자동 저장됨</span>
    `;
    widget.appendChild(bar);

    bar.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button');
      if(!btn) return;
      const act = btn.dataset.act;
      const text = (out.textContent || '').trim();

      if(act === 'copy'){
        if(!text){ toast('결과가 비어 있습니다.', 'warn'); return; }
        if(navigator.clipboard){
          navigator.clipboard.writeText(text).then(()=>toast('복사 완료', 'ok'));
        } else {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
          toast('복사 완료', 'ok');
        }
      } else if(act === 'download'){
        if(!text){ toast('결과가 비어 있습니다.', 'warn'); return; }
        const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,16);
        const fname = `nedabah_${label}_${ts}.txt`;
        const blob = new Blob([text + '\n\n— nedabah.org/ai.html'], {type:'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fname; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        toast('다운로드 시작: ' + fname, 'ok');
      } else if(act === 'print'){
        window.print();
      } else if(act === 'reset'){
        if(!confirm('이 블럭의 입력과 저장된 결과를 비웁니다. 진행할까요?')) return;
        clearBlockData(key);
        $$('input, textarea, select', block).forEach(f=>{
          if(f.type === 'number') f.value = f.defaultValue || '';
          else if(f.tagName === 'SELECT') f.selectedIndex = 0;
          else f.value = '';
        });
        out.textContent = ''; out.className = 'out';
        toast('초기화 완료', 'ok');
      }
    });
  }

  // ─────────────────────────── 마지막 결과 복원 안내
  function showRestoreHint(blockSel, outId, key){
    const block = $(blockSel);
    const out = document.getElementById(outId);
    if(!block || !out) return;
    const data = getBlockData(key);
    if(!data || !data._output) return;
    const widget = $('.widget', block);
    if(!widget) return;

    const tDiff = Math.round((Date.now() - (data._outputTs || data.ts || 0)) / 60000);
    const ago = tDiff < 1 ? '방금 전' : tDiff < 60 ? `${tDiff}분 전` : `${Math.round(tDiff/60)}시간 전`;

    const box = document.createElement('div');
    box.className = 'as-restore';
    box.innerHTML = `
      <span>마지막 결과가 ${ago} 자리에 있습니다.</span>
      <span>
        <button data-act="restore">결과 다시 보기</button>
        <button class="dismiss" data-act="dismiss">닫기</button>
      </span>
    `;
    // tools 위에 배치
    const tools = $('.as-tools', widget);
    if(tools){ widget.insertBefore(box, tools); }
    else widget.appendChild(box);

    box.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button'); if(!btn) return;
      if(btn.dataset.act === 'restore'){
        out.textContent = data._output;
        out.classList.add('ok');
        box.remove();
        toast('이전 결과 복원', 'ok');
      } else {
        box.remove();
      }
    });
  }

  // ─────────────────────────── 보조 CTA · 교차 링크 삽입
  const CTA_MAP = {
    sim:  {label:'이 흐름으로 강의 의뢰', target:'/contact.html', alt:'/programs.html', altLabel:'강의 프로그램 보기'},
    iden: {label:'IDEN 코어 보기', target:'/#iden-core', alt:'/blog/perspective/', altLabel:'관점 노트'},
    self: {label:'5S 학문 매핑표', target:'/resources/evidence/2026-04-29_5s-framework-academic-mapping.html', alt:'/contact.html', altLabel:'코칭 의뢰'},
    gate: {label:'관점 노트 보기', target:'/blog/perspective/', alt:'/resources/', altLabel:'자료실'},
    sbm:  {label:'SBM 관찰 Atlas', target:'/magazine.html', alt:'/contact.html', altLabel:'그룹 묵상 의뢰'}
  };
  const LINK_MAP = {
    sim:  [['관점 노트 — 강의 설계', '/blog/perspective/'], ['활동지 자료실', '/resources/worksheets/']],
    iden: [['IDEN 1pager', '/iden-onepager.html'], ['IDEN 제안서', '/iden-proposal.html']],
    self: [['Evidence 자료실', '/resources/evidence/'], ['진단 자료실', '/resources/diagnostics/']],
    gate: [['글 정직성 16원칙', '/blog/perspective/'], ['Curations', '/resources/curations/']],
    sbm:  [['관찰 Atlas', '/magazine.html'], ['SBM 매뉴얼', '/blueprint.html']]
  };

  function attachCTA(blockSel, key){
    const block = $(blockSel);
    if(!block) return;
    const widget = $('.widget', block);
    if(!widget) return;
    const cta = CTA_MAP[key]; const links = LINK_MAP[key] || [];

    const row = document.createElement('div');
    row.className = 'as-cta-row';
    row.innerHTML = `
      <strong>다음 자리</strong>
      <a href="${cta.target}">${cta.label} →</a>
      <a class="alt" href="${cta.alt}">${cta.altLabel}</a>
    `;
    widget.appendChild(row);

    if(links.length){
      const strip = document.createElement('div');
      strip.className = 'as-link-strip';
      strip.innerHTML = '<span>관련 자료:</span>' +
        links.map(([n,u])=>`<a href="${u}">${n}</a>`).join('');
      widget.appendChild(strip);
    }
  }

  // ─────────────────────────── 블럭 ② 강점·결핍 동일 단어 검증
  function setupIdenTwinCheck(){
    const need = $('#iden-need'); const str = $('#iden-strength');
    if(!need || !str) return;
    const warn = document.createElement('div');
    warn.className = 'as-twin-warn';
    warn.textContent = '⚠️ 강점과 결핍이 같은 단어입니다. 좌표가 빈 자리가 됩니다 — 다른 단어로 시도해 주세요.';
    str.parentElement.parentElement.parentElement.appendChild(warn);

    const check = ()=>{
      const a = need.value.trim(); const b = str.value.trim();
      if(a && b && a === b){ warn.classList.add('show'); }
      else { warn.classList.remove('show'); }
    };
    need.addEventListener('input', check);
    str.addEventListener('input', check);
  }

  // ─────────────────────────── 블럭 ④ 실시간 카운터 + 미터
  function setupGateCounter(){
    const ta = $('#gate-body');
    if(!ta) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="as-counter">
        <span><b id="gateLen">0</b>자 / 최소 200자</span>
        <span id="gateState" class="warn">짧음</span>
      </div>
      <div class="as-meter"><i id="gateBar" style="width:0%"></i></div>
    `;
    ta.parentElement.appendChild(wrap);
    const lenEl = wrap.querySelector('#gateLen');
    const stEl = wrap.querySelector('#gateState');
    const bar = wrap.querySelector('#gateBar');

    const refresh = ()=>{
      const len = ta.value.replace(/\s+/g,'').length;
      lenEl.textContent = len;
      const pct = Math.min(100, Math.round((len/400)*100));
      bar.style.width = pct + '%';
      bar.className = '';
      if(len >= 200){ bar.classList.add('ok'); stEl.className='ok'; stEl.textContent='충분'; }
      else if(len >= 100){ bar.classList.add('mid'); stEl.className=''; stEl.textContent='보강 권장'; }
      else { stEl.className='warn'; stEl.textContent='짧음'; }
    };
    ta.addEventListener('input', refresh);
    refresh();
  }

  // ─────────────────────────── 블럭 ⑤ 시간 배분 슬라이더
  function setupSBMSlider(){
    const block = $('#sbm');
    if(!block) return;
    const widget = $('.widget', block);
    const lenSel = $('#sbm-length');
    if(!widget || !lenSel) return;

    const row = document.createElement('div');
    row.className = 'as-slider-row';
    row.innerHTML = `
      <label>관찰·묵상·사귐 시간 비율 (기본 40·40·20%)</label>
      <input type="range" id="sbm-ratio-obs" min="20" max="60" value="40" step="5">
      <input type="range" id="sbm-ratio-med" min="20" max="60" value="40" step="5">
      <div class="as-slider-vals">
        관찰 <span id="sbmRobs">40</span>% · 묵상 <span id="sbmRmed">40</span>% · 사귐 <span id="sbmRcom">20</span>%
      </div>
    `;
    // 분량 select 바로 아래에 배치
    lenSel.parentElement.parentElement.after(row);

    const obs = $('#sbm-ratio-obs'); const med = $('#sbm-ratio-med');
    const oV = $('#sbmRobs'); const mV = $('#sbmRmed'); const cV = $('#sbmRcom');

    const refresh = ()=>{
      let o = parseInt(obs.value); let m = parseInt(med.value);
      // com을 음수 안 되게 캡
      if(o + m > 90){ m = 90 - o; med.value = m; }
      const c = 100 - o - m;
      oV.textContent = o; mV.textContent = m; cV.textContent = c;
      // 글로벌 변수로 공개 (runSBM이 있다면 사용 가능; 없으면 무시)
      window.SBM_RATIO = {obs:o/100, med:m/100, com:c/100};
    };
    obs.addEventListener('input', refresh);
    med.addEventListener('input', refresh);
    refresh();
  }

  // ─────────────────────────── 메타 OG 이미지 보강
  function ensureOGImage(){
    if(document.querySelector('meta[property="og:image"]')) return;
    const head = document.head;
    const m1 = document.createElement('meta');
    m1.setAttribute('property','og:image');
    m1.setAttribute('content','https://www.nedabah.org/assets/og/ai-studio.svg');
    head.appendChild(m1);
    const m2 = document.createElement('meta');
    m2.setAttribute('name','twitter:card');
    m2.setAttribute('content','summary_large_image');
    head.appendChild(m2);
    const m3 = document.createElement('meta');
    m3.setAttribute('name','twitter:image');
    m3.setAttribute('content','https://www.nedabah.org/assets/og/ai-studio.svg');
    head.appendChild(m3);
  }

  // ─────────────────────────── DOM 준비 후 일괄 부착
  function init(){
    ensureOGImage();

    // ① Sim
    const simFields = ['sim-target','sim-topic','sim-mins','sim-tone','sim-headcount'];
    simFields.forEach(id=>{
      const el = document.getElementById(id);
      if(el){ restoreField(el, 'sim', id); autosaveField(el, 'sim', id); }
    });
    watchOutput('sim-out', 'sim');
    showRestoreHint('#sim', 'sim-out', 'sim');
    attachTools('#sim', 'sim-out', 'sim', 'simulation');
    attachCTA('#sim', 'sim');

    // ② IDEN
    const idenFields = ['iden-person','iden-need','iden-strength','iden-step'];
    idenFields.forEach(id=>{
      const el = document.getElementById(id);
      if(el){ restoreField(el, 'iden', id); autosaveField(el, 'iden', id); }
    });
    watchOutput('iden-out', 'iden');
    showRestoreHint('#iden', 'iden-out', 'iden');
    attachTools('#iden', 'iden-out', 'iden', 'iden-coordinate');
    attachCTA('#iden', 'iden');
    setupIdenTwinCheck();

    // ③ 5S
    const s5Fields = ['s5-see','s5-speak','s5-sense','s5-steer','s5-sustain'];
    s5Fields.forEach(id=>{
      const el = document.getElementById(id);
      if(el){ restoreField(el, 'self', id); autosaveField(el, 'self', id); }
    });
    watchOutput('s5-out', 'self');
    showRestoreHint('#self', 's5-out', 'self');
    attachTools('#self', 's5-out', 'self', '5s-self-dx');
    attachCTA('#self', 'self');

    // ④ Gate
    const gateFields = ['gate-body','gate-source','gate-extcount'];
    gateFields.forEach(id=>{
      const el = document.getElementById(id);
      if(el){ restoreField(el, 'gate', id); autosaveField(el, 'gate', id); }
    });
    watchOutput('gate-out', 'gate');
    showRestoreHint('#gate', 'gate-out', 'gate');
    attachTools('#gate', 'gate-out', 'gate', 'ai-gate');
    attachCTA('#gate', 'gate');
    setupGateCounter();

    // ⑤ SBM
    const sbmFields = ['sbm-ref','sbm-place','sbm-length'];
    sbmFields.forEach(id=>{
      const el = document.getElementById(id);
      if(el){ restoreField(el, 'sbm', id); autosaveField(el, 'sbm', id); }
    });
    watchOutput('sbm-out', 'sbm');
    showRestoreHint('#sbm', 'sbm-out', 'sbm');
    attachTools('#sbm', 'sbm-out', 'sbm', 'sbm-9steps');
    attachCTA('#sbm', 'sbm');
    setupSBMSlider();

    // 가장 마지막에 ⑥ block6 모듈 호출 (별도 파일에서 setup)
    if(window.AS_BLOCK6 && typeof window.AS_BLOCK6.mount === 'function'){
      window.AS_BLOCK6.mount();
    }

    console.log('[AI Studio v2] 보조 모듈 부착 완료');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
