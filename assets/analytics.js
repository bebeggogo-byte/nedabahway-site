/**
 * analytics.js — 네다바웨이 re-visit surface bootstrap (SPEC-REVISIT-001)
 *
 * 이 한 파일이 re-visit surface의 클라이언트 진입점이다. 세 가지를 한다:
 *   1. 쿠키리스 익명 통계(GoatCounter, gc.zgo.at) 로드 — 페이지뷰 (REQ-RV-009)
 *   2. site-wide 서비스 워커 /sw.js 등록 — 오프라인/재방문 캐시 (REQ-RV-007)
 *   3. 퍼널 키 이벤트 4종 계측 (REQ-RV-011/012/013)
 *
 * privacy.html §6에 명시. 외부 의존성: gc.zgo.at (단일).
 * 쿠키·식별자·핑거프린트 없음. 페이지 URL·referrer·이벤트 이름만 전송.
 *
 * 운영자 셋업 (GoatCounter):
 *   1. https://www.goatcounter.com/signup 에서 무료 계정 가입
 *   2. 사이트 코드(예: nedabah)를 받아 아래 ENDPOINT 한 줄을 실제 값으로 교체
 *   3. PR로 단 한 줄 변경 → 머지 → 즉시 활성화
 *
 * 사용자 opt-out:
 *   브라우저 콘솔에서 `localStorage.setItem('mz_no_count','1')` 실행.
 *   GoatCounter는 DNT(Do Not Track) 헤더도 자동 존중.
 *
 * 비차단(REQ-RV-012): GoatCounter나 이 스크립트가 차단/실패해도 페이지는
 *   정상 동작한다. 모든 이벤트 발송은 feature-guard + try/catch 로 감싼다.
 *
 * 도구의 입력 데이터·결과·키·폼 내용은 절대 추적하지 않는다 — 페이지 URL,
 *   referrer, 이벤트 이름/coarse 메타데이터만 전송된다 (REQ-RV-010).
 *
 * 이벤트 계약은 .moai/specs/SPEC-REVISIT-001/events.md 에 문서화됨.
 */
(function () {
  'use strict';

  /* ---- 1. opt-out / DNT 게이트 ------------------------------------- */
  var optedOut = false;
  try {
    if (localStorage.getItem('mz_no_count') === '1') optedOut = true;
  } catch (_) { /* 시크릿 모드 등 — 그냥 진행 */ }
  var dnt = false;
  try {
    var d = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    if (d === '1' || d === 'yes') dnt = true;
  } catch (_) { /* ignore */ }
  var countingDisabled = optedOut || dnt;

  /* ---- 2. GoatCounter 페이지뷰 스크립트 로드 ------------------------ */
  // GoatCounter 사이트 엔드포인트. 가입 후 실제 값으로 교체.
  // 미설정(예시 도메인) 상태에서는 스크립트가 로드돼도 실제 카운트가 발생하지 않음.
  var ENDPOINT = 'https://nedabah.goatcounter.com/count';

  if (!countingDisabled) {
    try {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://gc.zgo.at/count.js';
      s.setAttribute('data-goatcounter', ENDPOINT);
      (document.head || document.documentElement).appendChild(s);
    } catch (_) { /* 통계 로드 실패는 페이지에 영향 없음 */ }
  }

  /**
   * sendEvent — 명명된 비식별 퍼널 이벤트를 GoatCounter에 전송한다.
   *
   * GoatCounter는 임의 경로를 "이벤트"로 카운트할 수 있다(window.goatcounter.count).
   * 전송 페이로드: event 이름(path)과 title 뿐 — 개인정보·폼·도구 데이터 없음.
   * 통계가 차단/미로드 상태면 조용히 무시한다(REQ-RV-012).
   *
   * @param {string} name  - 이벤트 이름. 예: 'cta-click', 'consult-reach'.
   */
  function sendEvent(name) {
    if (countingDisabled) return;
    try {
      var gc = window.goatcounter;
      if (gc && typeof gc.count === 'function') {
        gc.count({ path: 'event/' + name, title: 'event:' + name, event: true });
      }
    } catch (_) { /* 이벤트 전송 실패는 페이지에 영향 없음 */ }
  }
  // 공개 — 다른 인라인 스크립트가 필요 시 호출할 수 있도록.
  window.nedabahTrack = sendEvent;

  /* ---- 3. site-wide 서비스 워커 등록 (REQ-RV-007) ------------------- */
  // feature-guard: serviceWorker 미지원 브라우저에서는 조용히 건너뛴다.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      try {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .catch(function () { /* 등록 실패는 페이지 동작에 영향 없음 */ });
      } catch (_) { /* ignore */ }
    });
  }

  /* ---- 4. 퍼널 키 이벤트 계측 (REQ-RV-011) ------------------------- */
  // 모든 계측은 DOM 준비 후 1회 실행. 실패해도 페이지는 정상 동작.
  function instrument() {
    try {
      var path = location.pathname;

      // (b) consult-path reach — /contact.html 도달.
      //     별도 클릭 없이 페이지 진입 자체가 트리거.
      if (/\/contact\.html$/.test(path)) {
        sendEvent('consult-reach');
      }

      // (c) subscribe — 구독 경로 완료 페이지(subscribed-thanks.html) 도달.
      if (/\/subscribed-thanks\.html$/.test(path)) {
        sendEvent('subscribe');
      }

      // (a) CTA click — 주요 전환 CTA 클릭.
      //     대상: .cta-next 블록 내 링크, 그리고 명시적 .gnav__cta / [data-cta] 링크.
      //     캡처 단계 리스너 — 링크 기본 동작을 막지 않는다(비차단).
      var ctaSelector = '.cta-next a, a.cta-next__primary, a.cta-next__secondary, a.gnav__cta, [data-cta]';
      document.addEventListener('click', function (ev) {
        try {
          var t = ev.target;
          if (!t || typeof t.closest !== 'function') return;
          var link = t.closest(ctaSelector);
          if (link) sendEvent('cta-click');
        } catch (_) { /* 계측 실패가 클릭을 막아선 안 된다 */ }
      }, true);

      // (d) subscribe intent — 구독 페이지(newsletter.html)에서 채널/확인 링크 클릭.
      //     subscribed-thanks.html 도달과 함께 구독 퍼널을 양쪽에서 측정한다.
      if (/\/newsletter\.html$/.test(path)) {
        document.addEventListener('click', function (ev) {
          try {
            var t = ev.target;
            if (!t || typeof t.closest !== 'function') return;
            var link = t.closest('a[href*="subscribed-thanks"], a[href*="linkedin.com"], a[href*="blog.naver.com"], a[href*="/feeds/"]');
            if (link) sendEvent('subscribe-intent');
          } catch (_) { /* ignore */ }
        }, true);
      }
    } catch (_) { /* 계측 전체 실패도 페이지엔 영향 없음 */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instrument);
  } else {
    instrument();
  }
})();
