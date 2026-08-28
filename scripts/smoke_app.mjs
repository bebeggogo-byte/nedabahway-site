// M2 스모크 테스트 — 앱 핵심 동선을 실제 브라우저로 밟는다.
import { chromium } from 'playwright-core';

import { execSync } from 'node:child_process';
const BASE = 'http://localhost:8099/app/';
const EXEC = execSync("ls /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1").toString().trim();
const results = [];
const ok = (n, c) => results.push([c ? 'PASS' : 'FAIL', n]);

const browser = await chromium.launch({
  executablePath: EXEC,
  args: ['--no-sandbox'],
});

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
// favicon은 정적 서버에 없어 404(환경 잡음) — 앱 스코프(/app/) 밖. 흡수한다.
await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => {
  // favicon 404는 python 정적 서버의 환경 잡음 — 앱 결함 아님
  if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text());
});
page.on('requestfailed', r => { if (!/favicon/.test(r.url())) {} });

// 0. 첫 진입 → 소개(온보딩)
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => navigator.serviceWorker?.ready);  // SW 활성화 대기
await page.waitForSelector('.guide__lead', { timeout: 8000 });
ok('첫 진입 소개(온보딩) 노출', await page.isVisible('.guide__lead'));
await page.click('.guide a.btn');  // 시작하기 → 오늘

// 1. 오늘 뷰 로드
await page.waitForSelector('.today-hero__t', { timeout: 8000 });
ok('오늘 뷰 로드', await page.isVisible('.today-hero__t'));
ok('관찰 배지 표시', await page.isVisible('.topbar__badge'));
// 도움말(?) 버튼으로 소개 재열람
await page.click('.topbar__help');
await page.waitForSelector('.guide__lead', { timeout: 5000 });
ok('도움말(?) 소개 재열람', await page.isVisible('.guide__lead'));
await page.click('.guide a.btn');
await page.waitForSelector('.today-hero__t', { timeout: 8000 });

// 2. 오늘 → 리더 열기
await page.click('a.btn');
await page.waitForSelector('.reader__title', { timeout: 8000 });
const rtitle = await page.textContent('.reader__title');
ok('리더 열림(제목=' + rtitle + ')', /장/.test(rtitle));
ok('관찰 본문 존재', (await page.$$('.reader__body p')).length > 3);

// 3. 북마크 토글
await page.click('#bmBtn');
await page.waitForTimeout(200);
ok('북마크 눌림', (await page.getAttribute('#bmBtn', 'aria-pressed')) === 'true');

// 4. 다음 장 이동
const before = await page.textContent('.reader__title');
await page.click('.reader-actions .ra:last-child');
await page.waitForTimeout(400);
const after = await page.textContent('.reader__title');
ok('다음 장 이동(' + before + '→' + after + ')', before !== after);

// 5. 검색
await page.click('a.tab[data-tab="search"]');
await page.waitForSelector('#q', { timeout: 5000 });
await page.fill('#q', '새 언약');
await page.waitForTimeout(500);
const hitCount = (await page.$$('#results .row')).length;
ok('검색 "새 언약" 결과 ' + hitCount + '건', hitCount > 0);

// 6. 검색 → 장 열기 → 꺼내쓰기
await page.click('#results .row');
await page.waitForSelector('.reader__title', { timeout: 8000 });
await page.click('#extractBtn');
await page.waitForSelector('.modal .pick', { timeout: 5000 });
await page.click('.pick button[data-t="sermon"]');
await page.waitForSelector('.extract-out', { timeout: 5000 });
const ex = await page.textContent('.extract-out');
ok('꺼내쓰기 설교 개요 생성', ex.includes('설교 개요'));
await page.keyboard.press('Escape');

// 7. 성경 목차
await page.click('a.tab[data-tab="library"]');
await page.waitForSelector('.card', { timeout: 5000 });
ok('성경 66권 카드', (await page.$$('.card')).length >= 66);

// 8. 설정 — 큰 글씨 적용
await page.click('a.tab[data-tab="settings"]');
await page.waitForSelector('[data-set="size"]', { timeout: 5000 });
await page.click('[data-set="size"][data-v="xl"]');
await page.waitForTimeout(150);
ok('큰글씨 설정 적용', (await page.getAttribute('html', 'data-size')) === 'xl');

// 9. 오프라인 — 온라인에서 JER-031 캐시 후, 서버 끊고 재방문(SW 캐시)
await page.goto(BASE + '#/read/JER-031', { waitUntil: 'networkidle' });
await page.waitForSelector('.reader__title', { timeout: 8000 });
await page.evaluate(() => navigator.serviceWorker?.ready);
await page.waitForTimeout(400);
await ctx.setOffline(true);
await page.goto(BASE + '#/read/JER-031', { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForSelector('.reader__title', { timeout: 8000 }).catch(() => {});
const offlineOk = await page.isVisible('.reader__title').catch(() => false);
const offlineTitle = offlineOk ? await page.textContent('.reader__title') : '';
ok('오프라인 리더(SW 캐시, ' + offlineTitle + ')', offlineOk);
await ctx.setOffline(false);

ok('콘솔/페이지 에러 0', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 5));

await browser.close();

const pass = results.filter(r => r[0] === 'PASS').length;
console.log('\n=== 스모크 테스트 ' + pass + '/' + results.length + ' ===');
results.forEach(([s, n]) => console.log(`  ${s === 'PASS' ? '✓' : '✗'} ${n}`));
process.exit(pass === results.length ? 0 : 1);
