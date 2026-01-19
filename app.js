/* =========================
   Nedabah Way - App Script
   ========================= */

(function(){
  const slider = document.getElementById("slider");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const navItems = Array.from(document.querySelectorAll(".nav-item"));
  const brandHome = document.getElementById("brandHome");

  const indicatorBar = document.getElementById("indicatorBar");
  const indicatorDots = document.getElementById("indicatorDots");

  // --- Safety: required DOM
  if(!slider || slides.length === 0) return;

  const slideIds = slides.map(s => s.id);

  // ===== Indicator Dots Build =====
  function buildDots(){
    if(!indicatorDots) return;
    indicatorDots.innerHTML = "";
    slides.forEach((s, idx) => {
      const b = document.createElement("button");
      b.className = "dot-btn";
      b.type = "button";
      b.setAttribute("aria-label", `${idx+1}번째 페이지로 이동`);
      b.addEventListener("click", ()=> scrollToSlide(s.id, true));
      indicatorDots.appendChild(b);
    });
  }
  buildDots();

  function getSlideById(id){
    return slides.find(s => s.id === id);
  }

  function clamp(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  function setActiveNav(id){
    navItems.forEach(btn => btn.classList.remove("is-active"));
    const found = navItems.find(btn => btn.dataset.target === id);
    if(found) found.classList.add("is-active");
  }

  function updateIndicator(index){
    // bar: move based on index / total
    if(indicatorBar){
      const total = slides.length;
      const widthPercent = 100 / total;
      indicatorBar.style.width = `${widthPercent}%`;
      indicatorBar.style.transform = `translateX(${index * widthPercent}%)`;
    }

    // dots
    if(indicatorDots){
      const dots = Array.from(indicatorDots.querySelectorAll(".dot-btn"));
      dots.forEach(d => d.classList.remove("is-active"));
      if(dots[index]) dots[index].classList.add("is-active");
    }
  }

  function setActiveSlideById(id){
    slides.forEach(s => s.classList.remove("is-active"));
    const active = getSlideById(id);
    if(active) active.classList.add("is-active");
  }

  function scrollToSlide(id, smooth=true){
    const el = getSlideById(id);
    if(!el) return;
    el.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      inline: "start",
      block: "nearest",
    });
  }

  // ===== Nav click =====
  navItems.forEach(btn => {
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.target;
      if(!id) return;
      scrollToSlide(id, true);
    });
  });

  // ===== Brand -> Home =====
  if(brandHome){
    brandHome.addEventListener("click", ()=> scrollToSlide("home", true));
  }

  // ===== Hero buttons data-target =====
  document.querySelectorAll("[data-target]").forEach((el)=>{
    el.addEventListener("click", ()=>{
      const id = el.getAttribute("data-target");
      if(!id) return;
      scrollToSlide(id, true);
    });
  });

  // ===== Slide observer -> set active classes & nav =====
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];

      if(!visible) return;

      const activeSlide = visible.target;
      const id = activeSlide.id;

      setActiveSlideById(id);
      setActiveNav(id);

      const idx = slides.findIndex(s => s.id === id);
      if(idx >= 0) updateIndicator(idx);

      // hash
      history.replaceState(null, "", `#${id}`);
    },
    { root: slider, threshold: [0.55, 0.7, 0.85] }
  );

  slides.forEach(s => io.observe(s));

  // ===== initial state =====
  const initialHash = (location.hash || "").replace("#", "");
  if(initialHash && slideIds.includes(initialHash)){
    scrollToSlide(initialHash, false);
    setActiveSlideById(initialHash);
    setActiveNav(initialHash);
    updateIndicator(slideIds.indexOf(initialHash));
  }else{
    scrollToSlide("home", false);
    setActiveSlideById("home");
    updateIndicator(0);
  }

  // ===== Programs -> Contact (auto category select) =====
  const inquiryButtons = document.querySelectorAll(".js-go-inquiry");
  inquiryButtons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const cat = btn.getAttribute("data-inquiry") || "etc";
      // go contact and set category
      scrollToSlide("contact", true);
      setTimeout(()=> selectCategory(cat), 350);
    });
  });

  // ===== Contact Draft Generator =====
  const catButtons = Array.from(document.querySelectorAll(".cat-btn"));
  const draftSubject = document.getElementById("draftSubject");
  const draftBody = document.getElementById("draftBody");
  const copySubjectBtn = document.getElementById("copySubject");
  const copyBodyBtn = document.getElementById("copyBody");
  const openMailBtn = document.getElementById("openMailApp");

  const MAIL_TO = "nedabah.way@gmail.com";

  const templates = {
    church: {
      subject: "[문의] 교회 세미나 진행 관련",
      body:
`안녕하세요. 네다바웨이 팀께 문의드립니다.

교회 내에서 말씀읽기(사귐 중심) 세미나 진행을 검토 중입니다.
가능한 일정/형태(시간, 구성, 대상)를 안내받고 싶습니다.

- 교회/기관:
- 대상:
- 희망 일정:
- 기대하는 방향:

감사합니다.`
    },
    sbm: {
      subject: "[문의] SBM 진행/도입 관련",
      body:
`안녕하세요. 네다바웨이 팀께 문의드립니다.

SBM(관찰-묵상-사귐)의 흐름으로 공동체/개인 진행을 고민하고 있습니다.
진행 방식과 안내 범위를 듣고 싶습니다.

- 적용 대상(개인/소그룹/공동체):
- 기간/횟수:
- 현재 고민:

감사합니다.`
    },
    ai: {
      subject: "[문의] 생성형 AI 워크숍 진행 관련",
      body:
`안녕하세요. 네다바웨이 팀께 문의드립니다.

현장에서 바로 사용하는 방식으로 생성형 AI 워크숍을 검토 중입니다.
대상과 상황에 맞춘 구성을 제안받고 싶습니다.

- 기관/팀:
- 대상:
- 목적(예: 문서/기획/업무 효율 등):
- 희망 일정:

감사합니다.`
    },
    team: {
      subject: "[문의] 조직 소통·협업 워크숍 관련",
      body:
`안녕하세요. 네다바웨이 팀께 문의드립니다.

조직 내 소통/협업 이슈를 감정이 아니라 구조로 정리해보고 싶습니다.
현장 적용까지 이어지는 워크숍 제안을 요청드립니다.

- 조직/팀:
- 현재 병목:
- 희망 진행 방식(강의/워크숍/코칭):

감사합니다.`
    },
    invite: {
      subject: "[문의] 초청/협력 제안",
      body:
`안녕하세요. 네다바웨이 팀께 제안드립니다.

이번에 진행하는 일정/프로그램에 네다바웨이와 협력을 고민하고 있습니다.
가능한 형태와 진행 범위를 논의하고 싶습니다.

- 제안 내용:
- 일정:
- 장소/방식:
- 연락처:

감사합니다.`
    },
    etc: {
      subject: "[문의] 기타 문의",
      body:
`안녕하세요. 네다바웨이 팀께 문의드립니다.

아래 내용으로 안내를 부탁드립니다.

- 문의 내용:
- 배경/상황:
- 희망 답변 형태(전화/메일):

감사합니다.`
    }
  };

  function setActiveCatButton(key){
    catButtons.forEach(b => b.classList.remove("is-active"));
    const found = catButtons.find(b => b.dataset.cat === key);
    if(found) found.classList.add("is-active");
  }

  function renderDraft(key){
    const t = templates[key] || templates.etc;
    if(draftSubject) draftSubject.textContent = t.subject;
    if(draftBody) draftBody.textContent = t.body;
  }

  function selectCategory(key){
    const k = templates[key] ? key : "etc";
    setActiveCatButton(k);
    renderDraft(k);
  }

  // expose to other handlers
  window.__nedabah_selectCategory = selectCategory;

  catButtons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.dataset.cat;
      selectCategory(key);
    });
  });

  // default cat already active
  selectCategory("church");

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      toast("복사되었습니다.");
    }catch(e){
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast("복사되었습니다.");
    }
  }

  if(copySubjectBtn){
    copySubjectBtn.addEventListener("click", ()=>{
      const text = draftSubject?.textContent || "";
      copyText(text);
    });
  }
  if(copyBodyBtn){
    copyBodyBtn.addEventListener("click", ()=>{
      const text = draftBody?.textContent || "";
      copyText(text);
    });
  }

  if(openMailBtn){
    openMailBtn.addEventListener("click", ()=>{
      const subject = encodeURIComponent(draftSubject?.textContent || "");
      const body = encodeURIComponent(draftBody?.textContent || "");
      const mailto = `mailto:${MAIL_TO}?subject=${subject}&body=${body}`;
      window.location.href = mailto;
    });
  }

  // ===== simple toast =====
  let toastTimer = null;
  function toast(msg){
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "22px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "14px";
    el.style.background = "rgba(11,19,36,0.88)";
    el.style.color = "rgba(255,255,255,0.96)";
    el.style.fontSize = "12px";
    el.style.fontWeight = "900";
    el.style.zIndex = "9999";
    el.style.boxShadow = "0 18px 60px rgba(2,6,23,0.28)";
    el.style.opacity = "0";
    el.style.transition = "opacity 180ms ease, transform 180ms ease";
    document.body.appendChild(el);

    requestAnimationFrame(()=>{
      el.style.opacity = "1";
      el.style.transform = "translateX(-50%) translateY(-2px)";
    });

    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>{
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(2px)";
      setTimeout(()=> el.remove(), 220);
    }, 900);
  }

  // ===== PDF Modal =====
  const pdfModal = document.getElementById("pdfModal");
  const pdfModalFrame = document.getElementById("pdfModalFrame");
  const pdfModalTitle = document.getElementById("pdfModalTitle");
  const pdfModalOpenNew = document.getElementById("pdfModalOpenNew");
  const pdfModalDownload = document.getElementById("pdfModalDownload");

  function openPdfModal(url, titleText){
    if(!pdfModal) return;

    pdfModal.classList.add("is-open");
    pdfModal.setAttribute("aria-hidden", "false");

    if (pdfModalTitle) pdfModalTitle.textContent = titleText || "PDF";
    if (pdfModalFrame) pdfModalFrame.src = `${url}#view=FitH`;
    if (pdfModalOpenNew) pdfModalOpenNew.href = url;
    if (pdfModalDownload) pdfModalDownload.href = url;
  }

  function closePdfModal(){
    if(!pdfModal) return;

    pdfModal.classList.remove("is-open");
    pdfModal.setAttribute("aria-hidden", "true");
    if (pdfModalFrame) pdfModalFrame.src = "";
  }

  document.querySelectorAll(".js-open-pdf").forEach((btn)=>{
    btn.addEventListener("click", ()=>{
      const url = btn.getAttribute("data-pdf");
      const titleText = btn.getAttribute("data-title") || "PDF";
      if(!url) return;
      openPdfModal(url, titleText);
    });
  });

  document.querySelectorAll('[data-close="pdfModal"]').forEach((el)=>{
    el.addEventListener("click", closePdfModal);
  });

  window.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && pdfModal?.classList.contains("is-open")){
      closePdfModal();
    }
  });

  // ===== If hash changes externally =====
  window.addEventListener("hashchange", ()=>{
    const id = (location.hash || "").replace("#", "");
    if(id && slideIds.includes(id)){
      scrollToSlide(id, true);
      setActiveSlideById(id);
      setActiveNav(id);
      updateIndicator(slideIds.indexOf(id));
    }
  });

  // ===== Allow programs to set inquiry category =====
  function mapInquiryToCategory(key){
    const k = templates[key] ? key : "etc";
    selectCategory(k);
  }

  function selectCategoryFromPrograms(key){
    // move contact + select category
    scrollToSlide("contact", true);
    setTimeout(()=> mapInquiryToCategory(key), 350);
  }

  document.querySelectorAll(".js-go-inquiry").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.getAttribute("data-inquiry") || "etc";
      selectCategoryFromPrograms(k);
    });
  });

})();