(() => {
‘use strict’;

// Elements
const main = document.getElementById(‘main’);
const header = document.getElementById(‘header’);
const navItems = Array.from(document.querySelectorAll(’.nav__item’));
const brandHome = document.getElementById(‘brandHome’);
const progressBar = document.getElementById(‘progressBar’);
const menuBtn = document.getElementById(‘menuBtn’);
const mobileMenu = document.getElementById(‘mobileMenu’);
const mobileMenuItems = Array.from(document.querySelectorAll(’.mobile-menu__item’));
const sections = Array.from(document.querySelectorAll(’.section’));
const toast = document.getElementById(‘toast’);

const total = sections.length;

// ============================
// Navigation
// ============================

function goTo(index, smooth = true) {
const section = sections[index];
if (!section) return;

```
const offsetTop = section.offsetTop - header.offsetHeight - 3;

window.scrollTo({
  top: offsetTop,
  behavior: smooth ? 'smooth' : 'auto'
});

setActiveNav(index);
closeMobileMenu();
```

}

function getCurrentSectionIndex() {
const scrollTop = window.scrollY + header.offsetHeight + 100;

```
for (let i = sections.length - 1; i >= 0; i--) {
  if (sections[i].offsetTop <= scrollTop) {
    return i;
  }
}
return 0;
```

}

function setActiveNav(index) {
navItems.forEach((item, i) => {
item.classList.toggle(‘is-active’, i === index);
});
}

function updateProgress() {
const scrollTop = window.scrollY;
const docHeight = document.documentElement.scrollHeight - window.innerHeight;
const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
progressBar.style.width = `${progress}%`;
}

// Navigation click handlers
navItems.forEach((item, index) => {
item.addEventListener(‘click’, () => goTo(index, true));
});

// Brand click = home
brandHome.addEventListener(‘click’, () => goTo(0, true));

// All [data-go] buttons
document.querySelectorAll(’[data-go]’).forEach(btn => {
btn.addEventListener(‘click’, () => {
const index = parseInt(btn.getAttribute(‘data-go’), 10);
if (!isNaN(index)) goTo(index, true);
});
});

// Scroll listener
let scrollTimeout = null;
window.addEventListener(‘scroll’, () => {
if (scrollTimeout) clearTimeout(scrollTimeout);
scrollTimeout = setTimeout(() => {
const index = getCurrentSectionIndex();
setActiveNav(index);
updateProgress();
}, 50);
});

// ============================
// Mobile Menu
// ============================

function openMobileMenu() {
menuBtn.classList.add(‘is-open’);
mobileMenu.classList.add(‘is-open’);
document.body.style.overflow = ‘hidden’;
}

function closeMobileMenu() {
menuBtn.classList.remove(‘is-open’);
mobileMenu.classList.remove(‘is-open’);
document.body.style.overflow = ‘’;
}

function toggleMobileMenu() {
if (mobileMenu.classList.contains(‘is-open’)) {
closeMobileMenu();
} else {
openMobileMenu();
}
}

menuBtn.addEventListener(‘click’, toggleMobileMenu);

mobileMenuItems.forEach((item, index) => {
item.addEventListener(‘click’, () => goTo(index, true));
});

// Close on resize to desktop
window.addEventListener(‘resize’, () => {
if (window.innerWidth >= 768) {
closeMobileMenu();
}
});

// ============================
// Programs → Contact
// ============================

const programCards = Array.from(document.querySelectorAll(’.program-card’));

programCards.forEach(card => {
card.addEventListener(‘click’, () => {
const cat = card.getAttribute(‘data-contact’) || ‘etc’;
goTo(4, true);
setTimeout(() => selectCategory(cat), 400);
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
document.body.style.overflow = ‘’; // Fixed: was ‘hidden’
}

document.querySelectorAll(’[data-open-pdf]’).forEach(btn => {
btn.addEventListener(‘click’, () => {
const url = btn.getAttribute(‘data-open-pdf’);
if (url) openModal(url);
});
});

modalBackdrop.addEventListener(‘click’, closeModal);
modalClose.addEventListener(‘click’, closeModal);
modalOpenNew.addEventListener(‘click’, () => {
if (currentPdfUrl) window.open(currentPdfUrl, ‘_blank’);
});

window.addEventListener(‘keydown’, e => {
if (e.key === ‘Escape’) {
if (modal.classList.contains(‘is-open’)) {
closeModal();
}
if (mobileMenu.classList.contains(‘is-open’)) {
closeMobileMenu();
}
}
});

// ============================
// Contact Draft
// ============================

const subjectEl = document.getElementById(‘mailSubject’);
const bodyEl = document.getElementById(‘mailBody’);
const copySubjectBtn = document.getElementById(‘copySubject’);
const copyBodyBtn = document.getElementById(‘copyBody’);
const openMailBtn = document.getElementById(‘openMailApp’);
const catBtns = Array.from(document.querySelectorAll(’.category-tab’));

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
catBtns.forEach(btn => {
btn.classList.toggle(‘is-active’, btn.dataset.cat === cat);
});
const draft = drafts[cat] || drafts.etc;
subjectEl.textContent = draft.subject;
bodyEl.textContent = draft.body;
}

catBtns.forEach(btn => {
btn.addEventListener(‘click’, () => selectCategory(btn.dataset.cat));
});

// ============================
// Copy & Toast
// ============================

function showToast(message = ‘복사되었습니다’) {
toast.textContent = message;
toast.classList.add(‘is-show’);
setTimeout(() => {
toast.classList.remove(‘is-show’);
}, 2000);
}

async function copyText(text) {
try {
await navigator.clipboard.writeText(text);
return true;
} catch (e) {
// Fallback
const ta = document.createElement(‘textarea’);
ta.value = text;
ta.style.position = ‘fixed’;
ta.style.opacity = ‘0’;
document.body.appendChild(ta);
ta.select();
const ok = document.execCommand(‘copy’);
document.body.removeChild(ta);
return ok;
}
}

copySubjectBtn.addEventListener(‘click’, async () => {
const ok = await copyText(subjectEl.textContent || ‘’);
if (ok) showToast(‘제목이 복사되었습니다’);
});

copyBodyBtn.addEventListener(‘click’, async () => {
const ok = await copyText(bodyEl.textContent || ‘’);
if (ok) showToast(‘본문이 복사되었습니다’);
});

openMailBtn.addEventListener(‘click’, () => {
const subject = encodeURIComponent(subjectEl.textContent || ‘’);
const body = encodeURIComponent(bodyEl.textContent || ‘’);
const mailto = `mailto:${MAIL_TO}?subject=${subject}&body=${body}`;
window.location.href = mailto;
});

// ============================
// Keyboard Navigation
// ============================

document.addEventListener(‘keydown’, e => {
// Arrow keys for section navigation (when not in input)
if (document.activeElement.tagName === ‘INPUT’ ||
document.activeElement.tagName === ‘TEXTAREA’) {
return;
}

```
if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
  e.preventDefault();
  const current = getCurrentSectionIndex();
  if (current < total - 1) goTo(current + 1, true);
}

if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
  e.preventDefault();
  const current = getCurrentSectionIndex();
  if (current > 0) goTo(current - 1, true);
}
```

});

// ============================
// Intersection Observer for Animations
// ============================

const observerOptions = {
root: null,
rootMargin: ‘0px’,
threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
entry.target.style.opacity = ‘1’;
entry.target.style.transform = ‘translateY(0)’;
}
});
}, observerOptions);

// Observe content blocks
document.querySelectorAll(’.content-block, .info-card, .program-card, .resource-card’).forEach(el => {
el.style.opacity = ‘0’;
el.style.transform = ‘translateY(20px)’;
el.style.transition = ‘opacity 0.5s ease, transform 0.5s ease’;
observer.observe(el);
});

// ============================
// Initial State
// ============================

selectCategory(‘church’);
updateProgress();

// Set initial active nav based on scroll position
const initialIndex = getCurrentSectionIndex();
setActiveNav(initialIndex);

})();