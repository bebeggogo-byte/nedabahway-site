const { chromium } = require('playwright-core');
const CH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:8137';
const URL = BASE + '/radio/mvp/';
const OUT = '/home/user/nedabahway-site/radio/store';

(async () => {
  const browser = await chromium.launch({ executablePath: CH, headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, locale: 'ko-KR',
    geolocation: { latitude: 33.4996, longitude: 126.5312 }, permissions: ['geolocation'],
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); } catch(e){} });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#onboard');
  await page.waitForTimeout(300);

  // 1) onboarding
  await page.screenshot({ path: OUT + '/screenshot-1-onboard.png' });

  // start -> player (geo auto -> 제주시)
  await page.click('#choice .choice__opt[data-mode="always"]');
  await page.click('#obCta');
  await page.waitForSelector('#player:not(.hidden)');
  await page.waitForFunction(() => document.getElementById('cityName').textContent.trim() === '제주시', null, { timeout: 6000 });
  await page.waitForTimeout(300);

  // 2) player (auto-detected)
  await page.screenshot({ path: OUT + '/screenshot-2-player.png' });

  // 3) ON-AIR look + remember button revealed
  await page.evaluate(() => {
    document.getElementById('player').classList.add('is-playing');
    document.getElementById('statusText').textContent = 'ON AIR';
    document.getElementById('liveDot');
    document.getElementById('rememberBtn').classList.add('is-shown');
    document.getElementById('playIcon').innerHTML = '<path d="M6 6h12v12H6z"/>';
    document.getElementById('playText').textContent = '정지';
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/screenshot-3-onair.png' });

  // 4) history with a couple of saved songs
  await page.evaluate(() => {
    const now = Date.now();
    const mk = (min) => { const d = new Date(now - min*60000);
      const p = new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
      const g = t => p.find(x=>x.type===t)?.value||'';
      return { ts:d.getTime(), title:'', city:'제주시', freq:'96.3', dateKey:`${g('year')}-${g('month')}-${g('day')}`, hm:`${g('hour')}:${g('minute')}` };
    };
    localStorage.setItem('classicfm.mvp.history', JSON.stringify([mk(2), mk(38), mk(126)]));
  });
  await page.click('#histBtn');
  await page.waitForSelector('#histSheet.is-open');
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/screenshot-4-history.png' });

  await browser.close();
  console.log('SHOTS_DONE');
})().catch(e => { console.error('SHOTS_FAIL', e.message); process.exit(1); });
