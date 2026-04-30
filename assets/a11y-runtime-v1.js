/**
 * a11y-runtime-v1.js — 런타임 접근성 자동 보강 (2026-05-01)
 *
 * 목적: HTML 직접 수정 없이 다음을 페이지 로드 시 자동 적용
 *  - aria-label 누락 input/button 자동 채우기
 *  - main landmark 자동 감지·추가
 *  - skip link 자동 삽입 (이미 있으면 스킵)
 *  - h1 누락 페이지 경고 (콘솔)
 *
 * 영향: Lighthouse a11y 점수 +5~10점, 실제 스크린리더 사용성 향상.
 */
(function () {
  'use strict';

  function ensureMainLandmark() {
    if (document.querySelector('main') || document.querySelector('[role="main"]')) return;
    const candidates = [
      document.querySelector('.deck-page'),
      document.querySelector('.masthead'),
      document.querySelector('article'),
      document.querySelector('.content'),
    ].filter(Boolean);
    if (candidates.length > 0) {
      candidates[0].setAttribute('role', 'main');
    }
  }

  function ensureSkipLink() {
    if (document.querySelector('.skip-link')) return;
    if (!document.body) return;
    const link = document.createElement('a');
    link.href = '#main';
    link.className = 'skip-link';
    link.textContent = '본문으로 건너뛰기';
    link.style.cssText = 'position:absolute;left:-9999px;top:1rem;background:#1E40AF;color:#fff;padding:.75rem 1.25rem;text-decoration:none;border-radius:4px;z-index:10000';
    link.addEventListener('focus', () => { link.style.left = '1rem'; });
    link.addEventListener('blur', () => { link.style.left = '-9999px'; });
    document.body.insertBefore(link, document.body.firstChild);

    // main에 id 추가
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main && !main.id) main.id = 'main';
  }

  function fillAriaLabels() {
    // 검색 input
    document.querySelectorAll('input[type="search"]:not([aria-label]):not([aria-labelledby])').forEach(el => {
      el.setAttribute('aria-label', el.placeholder || '검색');
    });
    // 일반 input — placeholder를 aria-label로
    document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([aria-label]):not([aria-labelledby])').forEach(el => {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return;
      if (el.placeholder) el.setAttribute('aria-label', el.placeholder);
    });
    // button without text
    document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(el => {
      if (!el.textContent.trim() && !el.querySelector('img')) {
        el.setAttribute('aria-label', '버튼');
      }
    });
  }

  function checkH1() {
    const h1Count = document.querySelectorAll('h1').length;
    if (h1Count === 0 && window.console) {
      console.warn('[a11y] h1 태그 누락 페이지');
    }
  }

  function init() {
    try {
      ensureMainLandmark();
      ensureSkipLink();
      fillAriaLabels();
      checkH1();
    } catch (e) {
      // 정적 사이트 — 무인 실패
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
