
(function () {
  const toggleBtn = document.getElementById("navToggle");
  const mobileNav = document.getElementById("navMobile");

  function openMobileNav() {
    toggleBtn.setAttribute("aria-expanded", "true");
    mobileNav.classList.add("open");
    mobileNav.setAttribute("aria-hidden", "false");
  }

  function closeMobileNav() {
    toggleBtn.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("open");
    mobileNav.setAttribute("aria-hidden", "true");
  }

  toggleBtn?.addEventListener("click", () => {
    const expanded = toggleBtn.getAttribute("aria-expanded") === "true";
    if (expanded) closeMobileNav();
    else openMobileNav();
  });

  // Close mobile nav on click
  mobileNav?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.matches("a")) {
      closeMobileNav();
    }
  });

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileNav();
  });
})();