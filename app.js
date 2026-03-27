/* =========================================================
   NedabahWay × IDEN — App JS
   - Horizontal swipe slides (scroll-snap)
   - Bottom tab navigation + active state
   - IDEN Tier cards -> jump to contact with template
   - IDEN Diagnostic quiz -> result card
   - SBM Reviews: localStorage
   - Contact: category -> auto email draft
   - Donate: copy account
========================================================= */

const stage    = document.getElementById("stage");
const slides   = Array.from(document.querySelectorAll(".slide"));
const tabs     = Array.from(document.querySelectorAll(".tab"));
const nextArrow = document.getElementById("nextArrow");

/* ---------- Helpers ---------- */
function getSlideIndexInView() {
  const left  = stage.scrollLeft;
  const width = stage.clientWidth;
  return Math.max(0, Math.min(slides.length - 1, Math.round(left / width)));
}

function scrollToSlide(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", inline: "start" });
}

function setActiveTab(targetId) {
  tabs.forEach(t => t.classList.toggle("active", t.dataset.target === targetId));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Arrow (Next) ---------- */
nextArrow.addEventListener("click", () => {
  const nextIdx = Math.min(slides.length - 1, getSlideIndexInView() + 1);
  scrollToSlide(slides[nextIdx].id);
});

/* ---------- Tabs ---------- */
tabs.forEach(tab => {
  tab.addEventListener("click", () => scrollToSlide(tab.dataset.target));
});

/* ---------- Sync active tab on scroll ---------- */
let rafLock = false;
stage.addEventListener("scroll", () => {
  if (rafLock) return;
  rafLock = true;
  requestAnimationFrame(() => {
    setActiveTab(slides[getSlideIndexInView()].id);
    rafLock = false;
  });
});

/* ---------- Home: "진단 →" button ---------- */
const goIdenBtn = document.getElementById("goIden");
if (goIdenBtn) {
  goIdenBtn.addEventListener("click", () => scrollToSlide("iden"));
}

/* =========================================================
   IDEN — Tier Cards (click → pre-select contact & jump)
========================================================= */
document.querySelectorAll(".tierCard").forEach(card => {
  card.addEventListener("click", () => {
    const cat = card.dataset.tier || "study";
    selectCategory(cat);
    scrollToSlide("contact");
  });
});

/* =========================================================
   IDEN — Diagnostic Quiz
========================================================= */
const diagResult = document.getElementById("diagResult");

const diagData = {
  study: {
    title: "학습 습관 & 공부법 프로그램",
    desc: "공부 방법을 모르는 건 아이 탓이 아닙니다. 12주 구조화된 공부법으로 습관과 루틴을 함께 만들어갑니다.",
    cat: "study"
  },
  career: {
    title: "진로 탐색 & 자기 이해 코칭",
    desc: "동기가 없으면 어떤 방법도 작동하지 않습니다. '나는 누구인가'에서 출발해 진로와 연결하는 코칭입니다.",
    cat: "career"
  },
  essay: {
    title: "자소서 & 면접 컨설팅",
    desc: "나만의 스토리를 찾고, 면접관이 기억하는 언어로 표현합니다. 구체적인 산출물이 나오는 컨설팅입니다.",
    cat: "essay"
  },
  leadership: {
    title: "리더십 역량 강화",
    desc: "학생회, 팀 리더, 대회 준비까지. 소통·팀워크·실행력을 실제 현장에서 쓸 수 있도록 훈련합니다.",
    cat: "leadership"
  }
};

document.querySelectorAll(".diagBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".diagBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tier = btn.dataset.tier;
    const d = diagData[tier];
    if (!d || !diagResult) return;

    diagResult.hidden = false;
    diagResult.innerHTML = `
      <div class="diagResultLabel">추천 프로그램</div>
      <div class="diagResultTitle">${escapeHtml(d.title)}</div>
      <div class="diagResultDesc">${escapeHtml(d.desc)}</div>
      <div class="diagResultActions">
        <button class="btnPrimary" id="diagGoContact" type="button">문의하기</button>
        <button class="btnGhost" id="diagClose" type="button">닫기</button>
      </div>
    `;

    document.getElementById("diagGoContact").addEventListener("click", () => {
      selectCategory(d.cat);
      scrollToSlide("contact");
    });

    document.getElementById("diagClose").addEventListener("click", () => {
      diagResult.hidden = true;
      document.querySelectorAll(".diagBtn").forEach(b => b.classList.remove("active"));
    });
  });
});

/* =========================================================
   SBM Reviews (localStorage)
========================================================= */
const reviewList      = document.getElementById("reviewList");
const openReviewForm  = document.getElementById("openReviewForm");
const reviewFormWrap  = document.getElementById("reviewFormWrap");
const saveReviewBtn   = document.getElementById("saveReview");
const cancelReviewBtn = document.getElementById("cancelReview");
const reviewNameEl    = document.getElementById("reviewName");
const reviewTextEl    = document.getElementById("reviewText");

const REVIEW_KEY = "ndw_reviews_v1";

function formatDate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

function loadReviews() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY)) || null; }
  catch { return null; }
}

function saveReviewsData(list) {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(list));
}

function ensureSeedReviews() {
  if (loadReviews()?.length) return;
  saveReviewsData([
    { name: "익명", text: "말씀을 '해야 하는 일'이 아니라, 다시 하나님 앞에 서는 시간으로 느끼게 됐습니다.", date: formatDate(new Date()) },
    { name: "익명", text: "막혔던 지점이 '적용'이 아니라 '만남'의 문제였다는 걸 보게 됐어요.", date: formatDate(new Date()) }
  ]);
}

function renderReviews() {
  const list = loadReviews() || [];
  reviewList.innerHTML = "";
  if (!list.length) {
    reviewList.innerHTML = `<div class="reviewItem"><div class="reviewText">아직 후기가 없습니다.</div></div>`;
    return;
  }
  list.slice().reverse().forEach(r => {
    const item = document.createElement("div");
    item.className = "reviewItem";
    item.innerHTML = `
      <div class="reviewTop">
        <div class="reviewName">${escapeHtml(r.name || "익명")}</div>
        <div class="reviewDate">${escapeHtml(r.date || "")}</div>
      </div>
      <div class="reviewText">${escapeHtml(r.text || "")}</div>
    `;
    reviewList.appendChild(item);
  });
}

openReviewForm.addEventListener("click", () => {
  reviewFormWrap.hidden = false;
  reviewNameEl.focus();
});

cancelReviewBtn.addEventListener("click", () => {
  reviewFormWrap.hidden = true;
  reviewNameEl.value = "";
  reviewTextEl.value = "";
});

saveReviewBtn.addEventListener("click", () => {
  const name = (reviewNameEl.value || "").trim();
  const text = (reviewTextEl.value || "").trim();
  if (!text) { alert("후기 내용을 입력해 주세요."); return; }
  const list = loadReviews() || [];
  list.push({ name: name || "익명", text, date: formatDate(new Date()) });
  saveReviewsData(list);
  reviewFormWrap.hidden = true;
  reviewNameEl.value = "";
  reviewTextEl.value = "";
  renderReviews();
});

ensureSeedReviews();
renderReviews();

/* =========================================================
   Donate — Copy account
========================================================= */
const acctNumberEl   = document.getElementById("acctNumber");
const copyAccountBtn = document.getElementById("copyAccount");
const copyToastEl    = document.getElementById("copyToast");

copyAccountBtn.addEventListener("click", async () => {
  const acct = acctNumberEl.textContent.trim();
  try {
    await navigator.clipboard.writeText(acct);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = acct;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  copyToastEl.textContent = "복사됨 ✓";
  setTimeout(() => { copyToastEl.textContent = ""; }, 1400);
});

/* =========================================================
   Contact — Email Draft System
========================================================= */
const draftSubject  = document.getElementById("draftSubject");
const draftBody     = document.getElementById("draftBody");
const copySubjectBtn = document.getElementById("copySubject");
const copyBodyBtn   = document.getElementById("copyBody");
const openMailAppBtn = document.getElementById("openMailApp");
const catButtons    = Array.from(document.querySelectorAll(".catBtn"));

const EMAIL_TO = "nedabah.way@gmail.com";

const templates = {
  /* ── IDEN 교육 트랙 ── */
  study: {
    subject: "[공부법 문의] 학습 습관 & 공부법 프로그램 신청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "학습 습관·공부법 프로그램을 문의드립니다.",
      "- 학생 학년:",
      "- 현재 상황(간단히):",
      "- 가장 힘든 부분(시작 못 함 / 집중 안 됨 / 방법 모름 등):",
      "- 희망 시작 시기:",
      "",
      "맞춤 안내 부탁드립니다.",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  career: {
    subject: "[진로 탐색 문의] 진로 & 자기 이해 코칭 신청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "진로 탐색·자기 이해 코칭을 문의드립니다.",
      "- 학생 학년:",
      "- 현재 상황(관심사가 없음 / 여러 개라 모름 / 부모와 충돌 등):",
      "- 진로 목표(있으면):",
      "- 희망 진행 방식(온라인/오프라인):",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  essay: {
    subject: "[자소서·면접 문의] 컨설팅 신청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "자소서·면접 컨설팅을 문의드립니다.",
      "- 지원 목적(학교/전형/취업 등):",
      "- 제출 마감 일정:",
      "- 현재 작성 상태(초안 있음 / 주제 없음 / 첫 시작):",
      "- 면접 포함 여부:",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  leadership: {
    subject: "[리더십 문의] 리더십 역량 강화 프로그램 신청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "리더십 역량 강화 프로그램을 문의드립니다.",
      "- 학생 학년/역할(학생회 / 동아리 / 팀 리더 등):",
      "- 개발하고 싶은 역량(소통 / 팀워크 / 발표 / 실행력 등):",
      "- 희망 기간:",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  ai: {
    subject: "[AI 워크숍 문의] 생성형 AI 활용 워크숍 요청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "생성형 AI 활용 워크숍을 문의드립니다.",
      "- 대상(개인/팀/기관):",
      "- 목적(문서/기획/교육/업무 자동화 등):",
      "- 희망 일정:",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  org: {
    subject: "[조직 소통 문의] 소통·협업 워크숍 요청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "조직 소통·협업 워크숍을 문의드립니다.",
      "- 조직/팀:",
      "- 인원:",
      "- 현재 이슈:",
      "- 희망 일정:",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  /* ── SBM 신앙 트랙 ── */
  sbm: {
    subject: "[SBM 참여 문의] 셀프성경묵상 훈련 신청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "SBM 묵상 훈련 참여를 문의드립니다.",
      "- 참여 대상(개인/공동체):",
      "- 희망 일정:",
      "- 현재 말씀 묵상 상황:",
      "- 특히 어려운 지점:",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  church: {
    subject: "[교회 세미나 문의] 말씀 읽기/나눔 세미나 요청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "교회 세미나 진행을 문의드립니다.",
      "- 교회/부서:",
      "- 참석 인원:",
      "- 희망 주제:",
      "- 희망 일정:",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  leaders: {
    subject: "[리더/팀 훈련 문의] 공동체 질문·언어·실행 흐름 설계",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "리더/팀 훈련을 문의드립니다.",
      "- 대상:",
      "- 현재 어려움:",
      "- 다루고 싶은 주제:",
      "- 희망 일정:",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  etc: {
    subject: "[문의] 상담/협력 관련 문의드립니다",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "문의드립니다.",
      "- 상황/요청:",
      "- 희망 일정:",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  }
};

let currentCat = "study";

function selectCategory(catKey) {
  currentCat = catKey;
  catButtons.forEach(b => b.classList.toggle("active", b.dataset.cat === catKey));
  const t = templates[catKey] || templates.study;
  draftSubject.textContent = t.subject;
  draftBody.textContent    = t.body;
  openMailAppBtn.setAttribute("href", makeMailto(EMAIL_TO, t.subject, t.body));
}

function makeMailto(to, subject, body) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

catButtons.forEach(btn => {
  btn.addEventListener("click", () => selectCategory(btn.dataset.cat));
});

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

function flashButton(btn, msg) {
  const orig = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = orig), 900);
}

copySubjectBtn.addEventListener("click", async () => {
  await copyText(draftSubject.textContent.trim());
  flashButton(copySubjectBtn, "복사됨");
});

copyBodyBtn.addEventListener("click", async () => {
  await copyText(draftBody.textContent.trim());
  flashButton(copyBodyBtn, "복사됨");
});

/* Initialize contact default */
selectCategory("study");

/* =========================================================
   Hash navigation
========================================================= */
window.addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  if (id) scrollToSlide(id);
});
