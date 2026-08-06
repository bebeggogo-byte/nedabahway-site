const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const CH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT = '/home/user/nedabahway-site';
const SRC = path.join(ROOT, 'radio/store/src');
const ICONS = path.join(ROOT, 'radio/icons');
const STORE = path.join(ROOT, 'radio/store');

const jobs = [
  // app icon (full-bleed) -> multiple sizes
  { svg:'icon.svg', w:1024, h:1024, out:[STORE+'/icon-1024.png'] },
  { svg:'icon.svg', w:512,  h:512,  out:[ICONS+'/icon-512.png'] },
  { svg:'icon.svg', w:512,  h:512,  out:[ICONS+'/icon-maskable-512.png'] },
  { svg:'icon.svg', w:192,  h:192,  out:[ICONS+'/icon-192.png'] },
  { svg:'icon.svg', w:180,  h:180,  out:[ICONS+'/apple-touch-icon.png'] },
  { svg:'icon.svg', w:144,  h:144,  out:[ICONS+'/icon-144.png'] },
  // android adaptive layers (transparent fg)
  { svg:'icon-foreground.svg', w:432, h:432, out:[STORE+'/adaptive-foreground-432.png'], transparent:true },
  { svg:'icon-background.svg', w:432, h:432, out:[STORE+'/adaptive-background-432.png'] },
  // splash + feature graphic
  { svg:'splash.svg',  w:2732, h:2732, out:[STORE+'/splash-2732.png'] },
  { svg:'feature.svg', w:1024, h:500,  out:[STORE+'/feature-1024x500.png'] },
];

(async () => {
  const browser = await chromium.launch({ executablePath: CH, headless: true, args: ['--no-sandbox', '--force-color-profile=srgb'] });
  for (const j of jobs) {
    const svg = fs.readFileSync(path.join(SRC, j.svg), 'utf8');
    const html = `<!doctype html><meta charset="utf-8"><style>
      *{margin:0;padding:0}html,body{width:${j.w}px;height:${j.h}px;overflow:hidden;background:${j.transparent?'transparent':'#0F1419'}}
      svg{width:100%!important;height:100%!important;display:block}
    </style>${svg}`;
    const ctx = await browser.newContext({ viewport:{width:j.w,height:j.h}, deviceScaleFactor:1 });
    const page = await ctx.newPage();
    await page.goto('data:text/html;charset=utf-8,'+encodeURIComponent(html), { waitUntil:'networkidle' });
    await page.waitForTimeout(120);
    for (const o of j.out) {
      await page.screenshot({ path:o, clip:{x:0,y:0,width:j.w,height:j.h}, omitBackground: !!j.transparent });
      console.log('wrote', path.relative(ROOT,o), j.w+'x'+j.h);
    }
    await ctx.close();
  }
  await browser.close();
  console.log('DONE');
})().catch(e=>{ console.error('RENDER_FAIL', e.message); process.exit(1); });
