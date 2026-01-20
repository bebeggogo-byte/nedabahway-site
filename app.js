(function () {
  const slides = document.getElementById("slides");
  const navButtons = document.querySelectorAll("[data-goto]");
  const desktopNav = document.querySelectorAll(".nav--desktop .nav__btn");
  const mobileTabs = document.querySelectorAll(".tabbar .tab");

  function getSlideById(id) {
    return document.getElementById(id);
  }

  function scrollToSlide(id) {
    const target = getSlideById(id);
    if (!target) return;

    // Scroll horizontally to the slide
    target.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest"
    });

    // Focus for accessibility
    target.focus({ preventScroll: true });

    setActive(id);
  }

  function setActive(id) {
    // Desktop nav active
    desktopNav.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.goto === id);
    });

    // Mobile tab active
    mobileTabs.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.goto === id);
    });
  }

  // Click handlers
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.goto;
      if (!id) return;
      scrollToSlide(id);
    });
  });

  // Detect active slide on scroll
  function updateActiveOnScroll() {
    const slideEls = Array.from(document.querySelectorAll(".slide"));
    const containerRect = slides.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;

    let bestId = "home";
    let bestDist = Infinity;

    for (const s of slideEls) {
      const r = s.getBoundingClientRect();
      const slideCenter = r.left + r.width / 2;
      const dist = Math.abs(slideCenter - centerX);

      if (dist < bestDist) {
        bestDist = dist;
        bestId = s.id;
      }
    }

    setActive(bestId);
  }

  let ticking = false;
  slides.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateActiveOnScroll();
      ticking = false;
    });
  });

  // Keyboard navigation (desktop)
  window.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

    const slideEls = Array.from(document.querySelectorAll(".slide"));
    const activeId =
      document.querySelector(".nav--desktop .nav__btn.is-active")?.dataset.goto ||
      document.querySelector(".tabbar .tab.is-active")?.dataset.goto ||
      "home";

    const currentIndex = slideEls.findIndex((s) => s.id === activeId);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") nextIndex = Math.min(currentIndex + 1, slideEls.length - 1);
    if (e.key === "ArrowLeft") nextIndex = Math.max(currentIndex - 1, 0);

    scrollToSlide(slideEls[nextIndex].id);
  });

  // Initial
  setActive("home");
})();