/**
 * share-bar.js — 한국 + 글로벌 SNS 공유 버튼
 * KakaoTalk · Naver · X · LinkedIn · Facebook · Telegram · WhatsApp · LINE · Copy
 * KakaoTalk·Naver를 좌측 상단에 배치(한국 인앱 사용자 우선).
 */
(function() {
  // KakaoTalk 공식 공유 URL: 모바일에서 카카오톡 앱 호출, 데스크탑에서는 카카오스토리/이메일 공유 페이지로 fallback
  const SHARES = [
    { name: '카카오톡',    icon: '💬', url: u => 'https://story.kakao.com/share?url=' + u },
    { name: '네이버',      icon: 'N',  url: u => 'https://share.naver.com/web/shareView?url=' + u + '&title=' + T },
    { name: 'X (Twitter)', icon: '𝕏', url: u => 'https://twitter.com/intent/tweet?url=' + u + '&text=' + T },
    { name: 'LinkedIn',    icon: 'in', url: u => 'https://www.linkedin.com/sharing/share-offsite/?url=' + u },
    { name: 'Facebook',    icon: 'f',  url: u => 'https://www.facebook.com/sharer/sharer.php?u=' + u },
    { name: 'Telegram',    icon: '✈', url: u => 'https://t.me/share/url?url=' + u + '&text=' + T },
    { name: 'WhatsApp',    icon: 'W',  url: u => 'https://api.whatsapp.com/send?text=' + T + '%20' + u },
    { name: 'LINE',        icon: 'L',  url: u => 'https://social-plugins.line.me/lineit/share?url=' + u },
    { name: '링크 복사',   icon: '⧉', url: () => null, copy: true },
  ];

  let T = '';

  function init() {
    if (document.getElementById('share-bar')) return;
    const pageUrl = encodeURIComponent(window.location.href);
    T = encodeURIComponent(document.title || 'Still Hands · from Nedabahway');

    const bar = document.createElement('nav');
    bar.id = 'share-bar';
    bar.setAttribute('aria-label', 'Share this page');
    bar.innerHTML =
      '<div class="sb__label">공유</div>' +
      SHARES.map(function(s, i) {
        if (s.copy) {
          return '<button class="sb__btn sb__copy" data-i="' + i + '" title="' + s.name + '" aria-label="' + s.name + '">' + s.icon + '</button>';
        }
        const u = s.url(pageUrl);
        return '<a class="sb__btn" href="' + u + '" target="_blank" rel="noopener" title="' + s.name + '" aria-label="' + s.name + '">' + s.icon + '</a>';
      }).join('');

    const css = document.createElement('style');
    css.textContent = [
      '#share-bar{position:fixed;left:12px;bottom:12px;z-index:9998;',
      'display:flex;flex-wrap:wrap;align-items:center;gap:4px;',
      'padding:8px 10px;border:1px solid rgba(0,0,0,.1);border-radius:999px;',
      'background:rgba(255,255,255,.95);backdrop-filter:blur(8px);',
      '-webkit-backdrop-filter:blur(8px);',
      'box-shadow:0 2px 14px rgba(0,0,0,.08);max-width:calc(100vw - 24px);}',
      '#share-bar .sb__label{font-size:.72rem;font-weight:700;letter-spacing:.12em;',
      'text-transform:uppercase;color:#6B6B6B;padding:0 8px 0 4px;}',
      '#share-bar .sb__btn{display:inline-flex;align-items:center;justify-content:center;',
      'width:30px;height:30px;font-size:14px;font-weight:800;border-radius:50%;',
      'background:#F3F0E8;border:none;color:#1A1A1A;text-decoration:none;cursor:pointer;',
      'font-family:ui-sans-serif,system-ui,sans-serif;line-height:1;',
      'transition:transform .15s ease, background .15s ease;}',
      '#share-bar .sb__btn:hover{transform:translateY(-2px);background:#10803D;color:#fff;}',
      '#share-bar .sb__btn.sb__copy-done{background:#10803D;color:#fff;}',
      '@media (max-width: 760px){',
      '#share-bar{padding:6px 8px;}',
      '#share-bar .sb__label{display:none;}',
      '#share-bar .sb__btn{width:26px;height:26px;font-size:12px;}',
      '}',
      '@media (prefers-color-scheme: dark){',
      '#share-bar{background:rgba(20,20,20,.92);border-color:rgba(255,255,255,.1);}',
      '#share-bar .sb__label{color:#BBB;}',
      '#share-bar .sb__btn{background:#2a2a2a;color:#fff;}',
      '}',
    ].join('');

    document.head.appendChild(css);
    document.body.appendChild(bar);

    bar.querySelectorAll('.sb__copy').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        try {
          await navigator.clipboard.writeText(window.location.href);
          const orig = btn.innerHTML;
          btn.innerHTML = '✓';
          btn.classList.add('sb__copy-done');
          setTimeout(function() { btn.innerHTML = orig; btn.classList.remove('sb__copy-done'); }, 1600);
        } catch (e) {
          window.prompt('Copy this link:', window.location.href);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
