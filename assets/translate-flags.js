/**
 * translate-flags.js — 오른쪽 상단 국기 번역 스위처
 * 인구 많은·아시아·중동·아프리카 개도국 언어 20종
 * 각 국기 클릭 시 Google Translate로 현 페이지 번역 오픈
 */
(function() {
  const LANGS = [
    { code: 'zh-CN', flag: '🇨🇳', name: '中文 (简体)' },
    { code: 'hi',    flag: '🇮🇳', name: 'हिन्दी' },
    { code: 'es',    flag: '🇪🇸', name: 'Español' },
    { code: 'pt',    flag: '🇧🇷', name: 'Português' },
    { code: 'ar',    flag: '🇸🇦', name: 'العربية' },
    { code: 'bn',    flag: '🇧🇩', name: 'বাংলা' },
    { code: 'ru',    flag: '🇷🇺', name: 'Русский' },
    { code: 'ja',    flag: '🇯🇵', name: '日本語' },
    { code: 'ko',    flag: '🇰🇷', name: '한국어' },
    { code: 'id',    flag: '🇮🇩', name: 'Indonesia' },
    { code: 'vi',    flag: '🇻🇳', name: 'Tiếng Việt' },
    { code: 'th',    flag: '🇹🇭', name: 'ไทย' },
    { code: 'tr',    flag: '🇹🇷', name: 'Türkçe' },
    { code: 'fa',    flag: '🇮🇷', name: 'فارسی' },
    { code: 'ur',    flag: '🇵🇰', name: 'اردو' },
    { code: 'fr',    flag: '🇫🇷', name: 'Français' },
    { code: 'sw',    flag: '🇰🇪', name: 'Kiswahili' },
    { code: 'am',    flag: '🇪🇹', name: 'አማርኛ' },
    { code: 'tl',    flag: '🇵🇭', name: 'Filipino' },
    { code: 'ms',    flag: '🇲🇾', name: 'Bahasa Melayu' },
  ];

  function init() {
    if (document.getElementById('translate-flags')) return;
    const src = encodeURIComponent(window.location.href);
    const bar = document.createElement('nav');
    bar.id = 'translate-flags';
    bar.setAttribute('aria-label', 'Translate this page');
    bar.innerHTML = LANGS.map(function(l) {
      const url = 'https://translate.google.com/translate?sl=en&tl=' + l.code + '&u=' + src;
      return '<a class="tf__btn" href="' + url + '" target="_blank" rel="noopener" title="' + l.name + '" aria-label="Translate to ' + l.name + '">' + l.flag + '</a>';
    }).join('');

    const css = document.createElement('style');
    css.textContent = [
      '#translate-flags{position:fixed;top:64px;right:12px;z-index:9999;',
      'display:grid;grid-template-columns:repeat(5,28px);gap:4px;',
      'padding:8px;border:1px solid rgba(0,0,0,.1);border-radius:10px;',
      'background:rgba(255,255,255,.95);backdrop-filter:blur(8px);',
      '-webkit-backdrop-filter:blur(8px);',
      'box-shadow:0 2px 14px rgba(0,0,0,.08);}',
      '#translate-flags .tf__btn{display:inline-flex;align-items:center;justify-content:center;',
      'width:28px;height:28px;font-size:18px;border-radius:6px;text-decoration:none;',
      'line-height:1;transition:transform .15s ease, background .15s ease;cursor:pointer;}',
      '#translate-flags .tf__btn:hover{transform:scale(1.3);background:rgba(0,0,0,.05);}',
      '@media (max-width: 900px){',
      '#translate-flags{top:auto;bottom:12px;right:12px;grid-template-columns:repeat(5,24px);padding:6px;}',
      '#translate-flags .tf__btn{width:24px;height:24px;font-size:15px;}',
      '}',
      '@media (prefers-color-scheme: dark){',
      '#translate-flags{background:rgba(20,20,20,.9);border-color:rgba(255,255,255,.1);}',
      '}',
    ].join('');

    if (document.head) document.head.appendChild(css);
    (document.body || document.documentElement).appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
