(function () {
  const slider = document.getElementById("slider");
  const navButtons = Array.from(document.querySelectorAll(".kw-item"));
  const slides = Array.from(document.querySelectorAll(".slide"));

  function getSlideById(id) {
    return slides.find((s) => s.id === id);
  }

  function setActiveNav(id) {
    navButtons.forEach((btn) => {
      const isActive = btn.dataset.target === id;
      btn.classList.toggle("is-active", isActive);
      if (isActive) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.removeAttribute("aria-current");
      }
    });
  }

  function scrollToSlide(id, smooth = true) {
    const target = getSlideById(id);
    if (!target) return;

    const left = target.offsetLeft;
    slider.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });

    // URL 해시도 맞춰주기(원하면 지워도 됨)
    history.replaceState(null, "", `#${id}`);
    setActiveNav(id);
  }

  // 1) 상단 키워드/아이콘 네비게이션 클릭 이동
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.target;
      scrollToSlide(id, true);
    });
  });

  // 2) 내부 버튼(data-jump)도 슬라이드 이동
  document.querySelectorAll("[data-jump]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-jump");
      scrollToSlide(id, true);
    });
  });

  // 3) 스와이프/가로 넘김 시 현재 슬라이드 감지 → 네비 활성화
  // IntersectionObserver: slider 내부에서 가장 많이 보이는 slide 감지
  const io = new IntersectionObserver(
    (entries) => {
      // 가장 많이 보이는 슬라이드 찾기
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const id = visible.target.id;
      setActiveNav(id);
      history.replaceState(null, "", `#${id}`);
    },
    {
      root: slider,
      threshold: [0.55, 0.7, 0.85],
    }
  );

  slides.forEach((s) => io.observe(s));

  // 4) 초기 진입 시 해시가 있으면 해당 슬라이드로
  const initialHash = (location.hash || "").replace("#", "");
  if (initialHash && getSlideById(initialHash)) {
    // 렌더 후 이동
    requestAnimationFrame(() => scrollToSlide(initialHash, false));
  } else {
    setActiveNav("home");
  }

  // 5) 데스크탑에서 휠(세로 스크롤)을 가로 넘김처럼 느끼게 보정(선택)
  // 원치 않으면 이 부분 통째로 지워도 됨.
  slider.addEventListener(
    "wheel",
    (e) => {
      // 슬라이드 내부 세로 스크롤이 가능한 경우는 우선 세로 스크롤 허용
      // 단, "맨 위/맨 아래"에서만 가로 이동 보조
      const active = slides.find((s) => s.id === (location.hash || "#home").slice(1)) || slides[0];
      const canScrollY = active.scrollHeight > active.clientHeight;
      if (canScrollY) {
        const atTop = active.scrollTop <= 0;
        const atBottom = active.scrollTop + active.clientHeight >= active.scrollHeight - 1;

        // 세로로 더 못 움직일 때만 가로 이동
        if (!(atTop || atBottom)) return;
      }

      // trackpad/mouse wheel을 "가로 이동"으로
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        slider.scrollLeft += e.deltaY;
      }
    },
    { passive: false }
  );
})();