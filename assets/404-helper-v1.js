/**
 * 404-helper-v1.js — 404 페이지 출구 보강 (2026-05-01, F8)
 *
 * 동작:
 *  1. 현재 경로가 /404.html 또는 문서 title에 "404"가 포함되면 발동
 *  2. 인기 페이지 5개 + 검색창 + sitemap 링크를 동적 삽입
 *  3. 메인 콘텐츠 영역 끝(또는 footer 직전)에 자리잡음
 *
 * 외부 호출 0건. 정적 사이트 호환.
 */
(function () {
  'use strict';

  function isOn404() {
    const path = window.location.pathname;
    if (path === '/404.html' || path.endsWith('/404.html')) return true;
    if ((document.title || '').includes('404')) return true;
    if (document.body && /404/.test(document.body.textContent || '')) {
      // h1에 "없습니다" 같은 표지 있는지 확인
      const h1 = document.querySelector('h1');
      if (h1 && /없습니다|찾으시는|404/.test(h1.textContent || '')) return true;
    }
    return false;
  }

  function buildHelper() {
    const wrapper = document.createElement('section');
    wrapper.id = 'helper-404';
    wrapper.style.cssText = 'max-width:720px;margin:2.5rem auto;padding:2rem 1.5rem;background:#fdfaf3;border:1px solid #d8cdb8;border-radius:8px';
    wrapper.innerHTML = `
      <h2 style="font-size:1.15rem;font-weight:700;color:#2a241c;margin:0 0 1rem;letter-spacing:-.01em">혹시 찾으시는 자리</h2>
      <ul style="list-style:none;padding:0;margin:0 0 1.5rem;display:grid;gap:.6rem">
        <li><a href="/programs.html" style="display:block;padding:.85rem 1rem;background:#fff;border-left:3px solid #1E40AF;color:#2a241c;text-decoration:none;border-radius:4px">
          <strong>강의·코칭 프로그램</strong>
          <span style="display:block;font-size:.85rem;color:#5a5048;margin-top:.2rem">기관·기업·교육현장 맞춤형 강의</span>
        </a></li>
        <li><a href="/magazine.html" style="display:block;padding:.85rem 1rem;background:#fff;border-left:3px solid #1E40AF;color:#2a241c;text-decoration:none;border-radius:4px">
          <strong>관점 노트</strong>
          <span style="display:block;font-size:.85rem;color:#5a5048;margin-top:.2rem">한 사람의 일을 다시 디자인하는 짧은 관찰</span>
        </a></li>
        <li><a href="/learning.html" style="display:block;padding:.85rem 1rem;background:#fff;border-left:3px solid #1E40AF;color:#2a241c;text-decoration:none;border-radius:4px">
          <strong>학습 노트</strong>
          <span style="display:block;font-size:.85rem;color:#5a5048;margin-top:.2rem">직업 본질·인문 고전 학습 누적</span>
        </a></li>
        <li><a href="/resources/" style="display:block;padding:.85rem 1rem;background:#fff;border-left:3px solid #1E40AF;color:#2a241c;text-decoration:none;border-radius:4px">
          <strong>자료실</strong>
          <span style="display:block;font-size:.85rem;color:#5a5048;margin-top:.2rem">활동지·진단지·프롬프트팩 즉시 다운로드</span>
        </a></li>
        <li><a href="/iden.html" style="display:block;padding:.85rem 1rem;background:#fff;border-left:3px solid #1E40AF;color:#2a241c;text-decoration:none;border-radius:4px">
          <strong>IDEN</strong>
          <span style="display:block;font-size:.85rem;color:#5a5048;margin-top:.2rem">5분 좌표 도출 도구</span>
        </a></li>
      </ul>

      <div style="border-top:1px solid #d8cdb8;padding-top:1.25rem">
        <h3 style="font-size:.95rem;font-weight:600;color:#2a241c;margin:0 0 .6rem">또는 직접 검색</h3>
        <div style="display:flex;gap:.5rem">
          <input type="search" id="h404-q" placeholder="검색어 (2글자 이상)"
            style="flex:1;padding:.7rem 1rem;border:1px solid #d8cdb8;border-radius:6px;background:#fff;color:#2a241c;font-size:.95rem"
            aria-label="사이트 검색">
          <button id="h404-go" type="button"
            style="padding:.7rem 1.25rem;background:#1E40AF;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:600">
            검색
          </button>
        </div>
        <p style="font-size:.8rem;color:#5a5048;margin:.5rem 0 0">자료실(/resources/) 검색으로 이동합니다.</p>
      </div>

      <div style="border-top:1px solid #d8cdb8;margin-top:1.25rem;padding-top:1rem;font-size:.85rem;color:#5a5048">
        전체 페이지 목록: <a href="/sitemap.xml" style="color:#1E40AF">sitemap.xml</a> ·
        문의: <a href="mailto:nedabah.way@gmail.com" style="color:#1E40AF">nedabah.way@gmail.com</a>
      </div>
    `;
    return wrapper;
  }

  function bindSearch(wrapper) {
    const input = wrapper.querySelector('#h404-q');
    const btn = wrapper.querySelector('#h404-go');
    function go() {
      const q = (input.value || '').trim();
      if (q.length < 2) { input.focus(); return; }
      // 자료실 검색 페이지로 q 파라미터 전달 (resources-search-v1.js가 처리)
      window.location.href = '/resources/?q=' + encodeURIComponent(q);
    }
    btn.addEventListener('click', go);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') go();
    });
  }

  function init() {
    if (!isOn404()) return;
    if (document.getElementById('helper-404')) return;
    const wrapper = buildHelper();
    bindSearch(wrapper);

    const main = document.querySelector('main') || document.querySelector('.masthead') || document.body;
    const footer = document.querySelector('footer');
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(wrapper, footer);
    } else if (main && main.parentNode) {
      main.parentNode.insertBefore(wrapper, main.nextSibling);
    } else {
      document.body.appendChild(wrapper);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
