/* testimonials-widget.js — embed approved testimonials anywhere
 *
 * Usage in any HTML page:
 *   <div id="testimonials"></div>
 *   <script src="/assets/js/supabase-config.js"></script>
 *   <script type="module" src="/assets/js/testimonials-widget.js"></script>
 *
 * Options via data-attributes on the container:
 *   data-limit="12"          max items
 *   data-layout="grid|list"  default grid
 *   data-heading="..."       custom heading (empty = no heading)
 */

import { listApprovedTestimonials, subscribeTestimonialChanges } from '/assets/js/supabase-client.js';

const STYLE_ID = 'twg-style';
const css = `
.twg{font-family:'Pretendard Variable',Pretendard,'Noto Sans KR',sans-serif;max-width:1180px;margin:48px auto;padding:0 20px;}
.twg-head{margin-bottom:20px;}
.twg-eyebrow{font-size:11.5px;font-weight:700;letter-spacing:1.5px;color:#a4541a;text-transform:uppercase;margin-bottom:6px;}
.twg-title{font-family:'Noto Serif KR',serif;font-size:24px;font-weight:800;letter-spacing:-.02em;color:#1A1A1A;margin:0 0 6px;}
.twg-sub{font-size:13.5px;color:#475569;line-height:1.7;margin:0;}
.twg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
.twg-list{display:flex;flex-direction:column;gap:14px;}
.twg-list .twg-card{max-width:100%;}
.twg-card{background:#fff;border:1px solid #f0e6d0;border-radius:12px;padding:20px 22px;position:relative;}
.twg-card::before{content:'\\201C';position:absolute;top:-2px;left:14px;font-family:'Noto Serif KR',serif;font-size:48px;font-weight:800;color:#fdf4ec;line-height:1;}
.twg-body{font-size:14px;line-height:1.8;color:#1A1A1A;margin:6px 0 14px;position:relative;z-index:1;}
.twg-who{font-size:13px;font-weight:700;color:#1A1A1A;}
.twg-role{font-size:11.5px;color:#7a6f5f;margin-top:2px;}
.twg-empty{padding:30px 0;color:#94a3b8;font-size:13px;text-align:center;}
`;

function ensureStyle(){
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID; s.textContent = css;
  document.head.appendChild(s);
}

function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function render(container, items){
  const layout = container.dataset.layout || 'grid';
  const heading = container.dataset.heading;
  const showHead = heading !== '';
  const head = showHead ? `
    <header class="twg-head">
      <div class="twg-eyebrow">Testimonials</div>
      <h2 class="twg-title">${esc(heading || '함께해 주신 분들의 한 마디')}</h2>
      <p class="twg-sub">현장에서 직접 받은 의견을 본인 검토 후 그대로 싣습니다.</p>
    </header>` : '';

  if (!items.length) {
    container.innerHTML = `${head}<div class="twg-empty">아직 공개된 한 마디가 없습니다.</div>`;
    return;
  }
  const inner = items.map(t => `
    <article class="twg-card">
      <div class="twg-body">${esc(t.content).replace(/\n/g,'<br>')}</div>
      <div class="twg-who">${esc(t.name)}</div>
      ${t.role ? `<div class="twg-role">${esc(t.role)}</div>` : ''}
    </article>`).join('');
  container.innerHTML = `${head}<div class="twg-${layout}">${inner}</div>`;
}

async function mount(container){
  container.classList.add('twg');
  const limit = parseInt(container.dataset.limit || '12', 10);
  try {
    const items = await listApprovedTestimonials({ limit });
    render(container, items);
  } catch (err) {
    container.innerHTML = `<div class="twg-empty">불러올 수 없습니다 (${esc(err.message||String(err))})</div>`;
  }
}

ensureStyle();
const containers = document.querySelectorAll('#testimonials, [data-widget="testimonials"]');
containers.forEach(mount);

// Realtime auto-refresh when an approval happens
if (containers.length) {
  subscribeTestimonialChanges(() => containers.forEach(mount));
}
