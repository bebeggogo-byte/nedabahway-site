function $(id) {
  return document.getElementById(id);
}

function setYear() {
  const el = $("year");
  if (el) el.textContent = new Date().getFullYear();
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 1200);
}

async function writeClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

/* ===== DONATE : 계좌복사만 ===== */
async function copyAccount() {
  const accountEl = $("accountText");
  const btn = $("copyAccount");
  const text = accountEl ? accountEl.textContent.trim() : "301-6642-7749-61";

  try {
    await writeClipboard(text);

    if (btn) {
      const prev = btn.textContent;
      btn.textContent = "복사 완료!";
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = prev;
        btn.disabled = false;
      }, 900);
    }

    showToast("계좌번호가 복사되었습니다");
  } catch (e) {
    alert("복사가 안 됐어요. 계좌번호를 직접 드래그해서 복사해 주세요.");
  }
}

function initDonateButtons() {
  const copyBtn = $("copyAccount");
  if (copyBtn) copyBtn.addEventListener("click", copyAccount);

  // 계좌번호 클릭해도 복사되게
  const acc = $("accountText");
  if (acc) acc.addEventListener("click", copyAccount);
}

/* ===== EMAIL HELPER : 카테고리 선택 + 제목/본문 복사 ===== */
const EMAIL_TO = "nedabah.way@gmail.com";

function getEmailTemplates() {
  const sig = [
    "",
    "감사합니다.",
    "네다바웨이 드림",
    "",
    "문의: nedabah.way@gmail.com",
    "후원계좌: 농협은행 301-6642-7749-61 (예금주: 네다바웨이)",
  ].join("\n");

  return {
    program: {
      subject: "[프로그램 문의] 네다바웨이 교육/워크숍 운영 가능 여부 문의드립니다",
      body: [
        "안녕하세요. 네다바웨이 담당자님께,",
        "",
        "저희 기관/단체에서 프로그램 운영을 검토 중이며, 아래 내용으로 상담을 요청드립니다.",
        "",
        "1) 대상(연령/직군):",
        "2) 인원/회차/시간:",
        "3) 원하는 주제(예: 묵상훈련/리더십/소통/AI 활용 등):",
        "4) 운영 희망 일정(기간/요일/시간대):",
        "5) 장소(지역):",
        "",
        "가능한 프로그램 구성 및 진행 방식(추천안/예상 범위)을 안내해주시면 감사하겠습니다.",
        sig,
      ].join("\n"),
    },

    quote: {
      subject: "[견적/일정 요청] 프로그램 진행 가능 일정 및 비용 문의드립니다",
      body: [
        "안녕하세요. 네다바웨이 담당자님께,",
        "",
        "프로그램 진행을 위해 견적 및 일정 확인을 요청드립니다.",
        "",
        "1) 희망 일정:",
        "2) 장소:",
        "3) 인원:",
        "4) 진행 시간(예: 2시간/3시간/반일/종일):",
        "5) 핵심 목표(예: 팀빌딩/소통개선/아이디어톤/묵상훈련 등):",
        "",
        "가능한 운영안(구성/준비물/소요 시간)과 함께 비용 범위를 안내 부탁드립니다.",
        sig,
      ].join("\n"),
    },

    partner: {
      subject: "[협업 제안] 네다바웨이와 공동 프로젝트/파트너십 제안드립니다",
      body: [
        "안녕하세요. 네다바웨이 담당자님께,",
        "",
        "저희는 아래 목적의 협업/파트너십을 제안드리고자 연락드립니다.",
        "",
        "1) 협업 목적:",
        "2) 제안하는 형태(공동 프로그램/행사/콘텐츠/연구 등):",
        "3) 기대 효과:",
        "4) 일정/기간:",
        "",
        "가능하시다면 간단한 미팅(온라인/오프라인)으로 논의를 진행하고 싶습니다.",
        sig,
      ].join("\n"),
    },

    donation: {
      subject: "[후원 문의] 후원 방식/안내 및 확인 요청드립니다",
      body: [
        "안녕하세요. 네다바웨이 담당자님께,",
        "",
        "후원 관련하여 아래 내용을 문의드립니다.",
        "",
        "1) 후원 방식(일시/정기) 관련 질문:",
        "2) 후원 확인 요청(입금일/입금자명):",
        "3) 향후 기부금영수증 관련 문의:",
        "",
        "안내해주시면 감사하겠습니다.",
        sig,
      ].join("\n"),
    },

    invite: {
      subject: "[강의/행사 초청] 네다바웨이 강의/워크숍 초청 문의드립니다",
      body: [
        "안녕하세요. 네다바웨이 담당자님께,",
        "",
        "아래 내용으로 강의/워크숍 초청을 검토 중이라 문의드립니다.",
        "",
        "1) 행사/교육명:",
        "2) 대상(연령/직군):",
        "3) 인원:",
        "4) 희망 주제:",
        "5) 진행 시간:",
        "6) 희망 일정/장소:",
        "",
        "가능 여부와 진행 방식/필요 사항을 안내해주시면 감사하겠습니다.",
        sig,
      ].join("\n"),
    },

    media: {
      subject: "[자료 요청] 네다바웨이 소개서/프로그램 자료 요청드립니다",
      body: [
        "안녕하세요. 네다바웨이 담당자님께,",
        "",
        "네다바웨이 소개 및 프로그램 검토를 위해 자료 요청드립니다.",
        "",
        "1) 요청 자료: (예: 단체 소개서 / 프로그램 안내서 / 운영 사례 / 커리큘럼 등)",
        "2) 검토 목적:",
        "",
        "가능하신 범위에서 공유 부탁드립니다.",
        sig,
      ].join("\n"),
    },
  };
}

function setEmailTemplate(key) {
  const templates = getEmailTemplates();
  const t = templates[key] || templates.program;

  const subjectEl = $("mailSubject");
  const bodyEl = $("mailBody");
  const openMail = $("openMail");

  if (subjectEl) subjectEl.value = t.subject;
  if (bodyEl) bodyEl.value = t.body;

  if (openMail) {
    const href =
      "mailto:" +
      encodeURIComponent(EMAIL_TO) +
      "?subject=" +
      encodeURIComponent(t.subject) +
      "&body=" +
      encodeURIComponent(t.body);
    openMail.setAttribute("href", href);
  }
}

async function copySubject() {
  const subjectEl = $("mailSubject");
  const text = subjectEl ? subjectEl.value : "";
  if (!text) return;

  try {
    await writeClipboard(text);
    showToast("제목이 복사되었습니다");
  } catch (e) {
    alert("복사가 안 됐어요. 제목을 직접 드래그해서 복사해 주세요.");
  }
}

async function copyBody() {
  const bodyEl = $("mailBody");
  const text = bodyEl ? bodyEl.value : "";
  if (!text) return;

  try {
    await writeClipboard(text);
    showToast("본문이 복사되었습니다");
  } catch (e) {
    alert("복사가 안 됐어요. 본문을 직접 드래그해서 복사해 주세요.");
  }
}

function initMailHelper() {
  const pills = document.querySelectorAll(".mail-pill");
  pills.forEach((p) => {
    p.addEventListener("click", () => {
      pills.forEach((x) => x.classList.remove("active"));
      p.classList.add("active");
      setEmailTemplate(p.getAttribute("data-template"));
      showToast("이메일 초안이 적용되었습니다");
    });
  });

  const btnSub = $("copySubject");
  if (btnSub) btnSub.addEventListener("click", copySubject);

  const btnBody = $("copyBody");
  if (btnBody) btnBody.addEventListener("click", copyBody);

  // 기본 템플릿
  setEmailTemplate("program");
}

/* ===== SLIDE NAV ===== */
function getSlidesContainer() {
  return document.querySelector(".slides");
}

function getSlides() {
  return Array.from(document.querySelectorAll(".slide"));
}

function getCurrentSlideIndex() {
  const scroller = getSlidesContainer();
  const slides = getSlides();
  if (!scroller || slides.length === 0) return 0;

  const x = scroller.scrollLeft;
  const w = scroller.clientWidth;
  return Math.round(x / w);
}

function goToSlide(index) {
  const scroller = getSlidesContainer();
  const slides = getSlides();
  if (!scroller || slides.length === 0) return;

  const clamped = Math.max(0, Math.min(index, slides.length - 1));
  const w = scroller.clientWidth;

  scroller.scrollTo({
    left: clamped * w,
    behavior: "smooth",
  });
}

function nextSlide() {
  goToSlide(getCurrentSlideIndex() + 1);
}

function prevSlide() {
  goToSlide(getCurrentSlideIndex() - 1);
}

function smoothAnchorHorizontal() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      target.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    });
  });
}

function bindKeyboard() {
  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      nextSlide();
    }
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      prevSlide();
    }
  });
}

function bindControls() {
  const nextBtn = $("nextSlide");
  const prevBtn = $("prevSlide");
  if (nextBtn) nextBtn.addEventListener("click", nextSlide);
  if (prevBtn) prevBtn.addEventListener("click", prevSlide);
}

function init() {
  setYear();
  smoothAnchorHorizontal();
  bindKeyboard();
  bindControls();
  initDonateButtons();
  initMailHelper();
}

document.addEventListener("DOMContentLoaded", init);
