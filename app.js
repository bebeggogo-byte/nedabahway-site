(() => {
  /** =========================
   *  DOM
   *  - index.html에 아래 id/class가 있어야 동작함
   *  header#header
   *  button#homeBtn
   *  .navBtn[data-index="0..4"]
   *  #indicatorBar
   *  #pager, #track
   *  [data-goto]  (옵션)
   *  [data-contact] (옵션)
   *  [data-pdf]  (옵션)
   *  Modal: #modalOverlay #modalClose #modalTitle #pdfFrame
   *  Contact: .catBtn[data-cat] #mailSubject #mailBody #copySubjectBtn #copyBodyBtn #openMailBtn
   * ========================= */

  const header = document.getElementById("header");
  const pager = document.getElementById("pager");
  const track = document.getElementById("track");

  const homeBtn = document.getElementById("homeBtn");
  const navBtns = Array.from(document.querySelectorAll(".navBtn"));
  const indicatorBar = document.getElementById("indicatorBar");

  // Modal(PDF)
  const modalOverlay = document.getElementById("modalOverlay");
  const modalClose = document.getElementById("modalClose");
  const modalTitle = document.getElementById("modalTitle");
  const pdfFrame = document.getElementById("pdfFrame");

  // Contact draft
  const catBtns = Array.from(document.querySelectorAll(".catBtn"));
  const mailSubject = document.getElementById("mailSubject");
  const mailBody = document.getElementById("mailBody");
  const copySubjectBtn = document.getElementById("copySubjectBtn");
  const copyBodyBtn = document.getElementById("copyBodyBtn");
  const openMailBtn = document.getElementById("openMailBtn");

  /** =========================
   *  Config
   * ========================= */
  const TOTAL_PAGES = 5;
  const EMAIL_TO = "nedabah.way@gmail.com";

  // ✅ 네 assets 경로만 네 실제 파일명에 맞춰 “1번만” 조정하면 끝
  const PDF_MAP = {
    intro: {
      title: "네다바웨이 소개 & SBM 안내",
      url: "./assets/%EB%84%A4%EB%8B%A4%EB%B0%94%EC%9B%A8%EC%9D%B4%20%EC%86%8C%EA%B0%9C.pdf.html",
    },
    sbm: {
      title: "SBM 성숙 안내 자료",
      url: "./assets/Nedabah_Way_Spiritual_Maturity%20(2).pdf",
    },
  };

  // ✅ 문의 초안(복구 버전 / 말투 안정적으로)
  const DRAFTS = {
    church: {
      subject: "[문의] 교회 세미나 진행 관련",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "교회 상황에 맞춘 ‘말씀읽기 중심’ 세미나 진행을 요청드리고 싶습니다.\n\n" +
        "- 교회/기관:\n" +
        "- 대상(인원/연령):\n" +
        "- 희망 주제:\n" +
        "- 희망 일정/시간:\n" +
        "- 장소(지역):\n\n" +
        "가능한 진행 방식과 준비 사항을 안내 부탁드립니다.\n감사합니다.",
    },
    sbm: {
      subject: "[문의] SBM 진행(관찰·묵상·사귐) 관련",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "SBM 진행을 통해 말씀읽기가 하나님과의 ‘사귐’으로 이어지도록 함께 진행하고 싶습니다.\n\n" +
        "- 공동체/팀:\n" +
        "- 대상(인원/연령):\n" +
        "- 희망 기간(횟수/주기):\n" +
        "- 현재 고민(짧게):\n\n" +
        "가능한 방식과 흐름을 안내 부탁드립니다.\n감사합니다.",
    },
    ai: {
      subject: "[문의] 생성형 AI 워크숍 진행 관련",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "현장에서 바로 쓰는 방식으로 생성형 AI 워크숍 진행을 요청드리고 싶습니다.\n\n" +
        "- 기관/팀:\n" +
        "- 대상/인원:\n" +
        "- 필요 목적(예: 문서/업무/기획 등):\n" +
        "- 희망 일정/시간:\n\n" +
        "맞춤 구성 제안 가능 여부와 진행 방식 안내 부탁드립니다.\n감사합니다.",
    },
    org: {
      subject: "[문의] 조직 소통·협업 워크숍 관련",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "조직 내 소통/협업 이슈를 감정이 아니라 ‘구조’로 정리해보고 싶습니다.\n" +
        "현장 적용까지 이어지는 워크숍 제안을 요청드립니다.\n\n" +
        "- 조직/팀:\n" +
        "- 현재 병목(짧게):\n" +
        "- 희망 진행 방식(강의/워크숍/코칭):\n" +
        "- 희망 일정/시간:\n\n" +
        "가능한 구성과 준비물 안내 부탁드립니다.\n감사합니다.",
    },
    etc: {
      subject: "[문의] 기타 문의",
      body:
        "안녕하세요. 네다바웨이 팀께 문의드립니다.\n\n" +
        "아래 내용으로 문의드립니다.\n\n" +
        "- 문의 목적:\n" +
        "- 현재 상황:\n" +
        "- 희망 일정/방식:\n\n" +
        "가능한 범위에서 안내 부탁드립니다.\n감사합니다.",
    },
  };

  /** =========================
   *  State
   * ========================= */
  let index = 0;

  // pointer gesture
  let isDown = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;

  // 0 undecided, 1 horizontal swipe, 2 vertical scroll
  let mode = 0;

  // momentum feel
  const EASE = "cubic-bezier(.18,.95,.18,1)";
  const TRANSITION_MS = 560;

  /** =========================
   *  Utilities
   * ========================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function syncHeaderHeight() {
    if (!header) return;
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--headerH", `${h}px`);
  }

  function setActiveNav(i) {
    navBtns.forEach((b) => b.classList.remove("active"));
    if (navBtns[i]) navBtns[i].classList.add("active");
  }

  function moveIndicator(i) {
    if (!indicatorBar) return;
    const percent = (100 / TOTAL_PAGES) * i;
    indicatorBar.style.transform = `translateX(${percent}%)`;
  }

  function setTrackTranslate(percent, animate = true) {
    if (!track) return;
    track.style.transition = animate ? `transform ${TRANSITION_MS}ms ${EASE}` : "none";
    track.style.transform = `translate3d(${percent}%, 0, 0)`;
  }

  function goTo(i, animate = true) {
    index = clamp(i, 0, TOTAL_PAGES - 1);
    setTrackTranslate(-index * 100, animate);
    setActiveNav(index);
    moveIndicator(index);
  }

  /** =========================
   *  Init
   * ========================= */
  window.addEventListener("resize", syncHeaderHeight);
  window.addEventListener("orientationchange", syncHeaderHeight);
  setTimeout(syncHeaderHeight, 0);

  goTo(0, false);

  /** =========================
   *  Nav interactions
   * ========================= */
  if (homeBtn) homeBtn.addEventListener("click", () => goTo(0, true));

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.index);
      goTo(i, true);
    });
  });

  // any button that jumps
  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.goto);
      goTo(i, true);
    });
  });

  /** =========================
   *  Swipe engine (최종 완성형)
   *  - 세로 스크롤과 싸우지 않음
   *  - 가로일 때만 track 드래그
   *  - 엣지에서는 저항감(탄성)
   * ========================= */
  function onDown(e) {
    // mouse: left only
    if (e.pointerType === "mouse" && e.button !== 0) return;

    isDown = true;
    mode = 0;

    startX = e.clientX;
    startY = e.clientY;
    lastX = startX;
    lastY = startY;

    if (track) track.style.transition = "none";
    pager?.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (!isDown) return;

    lastX = e.clientX;
    lastY = e.clientY;

    const dx = lastX - startX;
    const dy = lastY - startY;

    // decide gesture direction
    if (mode === 0) {
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      if (ax < 7 && ay < 7) return; // deadzone
      mode = ax > ay ? 1 : 2;
    }

    // vertical -> do nothing (allow scroll inside page)
    if (mode === 2) {
      setTrackTranslate(-index * 100, true);
      return;
    }

    // horizontal swipe -> prevent page scroll bounce
    e.preventDefault?.();

    const w = pager?.getBoundingClientRect?.().width || window.innerWidth;
    const deltaPercent = (dx / w) * 100;

    let target = -index * 100 + deltaPercent;

    // edge resistance (탄성)
    if (index === 0 && deltaPercent > 0) target = -index * 100 + deltaPercent * 0.35;
    if (index === TOTAL_PAGES - 1 && deltaPercent < 0) target = -index * 100 + deltaPercent * 0.35;

    setTrackTranslate(target, false);
  }

  function onUp() {
    if (!isDown) return;
    isDown = false;

    // vertical: reset
    if (mode === 2) {
      goTo(index, true);
      return;
    }

    const dx = lastX - startX;
    const w = pager?.getBoundingClientRect?.().width || window.innerWidth;

    // threshold (기기별 자동)
    const threshold = Math.min(92, w * 0.18);

    if (Math.abs(dx) > threshold) {
      if (dx < 0) goTo(index + 1, true);
      else goTo(index - 1, true);
    } else {
      goTo(index, true);
    }
  }

  if (pager) {
    pager.addEventListener("pointerdown", onDown, { passive: true });
    pager.addEventListener("pointermove", onMove, { passive: false });
    pager.addEventListener("pointerup", onUp, { passive: true });
    pager.addEventListener("pointercancel", onUp, { passive: true });
  }

  /** =========================
   *  Programs → 문의 이동 + 카테고리 자동 선택
   * ========================= */
  function selectCategory(catKey) {
    const draft = DRAFTS[catKey] || DRAFTS.etc;

    catBtns.forEach((b) => b.classList.remove("active"));
    const btn = catBtns.find((b) => b.dataset.cat === catKey);
    if (btn) btn.classList.add("active");

    if (mailSubject) mailSubject.value = draft.subject;
    if (mailBody) mailBody.value = draft.body;
  }

  // init default category
  if (catBtns.length && mailSubject && mailBody) selectCategory("church");

  catBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectCategory(btn.dataset.cat);
    });
  });

  // program quick ask buttons (data-contact)
  document.querySelectorAll("[data-contact]").forEach((el) => {
    el.addEventListener("click", () => {
      const cat = el.dataset.contact;
      goTo(4, true); // contact page
      setTimeout(() => selectCategory(cat), 240);
    });
  });

  /** =========================
   *  Clipboard + mailto
   * ========================= */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    }
  }

  if (copySubjectBtn && mailSubject) {
    copySubjectBtn.addEventListener("click", async () => {
      await copyText(mailSubject.value || "");
      copySubjectBtn.textContent = "복사됨";
      setTimeout(() => (copySubjectBtn.textContent = "제목복사"), 800);
    });
  }

  if (copyBodyBtn && mailBody) {
    copyBodyBtn.addEventListener("click", async () => {
      await copyText(mailBody.value || "");
      copyBodyBtn.textContent = "복사됨";
      setTimeout(() => (copyBodyBtn.textContent = "본문복사"), 800);
    });
  }

  if (openMailBtn) {
    openMailBtn.addEventListener("click", () => {
      const subject = encodeURIComponent(mailSubject?.value || "");
      const body = encodeURIComponent(mailBody?.value || "");
      window.location.href = `mailto:${EMAIL_TO}?subject=${subject}&body=${body}`;
    });
  }

  /** =========================
   *  PDF Modal (앱처럼)
   * ========================= */
  function openPDF(key) {
    const item = PDF_MAP[key];
    if (!item) return;

    if (modalTitle) modalTitle.textContent = item.title;
    if (pdfFrame) pdfFrame.src = item.url;

    if (modalOverlay) {
      modalOverlay.classList.add("show");
      modalOverlay.setAttribute("aria-hidden", "false");
    }
  }

  function closePDF() {
    if (modalOverlay) {
      modalOverlay.classList.remove("show");
      modalOverlay.setAttribute("aria-hidden", "true");
    }
    if (pdfFrame) pdfFrame.src = "";
  }

  document.querySelectorAll("[data-pdf]").forEach((btn) => {
    btn.addEventListener("click", () => openPDF(btn.dataset.pdf));
  });

  if (modalClose) modalClose.addEventListener("click", closePDF);

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closePDF();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePDF();
  });

  /** =========================
   *  Safety: track height bug 방지
   *  - iOS 주소창 변동에도 고정되게
   * ========================= */
  function fixVh() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }
  fixVh();
  window.addEventListener("resize", fixVh);

})();