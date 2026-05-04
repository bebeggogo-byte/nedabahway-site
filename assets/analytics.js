/**
 * analytics.js — GoatCounter (gc.zgo.at) 익명 페이지뷰 통계
 *
 * privacy.html §6에 명시. 외부 의존성: gc.zgo.at (단일).
 * 쿠키·식별자·핑거프린트 없음. 페이지뷰 + 유입 referrer + 화면 크기 정도만.
 *
 * 운영자 셋업:
 *   1. https://www.goatcounter.com/signup 에서 무료 계정 가입
 *   2. 사이트 코드(예: nedabah)를 받아 아래 ENDPOINT 한 줄을 실제 값으로 교체
 *   3. PR로 단 한 줄 변경 → 머지 → 즉시 활성화
 *
 * 사용자 opt-out:
 *   브라우저 콘솔에서 `localStorage.setItem('mz_no_count','1')` 실행.
 *   GoatCounter는 DNT(Do Not Track) 헤더도 자동 존중.
 *
 * 도구의 입력 데이터·결과·키는 절대 추적하지 않습니다 (애초에 페이지 URL과
 * referrer만 GoatCounter 서버에 전송됨).
 */
(function () {
  'use strict';

  // 사용자 opt-out
  try {
    if (localStorage.getItem('mz_no_count') === '1') return;
  } catch (_) { /* 시크릿 모드 등 — 그냥 진행 */ }

  // GoatCounter 사이트 엔드포인트. 가입 후 실제 값으로 교체.
  // 미설정(예시 도메인) 상태에서는 스크립트가 로드돼도 실제 카운트가 발생하지 않음.
  const ENDPOINT = 'https://nedabah.goatcounter.com/count';

  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', ENDPOINT);
  document.head.appendChild(s);
})();
