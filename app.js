const $ = (sel) => document.querySelector(sel);

// Year
$('#year').textContent = new Date().getFullYear();

// Mobile menu
const hamburger = $('#hamburger');
hamburger?.addEventListener('click', () => {
  const isOpen = document.body.classList.toggle('nav-open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

// Smooth scrolling
for (const a of document.querySelectorAll('a[href^="#"]')) {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    const el = document.querySelector(href);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.body.classList.remove('nav-open');
    hamburger?.setAttribute('aria-expanded', 'false');
  });
}

// Copy account
const toast = $('#toast');
const showToast = (msg) => {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1200);
};

$('#copyAccount')?.addEventListener('click', async () => {
  const text = $('#account')?.textContent?.trim() ?? '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('계좌번호가 복사됐어요');
  } catch {
    showToast('복사 실패: 브라우저 설정을 확인해줘');
  }
});
