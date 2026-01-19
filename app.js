/* =========================================================
   Nedabahway App JS (Swipe + Nav + Indicator + PDF Modal + Contact Drafts)
   ========================================================= */

(() => {
  const track = document.getElementById("track");
  const pager = document.getElementById("pager");
  const navBtns = Array.from(document.querySelectorAll(".navBtn"));
  const indicatorBar = document.getElementById("indicatorBar");

  const homeBtn = document.getElementById("homeBtn");

  const modalOverlay = document.getElementById("modalOverlay");
  const modalClose = document.getElementById("modalClose");
  const modalTitle = document.getElementById("modalTitle");
  const pdfFrame = document.getElementById("pdfFrame");

  const categoryGrid = document.getElementById("categoryGrid");
  const catBtns = Array.from(document.querySelectorAll(".catBtn"));
  const mailSubject = document.getElementById("mailSubject");
  const mailBody = document.getElementById("mailBody");
  const copySubjectBtn = document.getElementById("copySubjectBtn");
  const copyBodyBtn = document.getElementById("copyBodyBtn");
  const openMailBtn = document.getElementById("openMailBtn");

  // ✅ 너 깃허브 assets에 올려둔 PDF 파일명에 맞춰야 함 (공백/괄호 URL 인코딩 필수)
  // 아래 두 파일이 assets 폴더에 있다고 가정 (스크린샷 기준)
  const PDF_MAP = {
    intro: {
      title: "네다바웨이 소개 & SBM 안내",
      url: "./assets/%EB%84%A4%EB%8B%A4%EB%B0%94%EC%9B%A8%EC%9D%B4%20%EC%86%8C%EA%B0%9C.pdf.html"
      // ※ 만약 pdf.html이 아니라 pdf로 올렸다면 여기 url을 pdf 파일명으로 바꿔줘.
    },
    sbm: {
      title: "SBM 성숙 안내 자료",
      url: "./assets/Nedabah_Way_Spiritual_Maturity%20(2).pdf"
    }
  };

  // ✅ 페이지 관리
  const totalPages = 5;
  let index = 0;

  // ✅ 스와이프용
  let startX = 0;
  let currentX = 0;
  let dragging = false;

  function setActiveNav(i) {
    navBtns.forEach((b) => b.classList.remove("active"));
    navBtns[i].classList.add("active");
  }

  function moveIndicator(i) {
    // bar width = 20% (5 pages)
    const percent = (100 / totalPages) * i;
    indicatorBar.style.transform = `translateX(${percent}%)`;
  }

  function goTo(i, animate = true) {
    index = Math.max(0, Math.min(totalPages - 1, i));

    // transition on/off
    track.style.transition = animate
      ? "transform 520ms cubic-bezier(.18,.95,.18,1)"
      : "none";

    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;

    setActiveNav(index);
    moveIndicator(index);
  }

  // 초기
  goTo(0, false);

  // ✅ Nav button click
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.index);
      goTo(i, true);
    });
  });

  // ✅ Home logo click
  homeBtn.addEventListener("click", () => goTo(0, true));
  homeBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") goTo(0, true);
  });

  // ✅ internal goto buttons (SBM 보기 / 자료 보기 등)
  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.goto);
      goTo(i, true);
    });
  });

  // ✅ Program 문의 버튼 → 문의 페이지 + 카테고리 자동선택
  document.querySelectorAll("[data-contact]").forEach((el) => {
    el.addEventListener("click", () => {
      const cat = el.dataset.contact;
      goTo(4, true);
      setTimeout(() => selectCategory(cat), 300);
    });
  });

  // ==========================
  // Swipe / Drag
  // ==========================
  function onStart(clientX) {
    dragging = true;
    startX = clientX;
    currentX = clientX;
    track.style.transition = "none";
  }

  function onMove(clientX) {
    if (!dragging) return;
    currentX = clientX;

    const delta = currentX - startX;
    const width = pager.getBoundingClientRect().width;
    const percent = (delta / width) * 100;

    // resistance on edges
    let offset = -index * 100 + percent;
    if (index === 0 && percent > 0) offset = -index * 100 + percent * 0.35;
    if (index === totalPages - 1 && percent < 0) offset = -index * 100 + percent * 0.35;

    track.style.transform = `translate3d(${offset}%,0,0)`;
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;

    const delta = currentX - startX;
    const width = pager.getBoundingClientRect().width;

    // threshold
    const threshold = Math.min(90, width * 0.18);

    if (Math.abs(delta) > threshold) {
      if (delta < 0) goTo(index + 1, true);
      else goTo(index - 1, true);
    } else {
      goTo(index, true);
    }
  }

  // Touch events
  pager.addEventListener("touchstart", (e) => onStart(e.touches[0].clientX), { passive: true });
  pager.addEventListener("touchmove", (e) => onMove(e.touches[0].clientX), { passive: true });
  pager.addEventListener("touchend", onEnd);

  // Mouse events (PC)
  pager.addEventListener("mousedown", (e) => onStart(e.clientX));
  window.addEventListener("mousemove", (e) => onMove(e.clientX));
  window.addEventListener("mouseup", onEnd);

  // ==========================
  // PDF Modal
  // ==========================
  function openPDF(key) {
    const item = PDF_MAP[key];
    if (!item) return;

    modalTitle.textContent = item.title;
    pdfFrame.src = item.url;

    modalOverlay.classList.add("show");
    modalOverlay.setAttribute("aria-hidden", "false");
  }

  function closePDF() {
    modalOverlay.classList.remove("show");
    modalOverlay.setAttribute("aria-hidden", "true");

    // stop PDF to save memory
    pdfFrame.src = "";
  }

  document.querySelectorAll("[data-pdf]").forEach((btn) => {
    btn.addEventListener("click", () => openPDF(btn.dataset.pdf));
  });

  modalClose.addEventListener("click", closePDF);

  modalOverlay.addEventListener("click", (e) => {
    // click outside modal
    if (e.target === modalOverlay) closePDF();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePDF();
  });

  // ==========================
  // Contact Drafts (5 categories)
  // ==========================
  const EMAIL_TO = "nedabah.way@gmail.com";

  const DRAFTS = {
    church: {
      subject: "[문의] 교회 세미나 진행 관련",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "교회 상황에 맞춘 ‘말씀읽기 중심’ 세미나 진행을 요청드리고 싶습니다.\n\n" +
        "- 교회/기관: \n" +
        "- 대상(인원/연령): \n" +
        "- 희망 주제: \n" +
        "- 희망 일정/시간: \n" +
        "- 장소(지역): \n\n" +
        "가능한 진행 방식과 준비 사항을 안내 부탁드립니다.\n감사합니다."
    },
    sbm: {
      subject: "[문의] SBM 진행(관찰·묵상·사귐) 관련",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "SBM 진행을 통해 말씀읽기가 하나님과의 ‘사귐’으로 이어지도록 함께 진행하고 싶습니다.\n\n" +
        "- 공동체/팀: \n" +
        "- 대상(인원/연령): \n" +
        "- 희망 기간(횟수/주기): \n" +
        "- 현재 고민(짧게): \n\n" +
        "가능한 방식과 흐름을 안내 부탁드립니다.\n감사합니다."
    },
    ai: {
      subject: "[문의] 생성형 AI 워크숍 진행 관련",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "현장에서 바로 쓸 수 있도록 생성형 AI 워크숍 진행을 요청드리고 싶습니다.\n\n" +
        "- 기관/팀: \n" +
        "- 대상/인원: \n" +
        "- 필요 목적(예: 문서/업무/기획 등): \n" +
        "- 희망 일정/시간: \n\n" +
        "맞춤 구성 제안 가능 여부와 진행 방식 안내 부탁드립니다.\n감사합니다."
    },
    org: {
      subject: "[문의] 조직 소통·협업 워크숍 관련",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "조직 내 소통/협업 이슈를 감정이 아니라 ‘구조’로 정리해보고 싶습니다.\n현장 적용까지 이어지는 워크숍 제안을 요청드립니다.\n\n" +
        "- 조직/팀: \n" +
        "- 현재 병목(짧게): \n" +
        "- 희망 진행 방식(강의/워크숍/코칭): \n" +
        "- 희망 일정/시간: \n\n" +
        "가능한 구성과 준비물 안내 부탁드립니다.\n감사합니다."
    },
    etc: {
      subject: "[문의] 기타 문의",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "아래 내용으로 문의드립니다.\n\n" +
        "- 문의 목적: \n" +
        "- 현재 상황: \n" +
        "- 희망 일정/방식: \n\n" +
        "가능한 범위에서 안내 부탁드립니다.\n감사합니다."
    }
  };

  function clearCatActive() {
    catBtns.forEach((b) => b.classList.remove("active"));
  }

  function selectCategory(catKey) {
    const draft = DRAFTS[catKey] || DRAFTS.etc;

    clearCatActive();
    const btn = catBtns.find((b) => b.dataset.cat === catKey);
    if (btn) btn.classList.add("active");

    mailSubject.value = draft.subject;
    mailBody.value = draft.body;
  }

  // init default selection
  selectCategory("church");

  catBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectCategory(btn.dataset.cat);
    });
  });

  // Copy helpers
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    }
  }

  copySubjectBtn.addEventListener("click", async () => {
    await copyText(mailSubject.value);
    copySubjectBtn.textContent = "복사됨";
    setTimeout(() => (copySubjectBtn.textContent = "제목복사"), 800);
  });

  copyBodyBtn.addEventListener("click", async () => {
    await copyText(mailBody.value);
    copyBodyBtn.textContent = "복사됨";
    setTimeout(() => (copyBodyBtn.textContent = "본문복사"), 800);
  });

  openMailBtn.addEventListener("click", () => {
    const subject = encodeURIComponent(mailSubject.value || "");
    const body = encodeURIComponent(mailBody.value || "");
    const url = `mailto:${EMAIL_TO}?subject=${subject}&body=${body}`;
    window.location.href = url;
  });
})();