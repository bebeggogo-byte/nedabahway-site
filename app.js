/* ═══════════════════════════════════════════════
   네다바웨이 — App JS
   Vertical scroll SPA
   - Sticky header active nav sync
   - IDEN tier cards → contact jump
   - IDEN diagnostic quiz
   - SBM reviews (localStorage)
   - Contact email draft
   - Donate account copy
   ═══════════════════════════════════════════════ */

'use strict';

/* ── Utilities ─────────────────────────────── */
function $(id) { return document.getElementById(id); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'),
      { value: text, style: 'position:fixed;opacity:0' });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function flashBtn(btn, msg, duration = 900) {
  const orig = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = orig; }, duration);
}

/* ── Footer year ────────────────────────────── */
const fyEl = $('footerYear');
if (fyEl) fyEl.textContent = new Date().getFullYear();

/* ══════════════════════════════════════════════
   HEADER — Active nav on scroll
══════════════════════════════════════════════ */
const navLinks   = $$('.nav-link');
const sections   = $$('section[id]');
const headerEl   = $('siteHeader');
const headerH    = () => headerEl ? headerEl.offsetHeight : 60;

function getActiveSection() {
  const offset = headerH() + 24;
  let active = sections[0];
  for (const sec of sections) {
    if (sec.getBoundingClientRect().top <= offset) active = sec;
  }
  return active?.id || '';
}

function syncNav() {
  const id = getActiveSection();
  navLinks.forEach(a => {
    const href = a.getAttribute('href')?.replace('#', '');
    a.classList.toggle('active', href === id);
  });
}

window.addEventListener('scroll', syncNav, { passive: true });
syncNav();

/* ══════════════════════════════════════════════
   IDEN — Tier cards → jump to contact
══════════════════════════════════════════════ */
$$('.tier-item').forEach(card => {
  card.addEventListener('click', () => {
    const cat = card.dataset.tier || 'study';
    selectCategory(cat);
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ══════════════════════════════════════════════
   IDEN — Diagnostic Quiz
══════════════════════════════════════════════ */
const diagResult = $('diagResult');

const diagData = {
  study: {
    title: '12주 공부법 프로그램',
    desc:  '공부 방법을 모르는 건 아이 탓이 아닙니다. 12주 구조화된 공부법으로 습관과 루틴을 함께 만들어갑니다.',
    cat:   'study'
  },
  career: {
    title: '진로 탐색 · 자기 이해 코칭',
    desc:  '동기가 없으면 어떤 방법도 작동하지 않습니다. "나는 누구인가"에서 출발해 진로와 연결하는 코칭입니다.',
    cat:   'career'
  },
  essay: {
    title: '자소서 · 면접 컨설팅',
    desc:  '나만의 스토리를 찾고 면접관이 기억하는 언어로 표현합니다. 구체적인 산출물이 나오는 컨설팅입니다.',
    cat:   'essay'
  },
  leadership: {
    title: '리더십 역량 강화',
    desc:  '학생회, 팀 리더, 대회 준비까지. 소통·팀워크·실행력을 실제 현장에서 쓸 수 있도록 훈련합니다.',
    cat:   'leadership'
  }
};

$$('.diag-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.diag-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const d = diagData[btn.dataset.tier];
    if (!d || !diagResult) return;

    diagResult.hidden = false;
    diagResult.innerHTML = `
      <p class="diag-result-label">추천 프로그램</p>
      <p class="diag-result-title">${escHtml(d.title)}</p>
      <p class="diag-result-desc">${escHtml(d.desc)}</p>
      <div class="diag-result-actions">
        <button class="btn-primary" id="diagGoContact" type="button">문의하기</button>
        <button class="btn-text" id="diagClose" type="button">닫기</button>
      </div>`;

    $('diagGoContact').addEventListener('click', () => {
      selectCategory(d.cat);
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    });
    $('diagClose').addEventListener('click', () => {
      diagResult.hidden = true;
      $$('.diag-opt').forEach(b => b.classList.remove('active'));
    });
  });
});

/* ══════════════════════════════════════════════
   SBM — Reviews (localStorage)
══════════════════════════════════════════════ */
const REVIEW_KEY = 'ndw_reviews_v1';

function fmtDate(d) {
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}
function loadReviews() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY)) || []; }
  catch { return []; }
}
function saveReviews(list) {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(list));
}
function initReviews() {
  const list = loadReviews();
  if (!list.length) {
    saveReviews([
      { name: '익명', text: '말씀을 "해야 하는 일"이 아니라, 다시 하나님 앞에 서는 시간으로 느끼게 됐습니다.', date: fmtDate(new Date()) },
      { name: '익명', text: '막혔던 지점이 "적용"이 아니라 "만남"의 문제였다는 걸 보게 됐어요.', date: fmtDate(new Date()) }
    ]);
  }
}
function renderReviews() {
  const el = $('reviewList');
  if (!el) return;
  const list = loadReviews();
  if (!list.length) {
    el.innerHTML = '<div class="review-item"><p class="review-text">아직 후기가 없습니다.</p></div>';
    return;
  }
  el.innerHTML = list.slice().reverse().map(r => `
    <div class="review-item">
      <div class="review-top">
        <span class="review-name">${escHtml(r.name || '익명')}</span>
        <span class="review-date">${escHtml(r.date || '')}</span>
      </div>
      <p class="review-text">${escHtml(r.text || '')}</p>
    </div>`).join('');
}

const openReviewFormBtn = $('openReviewForm');
const reviewFormWrap    = $('reviewFormWrap');
const reviewNameEl      = $('reviewName');
const reviewTextEl      = $('reviewText');

openReviewFormBtn?.addEventListener('click', () => {
  reviewFormWrap.hidden = false;
  reviewNameEl?.focus();
});
$('cancelReview')?.addEventListener('click', () => {
  reviewFormWrap.hidden = true;
  if (reviewNameEl) reviewNameEl.value = '';
  if (reviewTextEl) reviewTextEl.value = '';
});
$('saveReview')?.addEventListener('click', () => {
  const text = reviewTextEl?.value.trim();
  if (!text) { alert('후기 내용을 입력해 주세요.'); return; }
  const list = loadReviews();
  list.push({ name: reviewNameEl?.value.trim() || '익명', text, date: fmtDate(new Date()) });
  saveReviews(list);
  reviewFormWrap.hidden = true;
  if (reviewNameEl) reviewNameEl.value = '';
  if (reviewTextEl) reviewTextEl.value = '';
  renderReviews();
});

initReviews();
renderReviews();

/* ══════════════════════════════════════════════
   DONATE — Copy account
══════════════════════════════════════════════ */
$('copyAccount')?.addEventListener('click', async () => {
  const acct = $('acctNumber')?.textContent.trim() || '';
  await copyToClipboard(acct);
  const toast = $('copyToast');
  if (toast) {
    toast.textContent = '복사됨 ✓';
    setTimeout(() => { toast.textContent = ''; }, 1400);
  }
});

/* ══════════════════════════════════════════════
   CONTACT — Email Draft System
══════════════════════════════════════════════ */
const EMAIL_TO = 'nedabah.way@gmail.com';

const templates = {
  /* IDEN */
  study: {
    subject: '[공부법 문의] 학습 습관 & 공부법 프로그램 신청',
    body: `안녕하세요. 네다바웨이 담당자님,

학습 습관·공부법 프로그램을 문의드립니다.
- 학생 학년:
- 현재 상황(간단히):
- 가장 힘든 부분(시작 못 함 / 집중 안 됨 / 방법 모름 등):
- 희망 시작 시기:

맞춤 안내 부탁드립니다.

감사합니다.
이름/연락처:`
  },
  career: {
    subject: '[진로 탐색 문의] 진로 & 자기 이해 코칭 신청',
    body: `안녕하세요. 네다바웨이 담당자님,

진로 탐색·자기 이해 코칭을 문의드립니다.
- 학생 학년:
- 현재 상황(관심사가 없음 / 여러 개라 모름 / 부모와 충돌 등):
- 진로 목표(있으면):
- 희망 진행 방식(온라인/오프라인):

감사합니다.
이름/연락처:`
  },
  essay: {
    subject: '[자소서·면접 문의] 컨설팅 신청',
    body: `안녕하세요. 네다바웨이 담당자님,

자소서·면접 컨설팅을 문의드립니다.
- 지원 목적(학교/전형/취업 등):
- 제출 마감 일정:
- 현재 작성 상태(초안 있음 / 주제 없음 / 첫 시작):
- 면접 포함 여부:

감사합니다.
이름/연락처:`
  },
  leadership: {
    subject: '[리더십 문의] 리더십 역량 강화 프로그램 신청',
    body: `안녕하세요. 네다바웨이 담당자님,

리더십 역량 강화 프로그램을 문의드립니다.
- 학생 학년/역할(학생회 / 동아리 / 팀 리더 등):
- 개발하고 싶은 역량(소통 / 팀워크 / 발표 / 실행력 등):
- 희망 기간:

감사합니다.
이름/연락처:`
  },
  ai: {
    subject: '[AI 워크숍 문의] 생성형 AI 활용 워크숍 요청',
    body: `안녕하세요. 네다바웨이 담당자님,

생성형 AI 활용 워크숍을 문의드립니다.
- 대상(개인/팀/기관):
- 목적(문서/기획/교육/업무 자동화 등):
- 희망 일정:

감사합니다.
이름/연락처:`
  },
  org: {
    subject: '[조직 소통 문의] 소통·협업 워크숍 요청',
    body: `안녕하세요. 네다바웨이 담당자님,

조직 소통·협업 워크숍을 문의드립니다.
- 조직/팀:
- 인원:
- 현재 이슈:
- 희망 일정:

감사합니다.
이름/연락처:`
  },
  /* SBM */
  sbm: {
    subject: '[SBM 참여 문의] 셀프성경묵상 훈련 신청',
    body: `안녕하세요. 네다바웨이 담당자님,

SBM 묵상 훈련 참여를 문의드립니다.
- 참여 대상(개인/공동체):
- 희망 일정:
- 현재 말씀 묵상 상황:
- 특히 어려운 지점:

감사합니다.
이름/연락처:`
  },
  church: {
    subject: '[교회 세미나 문의] 말씀 읽기/나눔 세미나 요청',
    body: `안녕하세요. 네다바웨이 담당자님,

교회 세미나 진행을 문의드립니다.
- 교회/부서:
- 참석 인원:
- 희망 주제:
- 희망 일정:

감사합니다.
이름/연락처:`
  },
  leaders: {
    subject: '[리더/팀 훈련 문의] 공동체 훈련 설계',
    body: `안녕하세요. 네다바웨이 담당자님,

리더/팀 훈련을 문의드립니다.
- 대상:
- 현재 어려움:
- 다루고 싶은 주제:
- 희망 일정:

감사합니다.
이름/연락처:`
  },
  etc: {
    subject: '[문의] 상담/협력 관련 문의드립니다',
    body: `안녕하세요. 네다바웨이 담당자님,

문의드립니다.
- 상황/요청:
- 희망 일정:

감사합니다.
이름/연락처:`
  }
};

const draftSubjectEl = $('draftSubject');
const draftBodyEl    = $('draftBody');
const openMailAppEl  = $('openMailApp');
const catBtns        = $$('.cat-btn');

function selectCategory(cat) {
  catBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  const t = templates[cat] || templates.study;
  if (draftSubjectEl) draftSubjectEl.textContent = t.subject;
  if (draftBodyEl)    draftBodyEl.textContent    = t.body;
  if (openMailAppEl)  openMailAppEl.href =
    `mailto:${EMAIL_TO}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`;
}

catBtns.forEach(btn => {
  btn.addEventListener('click', () => selectCategory(btn.dataset.cat));
});

$('copySubject')?.addEventListener('click', async () => {
  await copyToClipboard(draftSubjectEl?.textContent.trim() || '');
  flashBtn($('copySubject'), '복사됨');
});
$('copyBody')?.addEventListener('click', async () => {
  await copyToClipboard(draftBodyEl?.textContent.trim() || '');
  flashBtn($('copyBody'), '복사됨');
});

/* Initialize */
selectCategory('study');
