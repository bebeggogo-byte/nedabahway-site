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

function getSelectedAmount() {
  const active = document.querySelector(".pill.active");
  if (!active) return { type: "once", label: "1만원", value: "10000" };

  const v = active.getAttribute("data-amount");
  if (v === "monthly") return { type: "monthly", label: "정기후원", value: "monthly" };
  if (v === "30000") return { type: "once", label: "3만원", value: "30000" };
  return { type: "once", label: "1만원", value: "10000" };
}

function formatKRW(numString) {
  const n = Number(numString);
  if (!Number.isFinite(n)) return numString;
  return n.toLocaleString("ko-KR") + "원";
}

function buildDonateMessage() {
  const accountNumber = $("accountText") ? $("accountText").textContent.trim() : "301-6642-7749-61";
  const amount = getSelectedAmount();
  const url = window.location.href;

  const amountLine =
    amount.type === "monthly"
      ? "후원 방식: 정기후원(매월)"
      : `후원 금액: ${formatKRW(amount.value)}`;

  return [
    "[네다바웨이 후원 안내]",
    amountLine,
    `후원 계좌: 농협은행 ${accountNumber} (예금주: 네다바웨이)`,
    "",
    "네다바웨이는 2025년 3월 설립된 비영리임의단체입니다.",
    "향후 비영리단체 전환을 준비하며, 더 적극적인 공익 활동을 위해 후원을 요청드립니다.",
    "",
    "후원 문의: nedabah.way@gmail.com",
    `사이트: ${url}`,
  ].join("\n");
}

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

async function copyDonateMessage() {
  const message = buildDonateMessage();
  const btn = $("copyDonateMessage");

  try {
    await writeClipboard(message);

    if (btn) {
      const prev = btn.textContent;
      btn.textContent = "문구 복사됨!";
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = prev;
        btn.disabled = false;
      }, 900);
    }

    showToast("후원 문구가 복사되었습니다");
  } catch (e) {
    alert("복사가 안 됐어요. 아래 문구를 직접 복사해 주세요:\n\n" + message);
  }
}

/**
 * 카톡 보내기 (키 없이 즉시 동작)
 * - 모바일: navigator.share → 공유창에서 카카오톡 선택 가능
 * - PC: 후원 문구 자동 복사 후 안내
 */
async function sendToKakao() {
  const message = buildDonateMessage();

  try {
    if (navigator.share) {
      await navigator.share({
        title: "네다바웨이 후원 안내",
        text: message,
        url: window.location.href,
      });
      return;
    }

    await writeClipboard(message);
    showToast("후원 문구가 복사되었습니다. 카톡에 붙여넣어 보내세요.");
    alert("후원 문구가 복사되었습니다!\n카카오톡을 열어 대화창에 붙여넣어 보내세요.");
  } catch (e) {
    try {
      await writeClipboard(message);
      showToast("후원 문구가 복사되었습니다. 카톡에 붙여넣어 보내세요.");
    } catch (e2) {
      alert("카톡 보내기 실패. 후원문구를 수동으로 복사해 주세요:\n\n" + message);
    }
  }
}

function bindAmountOptions() {
  const pills = document.querySelectorAll(".pill");
  pills.forEach((p) => {
    p.addEventListener("click", () => {
      pills.forEach((x) => x.classList.remove("active"));
      p.classList.add("active");

      const selected = getSelectedAmount();
      if (selected.type === "monthly") {
        showToast("정기후원 문구로 설정됨");
      } else {
        showToast(`후원 금액: ${formatKRW(selected.value)}`);
      }
    });
  });
}

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

function initDonateButtons() {
  const copyBtn = $("copyAccount");
  if (copyBtn) copyBtn.addEventListener("click", copyAccount);

  const copyMsgBtn = $("copyDonateMessage");
  if (copyMsgBtn) copyMsgBtn.addEventListener("click", copyDonateMessage);

  const kakaoBtn = $("kakaoSend");
  if (kakaoBtn) kakaoBtn.addEventListener("click", sendToKakao);

  bindAmountOptions();
}

function init() {
  setYear();
  smoothAnchorHorizontal();
  bindKeyboard();
  bindControls();
  initDonateButtons();
}

document.addEventListener("DOMContentLoaded", init);
