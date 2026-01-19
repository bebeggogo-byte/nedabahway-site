function $(id) {
  return document.getElementById(id);
}

function getSlidesContainer() {
  return document.querySelector(".slides");
}

function getSlides() {
  return Array.from(document.querySelectorAll(".slide"));
}

function setYear() {
  const el = $("year");
  if (el) el.textContent = new Date().getFullYear();
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

async function copyAccount() {
  const accountEl = $("accountText");
  const btn = $("copyAccount");
  const text = accountEl ? accountEl.textContent.trim() : "농협은행 301-6642-7749-61";

  try {
    await writeClipboard(text);

    if (btn) {
      const prev = btn.textContent;
      btn.textContent = "복사 완료!";
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = prev;
        btn.disabled = false;
      }, 1200);
    }
  } catch (e) {
    alert("복사가 안 됐어요. 계좌번호를 직접 드래그해서 복사해 주세요.");
  }
}

/**
 * ✅ 슬라이드 위치 계산
 */
function getCurrentSlideIndex() {
  const scroller = getSlidesContainer();
  const slides = getSlides();
  if (!scroller || slides.length === 0) return 0;

  const x = scroller.scrollLeft;
  const w = scroller.clientWidth;

  // 가장 가까운 슬라이드 인덱스
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

/**
 * ✅ 메뉴 클릭(앵커)을 가로 슬라이드로 이동
 */
function smoothAnchorHorizontal() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      // 슬라이드 컨테이너에서 해당 슬라이드로 이동
      target.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    });
  });
}

/**
 * ✅ 키보드로 한 장씩 넘기기
 * - 좌/우 방향키
 * - PageUp/PageDown
 */
function bindKeyboard() {
  window.addEventListener("keydown", (e) => {
    const key = e.key;

    // 입력 중에는 방해하지 않기
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (key === "ArrowRight" || key === "PageDown") {
      e.preventDefault();
      nextSlide();
    }
    if (key === "ArrowLeft" || key === "PageUp") {
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

  const btn = $("copyAccount");
  if (btn) btn.addEventListener("click", copyAccount);
}

document.addEventListener("DOMContentLoaded", init);
