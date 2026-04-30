/**
 * learning-all-link-v1.js — 학습노트 페이지에 "전체보기" 링크 동적 삽입 (2026-05-01)
 *
 * 동작:
 *  1. /learning.html에서만 발동
 *  2. .recent 섹션 헤더 옆에 "전체 100편 보기 →" 링크 추가
 *  3. 페이지 우상단 floating 아이콘으로도 표시
 */
(function () {
  'use strict';

  const path = window.location.pathname;
  if (!(path === '/learning.html' || path === '/learning' || path.endsWith('/learning.html'))) {
    return;
  }

  function init() {
    // 1. .recent 섹션의 h2 옆에 인라인 링크 삽입
    const recentSection = document.querySelector('.recent');
    if (recentSection) {
      const h2 = recentSection.querySelector('h2');
      if (h2 && !h2.querySelector('.all-link')) {
        const link = document.createElement('a');
        link.href = '/learning/all.html';
        link.className = 'all-link';
        link.style.cssText =
          'float:right;font-size:13px;font-weight:600;color:#1E40AF;' +
          'text-decoration:none;letter-spacing:-.01em;text-transform:none;' +
          'display:inline-flex;align-items:center;gap:4px';
        link.innerHTML = '전체 100편 보기 <span aria-hidden="true">→</span>';
        h2.appendChild(link);
      }

      // 2. .recent 섹션 하단에도 큰 카드형 링크
      const recentList = document.getElementById('recent-list');
      if (recentList && !document.getElementById('all-cta')) {
        const cta = document.createElement('div');
        cta.id = 'all-cta';
        cta.style.cssText =
          'max-width:1080px;margin:24px auto;padding:0 24px;text-align:center';
        cta.innerHTML =
          '<a href="/learning/all.html" style="display:inline-flex;align-items:center;gap:10px;' +
          'padding:14px 28px;background:#1E40AF;color:#fff;text-decoration:none;' +
          'border-radius:10px;font-size:15px;font-weight:600;letter-spacing:-.01em;' +
          'box-shadow:0 4px 12px rgba(30,64,175,.18);transition:all .2s">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' +
          '학습노트 전체 100편 그리드로 보기' +
          '<span aria-hidden="true">→</span></a>' +
          '<p style="margin:10px 0 0;font-size:13px;color:#6b7280">영역·형식 필터 · 검색 · 정렬 가능</p>';
        recentSection.parentNode.insertBefore(cta, recentSection.nextSibling);
      }
    }

    // 3. 우상단 floating 아이콘 (스크롤 무관 항상 보임)
    if (!document.getElementById('all-fab')) {
      const fab = document.createElement('a');
      fab.id = 'all-fab';
      fab.href = '/learning/all.html';
      fab.title = '학습노트 전체보기 (100편)';
      fab.setAttribute('aria-label', '학습노트 전체 100편 그리드');
      fab.style.cssText =
        'position:fixed;top:96px;right:24px;z-index:9000;' +
        'display:flex;align-items:center;gap:8px;' +
        'padding:10px 16px;background:#fff;border:1px solid #C7D2FE;' +
        'color:#1E40AF;text-decoration:none;border-radius:24px;' +
        'font-size:13px;font-weight:600;letter-spacing:-.01em;' +
        'box-shadow:0 4px 12px rgba(30,64,175,.12);transition:all .2s';
      fab.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' +
        '<span>전체보기 <strong style="font-weight:700">100</strong></span>';

      // hover 효과
      fab.addEventListener('mouseenter', () => {
        fab.style.background = '#1E40AF';
        fab.style.color = '#fff';
        fab.style.borderColor = '#1E40AF';
      });
      fab.addEventListener('mouseleave', () => {
        fab.style.background = '#fff';
        fab.style.color = '#1E40AF';
        fab.style.borderColor = '#C7D2FE';
      });

      // 모바일 768px 이하면 하단 가운데로
      if (window.matchMedia('(max-width: 768px)').matches) {
        fab.style.top = 'auto';
        fab.style.right = '50%';
        fab.style.bottom = '24px';
        fab.style.transform = 'translateX(50%)';
      }

      document.body.appendChild(fab);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
