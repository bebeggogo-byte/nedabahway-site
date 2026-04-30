/* AI 작업실 블럭 ⑥ — IDEN × 5S 통합 7문항 진단
 *
 * 자리: ai.html 페이지 끝, 5번째 SBM 블럭 다음에 자동 마운트.
 * 사용처: <script src="/assets/ai-studio/block6.js" defer></script>
 *         (v2.js가 init() 끝에서 AS_BLOCK6.mount()를 호출함)
 *
 * 7문항: IDEN 좌표(이타성·결핍 향함) + 5S 사이클 균형
 *   Q1 한 사람 떠올림 (이타 좌표의 입구)
 *   Q2 그 사람의 결핍 인지 정도 (See 깊이)
 *   Q3 자기 강점 한 줄 정리 (Speak 정확도)
 *   Q4 그 사람과 5분 듣는 자리 (Sense 빈도)
 *   Q5 다음 결정 1건을 글로 적는 자리 (Steer 키)
 *   Q6 분기 회고 자리 (Sustain 이음)
 *   Q7 직업 = 누군가의 결핍을 향한 자기 숙련 — 동의 (IDEN 정렬)
 *
 * 결과: 평균 점수 + IDEN 좌표 한 줄(축약형) + 5S 약축 + 다음 1주 한 동작
 */

(function(){
  'use strict';

  const QUESTIONS = [
    {id:'q1', axis:'IDEN', label:'IDEN-1',
     q:'요즘 자주 떠오르는 한 사람이 있다.',
     opts:['전혀','드물게','가끔','자주','매일']},
    {id:'q2', axis:'See', label:'5S-See',
     q:'그 사람이 매일 부족해하는 한 가지를 안다.',
     opts:['모른다','어렴풋','대략','구체적','이름까지']},
    {id:'q3', axis:'Speak', label:'5S-Speak',
     q:'내 강점 1개를 한 줄로 말할 수 있다.',
     opts:['못한다','막연히','두 줄','한 줄','즉답']},
    {id:'q4', axis:'Sense', label:'5S-Sense',
     q:'한 사람과 듣기만 하는 자리를 매주 만든다.',
     opts:['안 한다','월1회','격주','주1회','주3회+']},
    {id:'q5', axis:'Steer', label:'5S-Steer',
     q:'다음 결정 1건을 글로 적어 점검 날짜를 둔다.',
     opts:['안 한다','즉흥','월1회','주1회','매 결정']},
    {id:'q6', axis:'Sustain', label:'5S-Sustain',
     q:'분기 마지막에 지난 분기를 다시 읽는 자리가 있다.',
     opts:['없다','연1회','반기','분기','매월']},
    {id:'q7', axis:'IDEN', label:'IDEN-2',
     q:'직업이란 누군가의 결핍을 향한 자기 숙련이다 — 동의한다.',
     opts:['아니다','글쎄','중립','동의','강한 동의']}
  ];

  function buildSection(){
    const sec = document.createElement('section');
    sec.id = 'block6';
    sec.className = 'block as-block6 b-iden';
    sec.innerHTML = `
      <div class="block__head">
        <div class="block__icon">⑥</div>
        <div class="block__title-wrap">
          <div class="block__kicker">Integrated · IDEN × 5S 통합 진단</div>
          <h2 class="block__title">직업의 이타성과 5S 사이클을 한 번에 점검합니다</h2>
          <p class="block__sub">7문항. 모두 1~5점. 평균과 가장 약한 축, 다음 1주 한 동작을 동시에 도출합니다. IDEN 좌표가 5S 위에서 어떻게 굴러가는지 보여주는 작업실 입구.</p>
        </div>
      </div>
      <div class="widget" id="block6Widget">
        <div id="block6Form"></div>
        <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" id="block6Run">7문항 종합 진단 →</button>
          <button class="btn btn--ghost btn--sm" id="block6Clear">초기화</button>
        </div>
        <div class="as-result" id="block6Result"></div>
      </div>
    `;
    return sec;
  }

  function renderQuestions(form){
    form.innerHTML = QUESTIONS.map((Q, i)=>`
      <div class="as-q" data-qid="${Q.id}">
        <div class="as-q__title"><b>${i+1}</b> <span>${Q.q} <em style="color:#6b7280;font-style:normal;font-weight:500">(${Q.label})</em></span></div>
        <div class="as-q__opts">
          ${Q.opts.map((label, j)=>`
            <label>
              <input type="radio" name="${Q.id}" value="${j+1}">
              <strong>${j+1}</strong>
              <span>${label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function getAnswers(){
    const ans = {};
    QUESTIONS.forEach(Q=>{
      const checked = document.querySelector(`input[name="${Q.id}"]:checked`);
      ans[Q.id] = checked ? parseInt(checked.value) : 0;
    });
    return ans;
  }

  function setAnswers(ans){
    Object.entries(ans).forEach(([qid, v])=>{
      if(!v) return;
      const el = document.querySelector(`input[name="${qid}"][value="${v}"]`);
      if(el) el.checked = true;
    });
  }

  function diagnose(ans){
    // 미응답 0점은 평균에서 제외해 정직 처리
    const filled = QUESTIONS.filter(Q => ans[Q.id] > 0);
    if(filled.length < QUESTIONS.length){
      return {ok:false, missing: QUESTIONS.length - filled.length};
    }
    const sum = filled.reduce((s, Q)=> s + ans[Q.id], 0);
    const avg = sum / filled.length;

    // 5S 축 점수 (q2~q6)
    const axes = {
      See:      ans.q2,
      Speak:    ans.q3,
      Sense:    ans.q4,
      Steer:    ans.q5,
      Sustain:  ans.q6
    };
    let weakAxis = 'See'; let weakScore = 99;
    Object.entries(axes).forEach(([k,v])=>{ if(v < weakScore){ weakAxis=k; weakScore=v; } });

    // IDEN 정렬 (q1+q7) / 2
    const idenAlign = (ans.q1 + ans.q7) / 2;

    return {ok:true, avg, axes, weakAxis, weakScore, idenAlign};
  }

  const ACTION_BY_AXIS = {
    See:      '일요일 5분, 그 사람이 가장 무거웠던 자리를 한 줄로 적기.',
    Speak:    '월요일 시작 5분, 이번 주 자기 강점 한 줄을 책상 위에 두기.',
    Sense:    '매일 한 사람과 5분, 답을 미리 준비하지 않고 듣기.',
    Steer:    '주 1회, 결정 1건만 "근거·대안·다음 점검일" 세 줄로 적기.',
    Sustain:  '이번 주 일요일, 지난 분기 노트 1쪽 다시 읽고 다음 분기 첫 줄 적기.'
  };

  function quoteFromAxis(axis, idenAlign){
    const n = idenAlign >= 4 ? '한 사람의 결핍을 향한 자기 숙련' :
              idenAlign >= 3 ? '한 사람을 가까이서 보는 일' :
              idenAlign >= 2 ? '나의 일이 누구를 향하는지 묻는 일' :
                               '\"무엇\"이 아니라 \"누구\"부터 다시 묻는 일';
    return `\"내 일은 ${n}이다.\"`;
  }

  function renderResult(d){
    const box = document.getElementById('block6Result');
    if(!d.ok){
      box.classList.add('show');
      box.innerHTML = `<h3>⚠️ ${d.missing}문항이 비어 있습니다</h3>
        <p>모든 문항에 답해야 결과가 나옵니다. 정직 처리 원칙입니다.</p>`;
      return;
    }
    const av = d.avg.toFixed(1);
    const grade = d.avg >= 4 ? '균형 작동 자리' :
                  d.avg >= 3 ? '평균 자리 — 약축 보강 필요' :
                  d.avg >= 2 ? '사이클 흔들림 — 1축 누적 권장' :
                               '사이클 재설계 자리';
    box.classList.add('show');
    box.innerHTML = `
      <h3>▣ 통합 진단 — 평균 ${av}/5 · ${grade}</h3>
      <div class="as-result__quote">${quoteFromAxis(d.weakAxis, d.idenAlign)}</div>
      <div class="as-result__bars">
        <div class="as-result__bar"><b>가장 약한 축</b>${d.weakAxis} (${d.weakScore}/5)</div>
        <div class="as-result__bar"><b>IDEN 정렬</b>${d.idenAlign.toFixed(1)}/5</div>
      </div>
      <p style="margin-top:14px"><strong>다음 1주 한 동작 →</strong> ${ACTION_BY_AXIS[d.weakAxis]}</p>
      <p style="margin-top:8px;font-size:12px;color:#6b7280">
        See ${d.axes.See} · Speak ${d.axes.Speak} · Sense ${d.axes.Sense} · Steer ${d.axes.Steer} · Sustain ${d.axes.Sustain}
      </p>
    `;
  }

  function autoSaveAnswers(){
    const ans = getAnswers();
    const KEY = 'nedabah:ai-studio:v2';
    let store = {};
    try{ store = JSON.parse(localStorage.getItem(KEY) || '{}'); }catch(e){}
    store.block6 = Object.assign({}, store.block6 || {}, {answers: ans, ts: Date.now()});
    try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){}
  }

  function loadAnswers(){
    try{
      const store = JSON.parse(localStorage.getItem('nedabah:ai-studio:v2') || '{}');
      if(store.block6 && store.block6.answers) setAnswers(store.block6.answers);
    }catch(e){}
  }

  function mount(){
    if(document.getElementById('block6')) return; // 중복 마운트 차단
    const last = document.querySelector('section#sbm');
    const anchor = last ? last.parentElement : document.body;
    const sec = buildSection();
    if(last && last.nextSibling){
      last.parentElement.insertBefore(sec, last.nextSibling);
    } else if(last){
      last.parentElement.appendChild(sec);
    } else {
      document.body.appendChild(sec);
    }

    const form = document.getElementById('block6Form');
    renderQuestions(form);
    loadAnswers();

    document.getElementById('block6Run').addEventListener('click', ()=>{
      const ans = getAnswers();
      autoSaveAnswers();
      renderResult(diagnose(ans));
    });
    document.getElementById('block6Clear').addEventListener('click', ()=>{
      document.querySelectorAll('#block6Form input[type="radio"]').forEach(i=>i.checked=false);
      const box = document.getElementById('block6Result');
      box.classList.remove('show'); box.innerHTML='';
      autoSaveAnswers();
    });
    form.addEventListener('change', autoSaveAnswers);

    // 보조 CTA 자리 추가
    const widget = document.getElementById('block6Widget');
    const cta = document.createElement('div');
    cta.className = 'as-cta-row';
    cta.innerHTML = `
      <strong>다음 자리</strong>
      <a href="/contact.html">통합 진단 후 1on1 코칭 의뢰 →</a>
      <a class="alt" href="/iden-onepager.html">IDEN 1pager</a>
    `;
    widget.appendChild(cta);

    const strip = document.createElement('div');
    strip.className = 'as-link-strip';
    strip.innerHTML = `<span>관련 자료:</span>
      <a href="/resources/diagnostics/">진단 자료실</a>
      <a href="/resources/evidence/2026-04-29_5s-framework-academic-mapping.html">5S 학문 매핑표</a>
      <a href="/iden.html">IDEN 본문</a>`;
    widget.appendChild(strip);
  }

  window.AS_BLOCK6 = {mount};
})();
