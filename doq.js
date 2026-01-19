function $(id) {
  return document.getElementById(id);
}

function setYear() {
  const el = $("year");
  if (el) el.textContent = new Date().getFullYear();
}

async function writeClipboard(text) {
  // modern
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // fallback
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
  const btn1 = $("copyAccount");
  const btn2 = $("copyAccount2");

  const text = accountEl ? accountEl.textContent.trim() : "농협은행 301-6642-7749-61";

  try {
    await writeClipboard(text);

    const prev1 = btn1 ? btn1.textContent : null;
    const prev2 = btn2 ? btn2.textContent : null;

    if (btn1) {
      btn1.textContent = "복사 완료!";
      btn1.disabled = true;
    }
    if (btn2) {
      btn2.textContent = "복사 완료!";
      btn2.disabled = true;
    }

    setTimeout(() => {
      if (btn1 && prev1) {
        btn1.textContent = prev1;
        btn1.disabled = false;
      }
      if (btn2 && prev2) {
        btn2.textContent = prev2;
        btn2.disabled = false;
      }
    }, 1200);
  } catch (e) {
    alert("복사가 안 됐어요. 계좌번호를 직접 드래그해서 복사해 주세요.");
  }
}

function smoothAnchor() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function init() {
  setYear();
  smoothAnchor();

  const btn1 = $("copyAccount");
  if (btn1) btn1.addEventListener("click", copyAccount);

  const btn2 = $("copyAccount2");
  if (btn2) btn2.addEventListener("click", copyAccount);
}

document.addEventListener("DOMContentLoaded", init);
