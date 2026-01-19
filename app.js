(function () {
  const slider = document.getElementById("slider");
  const navButtons = Array.from(document.querySelectorAll(".kw-item"));
  const slides = Array.from(document.querySelectorAll(".slide"));

  const indicatorActive = document.getElementById("indicatorActive");
  const indicatorDots = document.getElementById("indicatorDots");

  function getSlideById(id) {
    return slides.find((s) => s.id === id);
  }

  function setActiveNav(id) {
    navButtons.forEach((btn) => {
      const isActive = btn.dataset.target === id;
      btn.classList.toggle("is-active", isActive);
      if (isActive) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }

  function updateIndicator(index) {
    const total = slides.length;
    const widthPct = 100 / total;
    indicatorActive.style.width = `${widthPct}%`;
    indicatorActive.style.transform = `translateX(${index * 100}%)`;

    // dots
    const dots = Array.from(indicatorDots.querySelectorAll(".dot"));
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
  }

  // 인디케이터 dots 생성
  function buildDots() {
    indicatorDots.innerHTML = "";
    slides.forEach(() => {
      const d = document.createElement("span");
      d.className = "dot";
      indicatorDots.appendChild(d);
    });
  }

  function getActiveIndexByScroll() {
    const scrollLeft = slider.scrollLeft;
    const width = slider.clientWidth;
    return Math.round(scrollLeft / width);
  }

  function scrollToSlide(id, smooth = true) {
    const target = getSlideById(id);
    if (!target) return;

    const left = target.offsetLeft;
    slider.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    history.replaceState(null, "", `#${id}`);
    setActiveNav(id);

    const idx = slides.findIndex((s) => s.id === id);
    if (idx >= 0) updateIndicator(idx);
  }

  // ✅ 탄성 느낌(부드러운 스냅 보정)
  function animateSnapToNearest() {
    const targetIndex = getActiveIndexByScroll();
    const targetSlide = slides[targetIndex];
    if (!targetSlide) return;

    const start = slider.scrollLeft;
    const end = targetSlide.offsetLeft;

    // 너무 가까우면 그냥 이동하지 않음
    if (Math.abs(end - start) < 2) return;

    const duration = 420;
    const startTime = performance.now();

    // easing: 살짝 튕기는 느낌 (과하지 않게)
    function easeOutBack(t) {
      const c1 = 1.25;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutBack(t);
      slider.scrollLeft = start + (end - start) * eased;
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // 1) 상단 아이콘 네비 클릭 이동
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.target;
      scrollToSlide(id, true);
    });
  });

  // 2) 내부 버튼(data-jump) 이동
  document.querySelectorAll("[data-jump]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-jump");
      scrollToSlide(id, true);
    });
  });

  // 3) 스와이프/가로 넘김 시 현재 슬라이드 감지 → 네비 활성화
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const id = visible.target.id;
      setActiveNav(id);
      history.replaceState(null, "", `#${id}`);

      const idx = slides.findIndex((s) => s.id === id);
      if (idx >= 0) updateIndicator(idx);
    },
    { root: slider, threshold: [0.55, 0.7, 0.85] }
  );
  slides.forEach((s) => io.observe(s));

  // 4) 스크롤 멈추면(가로 이동 후) 스냅 보정 애니메이션
  let snapTimer = null;
  slider.addEventListener("scroll", () => {
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      animateSnapToNearest();
    }, 120);
  });

  // 5) 데스크탑 휠(세로)을 가로처럼
  slider.addEventListener(
    "wheel",
    (e) => {
      const activeId = (location.hash || "#home").slice(1);
      const active = getSlideById(activeId) || slides[0];
      const canScrollY = active && active.scrollHeight > active.clientHeight;

      // 슬라이드 내부 세로 스크롤 여지가 있으면 우선 허용
      if (canScrollY) {
        const atTop = active.scrollTop <= 0;
        const atBottom = active.scrollTop + active.clientHeight >= active.scrollHeight - 1;
        if (!(atTop || atBottom)) return;
      }

      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        slider.scrollLeft += e.deltaY;
      }
    },
    { passive: false }
  );

  // ===== 문의 폼(카테고리 6개 + 초안 생성) =====
  const catButtons = Array.from(document.querySelectorAll(".cat-btn"));
  const mailSubject = document.getElementById("mailSubject");
  const mailBody = document.getElementById("mailBody");
  const copySubjectBtn = document.getElementById("copySubject");
  const copyBodyBtn = document.getElementById("copyBody");
  const openMailAppBtn = document.getElementById("openMailApp");

  const TO_EMAIL = "nedabah.way@gmail.com";

  const templates = {
    seminar: {
      subject: "[네다바웨이] 교회 세미나 문의",
      body:
`안녕하세요. 네다바웨이에 교회 세미나 문의드립니다.

1) 교회/기관명:
2) 희망 주제(예: 말씀읽기, 묵상 가이드, 공동체 나눔 구조 등):
3) 대상(예: 청년부/리더/전교인 등):
4) 희망 일정 및 시간:
5) 진행 형태(대면/온라인):
6) 참고할 상황/요청사항:

확인 후 안내 부탁드립니다.
감사합니다.`
    },
    sbm: {
      subject: "[네다바웨이] SBM 진행 문의",
      body:
`안녕하세요. SBM(Self Bible Meditation Maturity) 진행 문의드립니다.

1) 공동체/모임명:
2) 참여 인원:
3) 희망 기간/횟수:
4) 현재 상황(묵상/나눔에서 막히는 지점):
5) 기대하는 방향:

가능하다면 간단한 진행 방식과 준비 사항도 함께 안내 부탁드립니다.
감사합니다.`
    },
    ai: {
      subject: "[네다바웨이] 생성형 AI 워크숍 문의",
      body:
`안녕하세요. 생성형 AI 활용 워크숍 문의드립니다.

1) 기관/조직명:
2) 대상:
3) 워크숍 목표(예: 실무 적용, 결과물 도출 등):
4) 희망 일정/시간:
5) 진행 형태(대면/온라인):
6) 필요하신 결과물/워크시트 형태:

가능한 구성과 준비물 안내 부탁드립니다.
감사합니다.`
    },
    org: {
      subject: "[네다바웨이] 조직 소통·협업 워크숍 문의",
      body:
`안녕하세요. 조직 소통·협업 워크숍 문의드립니다.

1) 기관/조직명:
2) 참여 인원:
3) 현재 가장 어려운 지점(예: 협업 병목/오해/역할 갈등 등):
4) 희망 일정/시간:
5) 진행 형태(대면/온라인):

현장 적용 방식(규칙/스크립트/실행룰) 중심으로 가능한지 확인 부탁드립니다.
감사합니다.`
    },
    collab: {
      subject: "[네다바웨이] 협력/동역 제안",
      body:
`안녕하세요. 네다바웨이에 협력/동역 제안을 드립니다.

1) 제안자(이름/기관):
2) 협력하고 싶은 방향:
3) 기대하는 형태(세미나/모임/프로젝트/자료 등):
4) 가능한 일정:

검토 후 연락 부탁드립니다.
감사합니다.`
    },
    etc: {
      subject: "[네다바웨이] 기타 문의",
      body:
`안녕하세요. 네다바웨이에 문의드립니다.

문의 내용:
(자유롭게 작성해 주세요)

확인 후 안내 부탁드립니다.
감사합니다.`
    }
  };

  function setCategory(catKey) {
    catButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.cat === catKey));
    const tpl = templates[catKey] || templates.etc;
    mailSubject.value = tpl.subject;
    mailBody.value = tpl.body;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // clipboard 권한이 막혔을 때 fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    }
  }

  catButtons.forEach((btn) => {
    btn.addEventListener("click", () => setCategory(btn.dataset.cat));
  });

  copySubjectBtn?.addEventListener("click", async () => {
    await copyText(mailSubject.value || "");
  });

  copyBodyBtn?.addEventListener("click", async () => {
    await copyText(mailBody.value || "");
  });

  openMailAppBtn?.addEventListener("click", () => {
    const subject = encodeURIComponent(mailSubject.value || "");
    const body = encodeURIComponent(mailBody.value || "");
    const mailto = `mailto:${TO_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  });

  // ===== 초기 로딩 =====
  buildDots();

  const initialHash = (location.hash || "").replace("#", "");
  if (initialHash && getSlideById(initialHash)) {
    requestAnimationFrame(() => scrollToSlide(initialHash, false));
  } else {
    setActiveNav("home");
    updateIndicator(0);
  }

  // 문의 기본 선택값
  setCategory("seminar");
})();