/* =========================================================
   NedabahWay - App JS
   - Horizontal swipe slides (scroll-snap)
   - Fixed header arrow (next slide)
   - Bottom tab navigation + active state
   - SBM Reviews: add + store in localStorage (accumulating)
   - Contact: 6 categories -> auto subject/body, copy, open mail app
   - Programs: click -> preselect contact template and jump to contact
   - Added: donate CTA behavior, account copy, modal, mailto templates
========================================================= */

const stage = document.getElementById("stage");
const slides = Array.from(document.querySelectorAll(".slide"));
const tabs = Array.from(document.querySelectorAll(".tab"));
const nextArrow = document.getElementById("nextArrow");

/* ---------- Helpers ---------- */
function getSlideIndexInView() {
  const left = stage.scrollLeft;
  const width = stage.clientWidth;
  const idx = Math.round(left / width);
  return Math.max(0, Math.min(slides.length - 1, idx));
}

function scrollToSlide(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", inline: "start" });
}

function setActiveTab(targetId) {
  tabs.forEach((t) => {
    const isActive = t.dataset.target === targetId;
    t.classList.toggle("active", isActive);
  });
}

/* ---------- Arrow (Next) ---------- */
nextArrow?.addEventListener("click", () => {
  const idx = getSlideIndexInView();
  const nextIdx = Math.min(slides.length - 1, idx + 1);
  const nextId = slides[nextIdx].id;
  scrollToSlide(nextId);
});

/* ---------- Tabs click ---------- */
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;
    scrollToSlide(target);
  });
});

/* ---------- Sync active tab while swiping ---------- */
let rafLock = false;
stage?.addEventListener("scroll", () => {
  if (rafLock) return;
  rafLock = true;
  requestAnimationFrame(() => {
    const idx = getSlideIndexInView();
    setActiveTab(slides[idx].id);
    rafLock = false;
  });
});

/* =========================================================
   SBM Reviews (localStorage)
========================================================= */
const reviewList = document.getElementById("reviewList");
const openReviewForm = document.getElementById("openReviewForm");
const reviewFormWrap = document.getElementById("reviewFormWrap");
const saveReviewBtn = document.getElementById("saveReview");
const cancelReviewBtn = document.getElementById("cancelReview");
const reviewName = document.getElementById("reviewName");
const reviewText = document.getElementById("reviewText");

const REVIEW_KEY = "ndw_reviews_v1";

function formatDate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

function loadReviews() {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveReviews(list) {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(list));
}

function renderReviews() {
  const items = loadReviews();
  reviewList.innerHTML = "";
  items.reverse().forEach((r) => {
    const div = document.createElement("div");
    div.className = "reviewItem";
    div.innerHTML = `
      <div class="reviewTop">
        <div class="reviewName">${escapeHtml(r.name || '익명')}</div>
        <div class="reviewDate">${escapeHtml(r.date)}</div>
      </div>
      <div class="reviewText">${escapeHtml(r.text)}</div>
    `;
    reviewList.appendChild(div);
  });
}

function escapeHtml(s=""){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

ensureSeedReviews();
renderReviews();

openReviewForm?.addEventListener('click', () => {
  reviewFormWrap.hidden = false;
});
cancelReviewBtn?.addEventListener('click', () => {
  reviewFormWrap.hidden = true;
});
saveReviewBtn?.addEventListener('click', () => {
  const name = reviewName.value.trim() || '익명';
  const text = reviewText.value.trim();
  if (!text) return alert('후기를 입력해주세요');
  const items = loadReviews();
  items.push({ name, text, date: formatDate(new Date()) });
  saveReviews(items);
  reviewName.value = '';
  reviewText.value = '';
  reviewFormWrap.hidden = true;
  renderReviews();
});

/* =========================================================
   Donate / Account interactions
========================================================= */
const copyAccountBtn = document.getElementById('copyAccount');
const copyToast = document.getElementById('copyToast');
const acctNumberEl = document.getElementById('acctNumber');
const donateBtnTop = document.getElementById('donateBtn');
const acctModal = document.getElementById('acctModal');
const accountHelpBtn = document.getElementById('accountHelp');
const closeAcctModal = document.getElementById('closeAcctModal');

async function showToast(message, timeout=2000){
  if(!copyToast) return;
  copyToast.textContent = message;
  copyToast.classList.add('visible');
  setTimeout(()=> copyToast.classList.remove('visible'), timeout);
}

copyAccountBtn?.addEventListener('click', async () => {
  const acct = acctNumberEl?.textContent?.trim();
  if(!acct) return showToast('계좌정보 없음');
  try {
    await navigator.clipboard.writeText(acct);
    showToast('계좌번호가 복사되었습니다');
  } catch(e){
    showToast('복사 실패 — 수동으로 복사하세요');
  }
});

accountHelpBtn?.addEventListener('click', ()=>{
  if(!acctModal) return;
  acctModal.setAttribute('aria-hidden','false');
  acctModal.classList.add('open');
});
closeAcctModal?.addEventListener('click', ()=>{
  if(!acctModal) return;
  acctModal.setAttribute('aria-hidden','true');
  acctModal.classList.remove('open');
});

donateBtnTop?.addEventListener('click', ()=>{
  scrollToSlide('donate');
});

/* =========================================================
   Contact / Mail draft interactions
   - category buttons set subject/body template
   - copy subject/body
   - open mail app with prefilled subject/body
========================================================= */
const categoryGrid = document.getElementById('categoryGrid');
const draftSubject = document.getElementById('draftSubject');
const draftBody = document.getElementById('draftBody');
const copySubjectBtn = document.getElementById('copySubject');
const copyBodyBtn = document.getElementById('copyBody');
const openMailApp = document.getElementById('openMailApp');

const templates = {
  sbm: {
    subject: 'SBM 참여 신청',
    body: '안녕하세요.%0D%0A%0D%0A이름(선택):%0D%0A참여 희망 프로그램: SBM 묵상 훈련%0D%0A원하시는 일정/문의:%0D%0A%0D%0A감사합니다.'
  },
  church: {
    subject: '교회 세미나 요청',
    body: '안녕하세요.%0D%0A%0D%0A교회명:%0D%0A희망 내용/일정:%0D%0A연락처:%0D%0A%0D%0A감사합니다.'
  },
  leaders: {
    subject: '리더/팀 훈련 문의',
    body: '안녕하세요.%0D%0A%0D%0A소속/역할:%0D%0A희망 교육 내용:%0D%0A희망 일정:%0D%0A%0D%0A감사합니다.'
  },
  ai: {
    subject: 'AI 워크숍 문의',
    body: '안녕하세요.%0D%0A%0D%0A희망하는 AI 활용 주제:%0D%0A대상(예: 리더/교사):%0D%0A희망 일정:%0D%0A%0D%0A감사합니다.'
  },
  org: {
    subject: '조직 소통·협업 워크숍 문의',
    body: '안녕하세요.%0D%0A%0D%0A회사/조직명:%0D%0A희망 내용/목표:%0D%0A희망 일정:%0D%0A%0D%0A감사합니다.'
  },
  etc: {
    subject: '기타 문의',
    body: '안녕하세요.%0D%0A%0D%0A문의 내용:%0D%0A연락처(선택):%0D%0A%0D%0A감사합니다.'
  }
};

categoryGrid?.querySelectorAll('button')?.forEach(btn => {
  btn.addEventListener('click', ()=>{
    const cat = btn.dataset.cat;
    const tpl = templates[cat] || templates.etc;
    // fill visible draft (decoded for display)
    draftSubject.textContent = decodeURIComponent(tpl.subject);
    draftBody.textContent = decodeURIComponent(tpl.body);
    // set mailto on openMailApp with prefilled subject/body
    openMailApp.href = `mailto:nedabah.way@gmail.com?subject=${tpl.subject}&body=${tpl.body}`;
    // mark active
    categoryGrid.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    // jump to contact
    scrollToSlide('contact');
  });
});

copySubjectBtn?.addEventListener('click', async ()=>{
  const text = draftSubject.textContent || '';
  try{ await navigator.clipboard.writeText(text); showToast('제목이 복사되었습니다'); }catch(e){ showToast('복사 실패'); }
});
copyBodyBtn?.addEventListener('click', async ()=>{
  const text = draftBody.textContent || '';
  try{ await navigator.clipboard.writeText(text); showToast('본문이 복사되었습니다'); }catch(e){ showToast('복사 실패'); }
});

/* =========================================================
   Programs -> preselect contact template
========================================================= */
const programCards = document.querySelectorAll('.programCard');
programCards.forEach(card => {
  card.addEventListener('click', ()=>{
    const tplKey = card.dataset.template || 'etc';
    const btn = categoryGrid.querySelector(`button[data-cat="${tplKey}"]`);
    if(btn) btn.click();
    scrollToSlide('contact');
  });
});

/* =========================================================
   Small accessibility helpers
========================================================= */
// Allow keyboard navigation of tabs
tabs.forEach((t, i)=>{
  t.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft'){ const prev = tabs[(i-1+tabs.length)%tabs.length]; prev?.focus(); prev?.click(); }
    if(e.key === 'ArrowRight'){ const next = tabs[(i+1)%tabs.length]; next?.focus(); next?.click(); }
  });
});

// Ensure at least default template is set
if(!draftSubject.textContent) { const defaultTpl = templates.sbm; draftSubject.textContent = decodeURIComponent(defaultTpl.subject); draftBody.textContent = decodeURIComponent(defaultTpl.body); openMailApp.href = `mailto:nedabah.way@gmail.com?subject=${defaultTpl.subject}&body=${defaultTpl.body}`; }