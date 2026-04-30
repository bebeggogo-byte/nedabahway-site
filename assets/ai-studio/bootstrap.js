/* AI 작업실 — Bootstrap (모든 자산 자동 로드)
 *
 * 자리: ai.html이 이 한 줄만 있으면 v2 모든 기능이 켜진다.
 *   <script src="/assets/ai-studio/bootstrap.js" defer></script>
 *
 * 역할:
 *   1) v2.css·v2.js·block6.js 자동 주입 (중복 차단)
 *   2) og·twitter 메타 자동 주입
 *   3) 이중 네비(nav.nav + nav.gnav 동시 존재) 자동 정리 — gnav 유지·legacy nav 제거
 *   4) 페이지 로드 후 자가점검 로그
 *
 * 시스템 정책 호환: ai.html 본체는 손대지 않는다. 런타임 DOM 보강만 한다.
 */
(function(){
  'use strict';

  const BASE = '/assets/ai-studio/';
  const ASSETS = [
    {tag:'link', rel:'stylesheet', href:BASE+'v2.css'},
    {tag:'link', rel:'stylesheet', href:BASE+'tabs.css'},
    {tag:'script', src:BASE+'v2.js', defer:true},
    {tag:'script', src:BASE+'block6.js', defer:true},
    {tag:'script', src:BASE+'tabs.js', defer:true}
  ];

  // 1) 자산 주입 (중복 차단)
  function injectAssets(){
    const head = document.head;
    ASSETS.forEach(a=>{
      const sel = a.tag === 'link'
        ? `link[href="${a.href}"]`
        : `script[src="${a.src}"]`;
      if(document.querySelector(sel)) return;
      const el = document.createElement(a.tag);
      Object.entries(a).forEach(([k,v])=>{
        if(k === 'tag') return;
        if(k === 'defer'){ el.defer = !!v; return; }
        el.setAttribute(k, v);
      });
      head.appendChild(el);
    });
  }

  // 2) OG·Twitter 메타 주입
  function injectMeta(){
    const head = document.head;
    const want = [
      ['og:image', 'https://www.nedabah.org/assets/og/ai-studio.svg'],
      ['twitter:card', 'summary_large_image'],
      ['twitter:image', 'https://www.nedabah.org/assets/og/ai-studio.svg']
    ];
    want.forEach(([prop, content])=>{
      const isOG = prop.startsWith('og:');
      const sel = isOG ? `meta[property="${prop}"]` : `meta[name="${prop}"]`;
      if(document.querySelector(sel)) return;
      const m = document.createElement('meta');
      if(isOG) m.setAttribute('property', prop);
      else m.setAttribute('name', prop);
      m.setAttribute('content', content);
      head.appendChild(m);
    });
  }

  // 3) 이중 네비 정리 — gnav 유지, legacy nav.nav 제거
  function dedupeNav(){
    const legacy = document.querySelector('nav.nav');
    const gnav = document.querySelector('nav.gnav');
    if(legacy && gnav){
      legacy.parentElement.removeChild(legacy);
      console.log('[ai-studio bootstrap] legacy nav.nav 제거 — gnav 유지');
    }
  }

  // 4) 자가점검
  function selfCheck(){
    const checks = {
      v2css: !!document.querySelector('link[href*="ai-studio/v2.css"]'),
      tabsCss: !!document.querySelector('link[href*="ai-studio/tabs.css"]'),
      v2js: !!document.querySelector('script[src*="ai-studio/v2.js"]'),
      block6js: !!document.querySelector('script[src*="ai-studio/block6.js"]'),
      tabsJs: !!document.querySelector('script[src*="ai-studio/tabs.js"]'),
      ogImage: !!document.querySelector('meta[property="og:image"]'),
      gnav: !!document.querySelector('nav.gnav'),
      duplicateNav: !!document.querySelector('nav.nav') && !!document.querySelector('nav.gnav')
    };
    console.log('[ai-studio bootstrap] selfCheck:', checks);
    return checks;
  }

  // 실행 (head·body 어디서 호출되어도 안전)
  injectAssets();
  injectMeta();
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ dedupeNav(); selfCheck(); });
  } else {
    dedupeNav(); selfCheck();
  }
})();
