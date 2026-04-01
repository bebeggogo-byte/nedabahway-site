'use strict';
/* ═══════════════════════════════════════════════
   네다바웨이 App JS v3
   - Active nav sync on scroll
   - Education stage quiz
   - Contact form → localStorage + Formspree
   - Account copy
   ═══════════════════════════════════════════════ */

/* ── Config ────────────────────────────────────
   Formspree: 가입 후 https://formspree.io 에서
   Form ID를 받아서 아래 값을 교체하세요.
   비워두면 localStorage에만 저장됩니다.
─────────────────────────────────────────────── */
const FORMSPREE_ID = '';   // 예: 'xpznkbqw'
const INQUIRY_KEY  = 'ndw_inquiries_v1';

/* ── Helpers ──────────────────────────────────── */
const $  = id  => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return; } catch {}
  const ta = Object.assign(document.createElement('textarea'),
    { value: t, style: 'position:fixed;opacity:0' });
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

function fmtDate(d) {
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ── Footer year ──────────────────────────────── */
const fyEl = $('footerYear');
if (fyEl) fyEl.textContent = new Date().getFullYear();

/* ══════════════════════════════════════════════
   Active nav on scroll
══════════════════════════════════════════════ */
const navLinks  = $$('.gnav-link');
const sections  = $$('main section[id]');
const headerEl  = $('siteHeader');

function syncNav() {
  const top = (headerEl?.offsetHeight || 62) + 20;
  let active = sections[0];
  sections.forEach(s => {
    if (s.getBoundingClientRect().top <= top) active = s;
  });
  navLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + active?.id);
  });
}

window.addEventListener('scroll', syncNav, { passive: true });
syncNav();

/* ══════════════════════════════════════════════
   Education Stage Quiz
══════════════════════════════════════════════ */
const stageData = {
  '01': {
    title: '01단계 — 나를 발견하다',
    desc: '공부 방법보다 먼저, 자신이 어떤 사람인지 아는 것이 필요합니다. 강점 발견 워크숍과 학습유형 진단으로 시작해보세요.'
  },
  '02': {
    title: '02단계 — 배우는 법을 배우다',
    desc: '의지와 방법은 다릅니다. 12주 공부법 프로그램으로 자신만의 학습 루틴을 만들어드립니다.'
  },
  '03': {
    title: '03단계 — 방향을 찾다',
    desc: '동기는 방향에서 나옵니다. 진로탐색 코칭으로 공부의 이유를 함께 찾아봅시다.'
  },
  '04': {
    title: '04단계 — 나를 표현하다',
    desc: '좋은 자소서는 기술이 아닌 나만의 이야기에서 나옵니다. 자소서·면접 컨설팅으로 스토리를 만들어드립니다.'
  },
  '05': {
    title: '05단계 — 디지털 세계를 탐색하다',
    desc: '생성형 AI 실습부터 지역사회 AI 교육까지. 현장에서 바로 쓸 수 있는 AI 활용법을 알려드립니다.'
  },
  '06': {
    title: '06단계 — 함께 성장하다',
    desc: '협업과 소통은 기술이 아닌 마음의 문제입니다. 팀 프로젝트 코칭과 조직 소통 워크숍으로 함께 성장해봅시다.'
  }
};

const quizResult = $('eduQuizResult');

$$('.quiz-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.quiz-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const d = stageData[btn.dataset.stage];
    if (!d || !quizResult) return;
    quizResult.hidden = false;
    quizResult.innerHTML = `
      <p class="quiz-result-label">추천 단계</p>
      <p class="quiz-result-stage">${esc(d.title)}</p>
      <p class="quiz-result-desc">${esc(d.desc)}</p>
      <div class="quiz-result-actions">
        <a class="btn-primary" href="#contact">문의하기</a>
        <button class="btn-outline" id="quizClose" type="button" style="font-size:13px;padding:10px 18px">닫기</button>
      </div>`;
    $('quizClose')?.addEventListener('click', () => {
      quizResult.hidden = true;
      $$('.quiz-opt').forEach(b => b.classList.remove('active'));
    });
  });
});

/* ══════════════════════════════════════════════
   Contact Form — Type selection
══════════════════════════════════════════════ */
const typeInput = $('cf-type');
$$('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (typeInput) typeInput.value = btn.dataset.type;
  });
});

/* ══════════════════════════════════════════════
   Contact Form — Submission
══════════════════════════════════════════════ */
function saveInquiry(data) {
  try {
    const list = JSON.parse(localStorage.getItem(INQUIRY_KEY) || '[]');
    list.unshift({ ...data, id: Date.now(), date: fmtDate(new Date()), read: false });
    localStorage.setItem(INQUIRY_KEY, JSON.stringify(list));
  } catch {}
}

async function submitToFormspree(data) {
  if (!FORMSPREE_ID) return { ok: false, skipped: true };
  try {
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

const contactForm   = $('contactForm');
const formFeedback  = $('formFeedback');
const cfSubmitBtn   = $('cfSubmitBtn');

contactForm?.addEventListener('submit', async e => {
  e.preventDefault();

  const name    = $('cf-name')?.value.trim();
  const contact = $('cf-contact')?.value.trim();
  const type    = $('cf-type')?.value.trim();
  const message = $('cf-message')?.value.trim();

  // Validate
  if (!name)    { showFeedback('이름을 입력해 주세요.', 'error'); return; }
  if (!contact) { showFeedback('연락처를 입력해 주세요.', 'error'); return; }
  if (!type)    { showFeedback('문의 유형을 선택해 주세요.', 'error'); return; }
  if (!message) { showFeedback('문의 내용을 입력해 주세요.', 'error'); return; }

  cfSubmitBtn.disabled = true;
  cfSubmitBtn.textContent = '전송 중...';

  const data = { name, contact, type, message };

  // Save locally first (always)
  saveInquiry(data);

  // Try Formspree
  const res = await submitToFormspree(data);

  cfSubmitBtn.disabled = false;
  cfSubmitBtn.textContent = '문의 남기기';

  if (res.skipped || res.ok) {
    showFeedback('문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다 🙏', 'success');
    contactForm.reset();
    $$('.type-btn').forEach(b => b.classList.remove('active'));
    if (typeInput) typeInput.value = '';
  } else {
    // Formspree failed but locally saved
    showFeedback('문의가 기록되었습니다. 네트워크 오류가 있었지만 내용은 안전하게 저장되었습니다.', 'success');
    contactForm.reset();
    $$('.type-btn').forEach(b => b.classList.remove('active'));
    if (typeInput) typeInput.value = '';
  }
});

function showFeedback(msg, type) {
  if (!formFeedback) return;
  formFeedback.hidden = false;
  formFeedback.className = `form-feedback ${type}`;
  formFeedback.textContent = msg;
  if (type === 'success') {
    setTimeout(() => { formFeedback.hidden = true; }, 6000);
  }
}

/* ══════════════════════════════════════════════
   Donate — Copy account
══════════════════════════════════════════════ */
$('copyAccount')?.addEventListener('click', async () => {
  const acct = $('acctNumber')?.textContent.trim() || '';
  await copyText(acct);
  const toast = $('copyToast');
  if (toast) {
    toast.textContent = '복사됨 ✓';
    setTimeout(() => { toast.textContent = ''; }, 1500);
  }
});
