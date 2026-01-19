(() => {
‘use strict’;

// ============================
// Elements
// ============================
const deck = document.getElementById(‘deck’);
const navTabs = Array.from(document.querySelectorAll(’.nav__tab’));
const progressBar = document.getElementById(‘progressBar’);
const logoBtn = document.getElementById(‘logoBtn’);
const searchBtn = document.getElementById(‘searchBtn’);
const menuBtn = document.getElementById(‘menuBtn’);
const closeMenuBtn = document.getElementById(‘closeMenuBtn’);
const slideMenu = document.getElementById(‘slideMenu’);
const slideMenuItems = Array.from(document.querySelectorAll(’.slide-menu__item’));
const overlay = document.getElementById(‘overlay’);
const toast = document.getElementById(‘toast’);
const toastText = document.getElementById(‘toastText’);

const pages = Array.from(document.querySelectorAll(’.page’));
const totalPages = pages.length;

// ============================
// Navigation
// ============================

function goToPage(index, smooth = true) {
const clampedIndex = Math.max(0, Math.min(totalPages - 1, index));
const scrollLeft = clampedIndex * deck.offsetWidth;

```
deck.scrollTo({
  left: scrollLeft,
  behavior: smooth ? 'smooth' : 'auto'
});

updateActiveTab(clampedIndex);
updateProgress(clampedIndex);
```

}

function getCurrentPageIndex() {
const scrollLeft = deck.scrollLeft;
const pageWidth = deck.offsetWidth;
return Math.round(scrollLeft / pageWidth);
}

function updateActiveTab(index) {
navTabs.forEach((tab, i) => {
tab.classList.toggle(‘is-active’, i === index);
});
}

function updateProgress(index) {
const progress = ((index + 1) / totalPages) * 100;
progressBar.style.width = `${progress}%`;
}

// Nav tab clicks
navTabs.forEach((tab) => {
tab.addEventListener(‘click’, () => {
const index = parseInt(tab.dataset.index, 10);
if (!isNaN(index)) {
goToPage(index, true);
addClickEffect(tab);
}
});
});

// Logo click = home
logoBtn.addEventListener(‘click’, () => {
goToPage(0, true);
addClickEffect(logoBtn);
});

// All [data-go] buttons
document.querySelectorAll(’[data-go]’).forEach(btn => {
btn.addEventListener(‘click’, () => {
const index = parseInt(btn.dataset.go, 10);
if (!isNaN(index)) {
goToPage(index, true);
addClickEffect(btn);
}
});
});

// Deck scroll sync
let scrollTimeout = null;
deck.addEventListener(‘scroll’, () => {
if (scrollTimeout) clearTimeout(scrollTimeout);
scrollTimeout = setTimeout(() => {
const index = getCurrentPageIndex();
updateActiveTab(index);
updateProgress(index);
}, 50);
});

// ============================
// Slide Menu
// ============================

function openMenu() {
slideMenu.classList.add(‘is-open’);
overlay.classList.add(‘is-open’);
document.body.style.overflow = ‘hidden’;
}

function closeMenu() {
slideMenu.classList.remove(‘is-open’);
overlay.classList.remove(‘is-open’);
document.body.style.overflow = ‘’;
}

menuBtn.addEventListener(‘click’, () => {
openMenu();
addClickEffect(menuBtn);
});

closeMenuBtn.addEventListener(‘click’, () => {
closeMenu();
addClickEffect(closeMenuBtn);
});

overlay.addEventListener(‘click’, closeMenu);

slideMenuItems.forEach(item => {
item.addEventListener(‘click’, () => {
const index = parseInt(item.dataset.index, 10);
if (!isNaN(index)) {
closeMenu();
setTimeout(() => goToPage(index, true), 100);
}
addClickEffect(item);
});
});

// Search button (placeholder action)
searchBtn.addEventListener(‘click’, () => {
showToast(‘검색 기능 준비중입니다’);
addClickEffect(searchBtn);
});

// ============================
// Programs → Contact
// ============================

document.querySelectorAll(’.program-card’).forEach(card => {
card.addEventListener(‘click’, () => {
const cat = card.dataset.contact || ‘etc’;
goToPage(4, true);
setTimeout(() => selectCategory(cat), 400);
addClickEffect(card);
});
});

// ============================
// Steps (detail view placeholder)
// ============================

document.querySelectorAll(’.step’).forEach(step => {
step.addEventListener(‘click’, () => {
const stepNum = step.dataset.step;
showToast(`${stepNum}단계 상세보기 준비중`);
addClickEffect(step);
});
});

// ============================
// Info Cards (interaction)
// ============================

document.querySelectorAll(’.info-card’).forEach(card => {
card.addEventListener(‘click’, () => {
const value = card.querySelector(’.info-card__value’)?.textContent || ‘’;
showToast(value);
addClickEffect(card);
});
});

// ============================
// Box Cards (interaction)
// ============================

document.querySelectorAll(’.box’).forEach(box => {
box.addEventListener(‘click’, () => {
const title = box.querySelector(’.box__title’)?.textContent || ‘’;
showToast(`"${title}" 섹션`);
addClickEffect(box);
});
});

// ============================
// PDF Modal
// ============================

const modal = document.getElementById(‘pdfModal’);
const modalBackdrop = document.getElementById(‘modalBackdrop’);
const modalClose = document.getElementById(‘modalClose’);
const modalFrame = document.getElementById(‘modalFrame’);
const modalTitle = document.getElementById(‘modalTitle’);
const modalOpenNew = document.getElementById(‘modalOpenNew’);

let currentPdfUrl = ‘’;

function openModal(url) {
currentPdfUrl = url;
modal.classList.add(‘is-open’);
modal.setAttribute(‘aria-hidden’, ‘false’);
modalFrame.src = url;
modalTitle.textContent = ‘PDF 보기’;
document.body.style.overflow = ‘hidden’;
}

function closeModal() {
modal.classList.remove(‘is-open’);
modal.setAttribute(‘aria-hidden’, ‘true’);
modalFrame.src = ‘’;
document.body.style.overflow = ‘’;
}

document.querySelectorAll(’[data-open-pdf]’).forEach(btn => {
btn.addEventListener(‘click’, (e) => {
e.stopPropagation();
const url = btn.dataset.openPdf;
if (url) openModal(url);
addClickEffect(btn);
});
});

// Resource cards (same as data-open-pdf but for entire card)
document.querySelectorAll(’.resource-card’).forEach(card => {
if (card.dataset.openPdf) {
card.addEventListener(‘click’, () => {
const url = card.dataset.openPdf;
if (url) openModal(url);
addClickEffect(card);
});
}
});

modalBackdrop.addEventListener(‘click’, closeModal);
modalClose.addEventListener(‘click’, () => {
closeModal();
addClickEffect(modalClose);
});

modalOpenNew.addEventListener(‘click’, () => {
if (currentPdfUrl) window.open(currentPdfUrl, ‘_blank’);
addClickEffect(modalOpenNew);
});

// ============================
// Contact Draft
// ============================

const subjectEl = document.getElementById(‘mailSubject’);
const bodyEl = document.getElementById(‘mailBody’);
const copySubjectBtn = document.getElementById(‘copySubject’);
const copyBodyBtn = document.getElementById(‘copyBody’);
const openMailBtn = document.getElementById(‘openMailApp’);
const categoryTabs = Array.from(document.querySelectorAll(’.category-tab’));

const MAIL_TO = ‘nedabah.way@gmail.com’;

const drafts = {
church: {
subject: ‘[문의] 교회 세미나 / 말씀읽기 중심’,
body: `안녕하세요, 네다바웨이 팀께 문의드립니다.

교회(또는 공동체) 상황에 맞춘 “말씀읽기 중심” 세미나를 요청드립니다.

- 교회/팀:
- 대상:
- 희망 일정:
- 원하는 방향(말씀읽기 / 적용 / 동행 등):
- 기타 참고:

감사합니다.`}, sbm: { subject: '[문의] SBM 진행 요청', body:`안녕하세요, 네다바웨이 팀께 문의드립니다.

말씀읽기가 하나님과의 “사귐”으로 이어지도록 SBM 진행을 요청드립니다.

- 교회/팀:
- 대상:
- 희망 일정:
- 진행 방식(세미나/모임/코칭):
- 현재 고민(간단히):

감사합니다.`}, ai: { subject: '[문의] 생성형 AI 워크숍 요청', body:`안녕하세요, 네다바웨이 팀께 문의드립니다.

현장에서 바로 쓰는 방식으로 생성형 AI 워크숍을 요청드립니다.

- 조직/팀:
- 대상:
- 희망 일정:
- 원하는 결과물(예: 문서/워크시트/프로세스):
- 현재 상황(간단히):

감사합니다.`}, team: { subject: '[문의] 조직 소통·협업 워크숍 요청', body:`안녕하세요, 네다바웨이 팀께 문의드립니다.

조직 내 소통/협업 이슈를 감정이 아니라 “구조”로 정리해보고 싶습니다.
현장 적용까지 이어지는 워크숍 제안을 요청드립니다.

- 조직/팀:
- 현재 병목:
- 희망 진행 방식(강의/워크숍/코칭):
- 희망 일정:

감사합니다.`}, etc: { subject: '[문의] 기타 문의', body:`안녕하세요, 네다바웨이 팀께 문의드립니다.

아래 내용으로 문의드립니다.

- 내용:
- 희망 일정:
- 참고사항:

감사합니다.`
}
};

function selectCategory(cat) {
categoryTabs.forEach(tab => {
tab.classList.toggle(‘is-active’, tab.dataset.cat === cat);
});
const draft = drafts[cat] || drafts.etc;
subjectEl.textContent = draft.subject;
bodyEl.textContent = draft.body;
}

categoryTabs.forEach(tab => {
tab.addEventListener(‘click’, () => {
selectCategory(tab.dataset.cat);
addClickEffect(tab);
});
});

copySubjectBtn.addEventListener(‘click’, async () => {
const ok = await copyText(subjectEl.textContent || ‘’);
if (ok) showToast(‘제목이 복사되었습니다’);
addClickEffect(copySubjectBtn);
});

copyBodyBtn.addEventListener(‘click’, async () => {
const ok = await copyText(bodyEl.textContent || ‘’);
if (ok) showToast(‘본문이 복사되었습니다’);
addClickEffect(copyBodyBtn);
});

openMailBtn.addEventListener(‘click’, () => {
const subject = encodeURIComponent(subjectEl.textContent || ‘’);
const body = encodeURIComponent(bodyEl.textContent || ‘’);
window.location.href = `mailto:${MAIL_TO}?subject=${subject}&body=${body}`;
addClickEffect(openMailBtn);
});

// ============================
// Copy & Toast
// ============================

async function copyText(text) {
try {
await navigator.clipboard.writeText(text);
return true;
} catch (e) {
// Fallback
const ta = document.createElement(‘textarea’);
ta.value = text;
ta.style.cssText = ‘position:fixed;opacity:0;’;
document.body.appendChild(ta);
ta.select();
const ok = document.execCommand(‘copy’);
document.body.removeChild(ta);
return ok;
}
}

function showToast(message = ‘완료되었습니다’) {
toastText.textContent = message;
toast.classList.add(‘is-show’);
setTimeout(() => {
toast.classList.remove(‘is-show’);
}, 2200);
}

// ============================
// Click Effect (ripple-like)
// ============================

function addClickEffect(el) {
el.style.transform = ‘scale(0.96)’;
setTimeout(() => {
el.style.transform = ‘’;
}, 150);
}

// ============================
// Keyboard Navigation
// ============================

document.addEventListener(‘keydown’, (e) => {
// Close modals on ESC
if (e.key === ‘Escape’) {
if (modal.classList.contains(‘is-open’)) {
closeModal();
}
if (slideMenu.classList.contains(‘is-open’)) {
closeMenu();
}
}

```
// Arrow navigation
if (document.activeElement.tagName === 'INPUT' ||
    document.activeElement.tagName === 'TEXTAREA') {
  return;
}

if (e.key === 'ArrowRight') {
  e.preventDefault();
  const current = getCurrentPageIndex();
  if (current < totalPages - 1) goToPage(current + 1, true);
}

if (e.key === 'ArrowLeft') {
  e.preventDefault();
  const current = getCurrentPageIndex();
  if (current > 0) goToPage(current - 1, true);
}
```

});

// ============================
// Touch Swipe Enhancement
// ============================

let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;

deck.addEventListener(‘touchstart’, (e) => {
touchStartX = e.touches[0].clientX;
touchStartY = e.touches[0].clientY;
isSwiping = true;
}, { passive: true });

deck.addEventListener(‘touchmove’, (e) => {
if (!isSwiping) return;
const dx = Math.abs(e.touches[0].clientX - touchStartX);
const dy = Math.abs(e.touches[0].clientY - touchStartY);

```
// If horizontal swipe is dominant, let it through
if (dx > dy && dx > 10) {
  // Horizontal swipe - default behavior is fine
}
```

}, { passive: true });

deck.addEventListener(‘touchend’, () => {
isSwiping = false;
}, { passive: true });

// ============================
// Resize Handler
// ============================

let resizeTimeout = null;
window.addEventListener(‘resize’, () => {
if (resizeTimeout) clearTimeout(resizeTimeout);
resizeTimeout = setTimeout(() => {
const index = getCurrentPageIndex();
goToPage(index, false);
}, 100);
});

// ============================
// Initialize
// ============================

function init() {
selectCategory(‘church’);
updateProgress(0);
goToPage(0, false);

```
// Animate elements on load
document.querySelectorAll('.content-card, .info-card, .program-card, .resource-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  setTimeout(() => {
    el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, 100 + (i * 50));
});
```

}

init();

})();