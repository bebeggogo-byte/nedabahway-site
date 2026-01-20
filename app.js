/* =========================================================
   NedabahWay - App JS
   - Horizontal swipe slides (scroll-snap)
   - Fixed header arrow (next slide)
   - Bottom tab navigation + active state
   - SBM Reviews: add + store in localStorage (accumulating)
   - Contact: 6 categories -> auto subject/body, copy, open mail app
   - Programs: click -> preselect contact template and jump to contact
========================================================= */

const stage = document.getElementById("stage");
const slides = Array.from(document.querySelectorAll(".slide"));
const tabs = Array.from(document.querySelectorAll(".tab"));
const nextArrow = document.getElementById("nextArrow");

/* ---------- Helpers ---------- */
function getSlideIndexInView() {
  // Use scrollLeft proximity
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
nextArrow.addEventListener("click", () => {
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
stage.addEventListener("scroll", () => {
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
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveReviews(list) {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(list));
}

function ensureSeedReviews() {
  const existing = loadReviews();
  if (existing && existing.length) return;

  const seed = [
    {
      name: "익명",
      text: "말씀을 ‘해야 하는 일’이 아니라, 다시 하나님 앞에 서는 시간으로 느끼게 됐습니다.",
      date: formatDate(new Date())
    },
    {
      name: "익명",
      text: "막혔던 지점이 ‘적용’이 아니라 ‘만남’의 문제였다는 걸 보게 됐어요.",
      date: formatDate(new Date())
    }
  ];
  saveReviews(seed);
}

function renderReviews() {
  const list = loadReviews() || [];
  reviewList.innerHTML = "";

  if (!list.length) {
    reviewList.innerHTML = `<div class="reviewItem"><div class="reviewText">아직 후기가 없습니다.</div></div>`;
    return;
  }

  list
    .slice()
    .reverse()
    .forEach((r) => {
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

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

openReviewForm.addEventListener("click", () => {
  reviewFormWrap.hidden = false;
  reviewName.focus();
});

cancelReviewBtn.addEventListener("click", () => {
  reviewFormWrap.hidden = true;
  reviewName.value = "";
  reviewText.value = "";
});

saveReviewBtn.addEventListener("click", () => {
  const name = (reviewName.value || "").trim();
  const text = (reviewText.value || "").trim();

  if (!text) {
    alert("후기 내용을 입력해 주세요.");
    return;
  }

  const list = loadReviews() || [];
  list.push({
    name: name || "익명",
    text,
    date: formatDate(new Date())
  });

  saveReviews(list);

  reviewFormWrap.hidden = true;
  reviewName.value = "";
  reviewText.value = "";

  renderReviews();
});

/* init reviews */
ensureSeedReviews();
renderReviews();

/* =========================================================
   Donate - Copy account
========================================================= */
const acctNumberEl = document.getElementById("acctNumber");
const copyAccountBtn = document.getElementById("copyAccount");
const copyToast = document.getElementById("copyToast");

copyAccountBtn.addEventListener("click", async () => {
  const acct = acctNumberEl.textContent.trim();
  try {
    await navigator.clipboard.writeText(acct);
    showCopyToast("복사됨");
  } catch (e) {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = acct;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showCopyToast("복사됨");
  }
});

function showCopyToast(msg) {
  copyToast.textContent = msg;
  copyToast.style.opacity = "1";
  setTimeout(() => {
    copyToast.textContent = "";
  }, 1200);
}

/* =========================================================
   Contact - Email Draft System
========================================================= */
const draftSubject = document.getElementById("draftSubject");
const draftBody = document.getElementById("draftBody");
const copySubjectBtn = document.getElementById("copySubject");
const copyBodyBtn = document.getElementById("copyBody");
const openMailAppBtn = document.getElementById("openMailApp");
const catButtons = Array.from(document.querySelectorAll(".catBtn"));

const EMAIL_TO = "nedabah.way@gmail.com";

const templates = {
  sbm: {
    subject: "[SBM 참여 문의] 일정/방식 확인 요청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "SBM 묵상 훈련 참여를 문의드립니다.",
      "- 참여 대상(개인/공동체):",
      "- 희망 일정/기간:",
      "- 현재 상황(간단히):",
      "- 특히 어려운 지점(읽기/막힘/적용 등):",
      "",
      "가능한 방식과 안내를 부탁드립니다.",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  church: {
    subject: "[교회 세미나 문의] 말씀 읽기/적용 흐름 세미나 요청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "교회 내 세미나 진행을 문의드립니다.",
      "- 교회/부서:",
      "- 참석 인원:",
      "- 희망 주제(말씀 읽기/적용/나눔/훈련 등):",
      "- 희망 일정:",
      "- 기대하는 변화(간단히):",
      "",
      "가능한 구성과 준비 사항 안내 부탁드립니다.",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  leaders: {
    subject: "[리더/팀 훈련 문의] 공동체 질문/언어/실행 흐름 설계",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "리더/팀 훈련을 문의드립니다.",
      "- 대상(리더/팀/공동체):",
      "- 현재 겪는 어려움:",
      "- 다루고 싶은 주제(나눔 흐름/질문/실행 등):",
      "- 희망 일정:",
      "",
      "맞춤형으로 안내 부탁드립니다.",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  ai: {
    subject: "[생성형 AI 워크숍 문의] 실무 적용 워크숍 요청",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "생성형 AI 활용 워크숍을 문의드립니다.",
      "- 대상(개인/팀/기관):",
      "- 희망 목적(문서/기획/교육/업무 자동화 등):",
      "- 희망 일정/시간:",
      "- 현재 사용 도구(ChatGPT 등):",
      "",
      "현장 적용 중심 구성으로 안내 부탁드립니다.",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  },
  org: {
    subject: "[조직 소통·협업 워크숍 문의] 병목 진단/실행 규칙 설계",
    body: [
      "안녕하세요. 네다바웨이 담당자님,",
      "",
      "조직 소통·협업 워크숍을 문의드립니다.",
      "- 조직/팀:",
      "- 인원:",
      "- 현재 이슈(간단히):",
      "- 원하는 결과(예: 협업 규칙/메시지 합의/현장 적용):",
      "- 희망 일정:",
      "",
      "가능한 방식과 준비 사항 안내 부탁드립니다.",
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
      "- 추가 정보:",
      "",
      "확인 부탁드립니다.",
      "",
      "감사합니다.",
      "이름/연락처:"
    ].join("\n")
  }
};

let currentCat = "sbm";

function selectCategory(catKey) {
  currentCat = catKey;

  catButtons.forEach((b) => {
    b.classList.toggle("active", b.dataset.cat === catKey);
  });

  const t = templates[catKey] || templates.sbm;
  draftSubject.textContent = t.subject;
  draftBody.textContent = t.body;

  // Update mailto link
  const mailto = makeMailto(EMAIL_TO, t.subject, t.body);
  openMailAppBtn.setAttribute("href", mailto);
}

function makeMailto(to, subject, body) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${to}?subject=${s}&body=${b}`;
}

catButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectCategory(btn.dataset.cat);
  });
});

/* Copy subject/body */
copySubjectBtn.addEventListener("click", async () => {
  await copyText(draftSubject.textContent.trim());
  flashButton(copySubjectBtn, "복사됨");
});

copyBodyBtn.addEventListener("click", async () => {
  await copyText(draftBody.textContent.trim());
  flashButton(copyBodyBtn, "복사됨");
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

function flashButton(btn, msg) {
  const original = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = original), 900);
}

/* Initialize contact default */
selectCategory("sbm");

/* =========================================================
   Programs -> auto choose contact category & jump to contact
========================================================= */
const programCards = Array.from(document.querySelectorAll(".programCard"));
const goContact = document.getElementById("goContact");

programCards.forEach((card) => {
  card.addEventListener("click", () => {
    const cat = card.dataset.template || "etc";
    selectCategory(cat);
    scrollToSlide("contact");
  });
});

goContact.addEventListener("click", (e) => {
  e.preventDefault();
  scrollToSlide("contact");
});

/* =========================================================
   Hash navigation (optional)
========================================================= */
window.addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  if (id) scrollToSlide(id);
});