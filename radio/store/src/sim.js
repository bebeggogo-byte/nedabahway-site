const { chromium } = require('playwright-core');
const CH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:8137';
const URL = BASE + '/radio/mvp/';
const OUT = '/home/user/nedabahway-site/radio/store';

let PASS = 0, FAIL = 0;
const results = [];
function assert(c, m){ if(!c) throw new Error(m); }
async function scenario(name, fn){
  try { await fn(); PASS++; results.push('PASS  '+name); console.log('PASS  '+name); }
  catch(e){ FAIL++; results.push('FAIL  '+name+' :: '+e.message); console.log('FAIL  '+name+' :: '+e.message); }
}

const JEJU = { latitude:33.4996, longitude:126.5312 };
const SEOUL = { latitude:37.5665, longitude:126.9780 };
const BUSAN = { latitude:35.1796, longitude:129.0756 };
const SEOGWIPO = { latitude:33.2541, longitude:126.5601 };

(async () => {
  const browser = await chromium.launch({ executablePath: CH, headless:true, args:['--no-sandbox'] });

  // helper: fresh page. opts: geolocation, permissions, preSetStorage(obj), noGeoApi, blockStations, blockStream
  async function mk(opts={}){
    const ctx = await browser.newContext({
      viewport:{width:430,height:932}, deviceScaleFactor:2, locale:'ko-KR',
      geolocation: opts.geolocation, permissions: opts.permissions||[],
    });
    if(opts.blockStream!==false) await ctx.route('**radio.bsod.kr**', r=>r.abort());
    if(opts.blockStations) await ctx.route('**/stations.json', r=>r.abort());
    const page = await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(String(e.message)));
    page.__errs = errs;
    // fresh context already has empty storage; do NOT clear on every load (would wipe state on reload)
    await page.addInitScript((o)=>{
      if(o.storage){ for(const k in o.storage) if(localStorage.getItem(k)===null) localStorage.setItem(k,o.storage[k]); }
      if(o.noGeoApi){ Object.defineProperty(navigator,'geolocation',{get:()=>undefined,configurable:true}); }
      if(!window.__opened){ window.__opened=[]; window.open=(u)=>{ window.__opened.push(u); return null; }; }
    }, { storage:opts.storage, noGeoApi:opts.noGeoApi });
    await page.goto(URL, { waitUntil:'domcontentloaded' });
    return { ctx, page };
  }
  const K = { onboarded:'classicfm.mvp.onboarded', mode:'classicfm.mvp.locMode', city:'classicfm.mvp.lastCity', hist:'classicfm.mvp.history' };
  async function startAlways(page){
    await page.waitForSelector('#onboard');
    await page.click('#choice .choice__opt[data-mode="always"]');
    await page.click('#obCta');
    await page.waitForSelector('#player:not(.hidden)');
  }
  const cityOf = (page)=>page.evaluate(()=>document.getElementById('cityName').textContent.trim());
  const noErr = (page)=>assert(page.__errs.length===0, 'pageerror: '+page.__errs.join(' | '));

  // S1 first run, always, geo Jeju
  await scenario('S1 first-run always + geo(제주)→96.3, remember hidden, persist reload', async()=>{
    const { ctx, page } = await mk({ geolocation:JEJU, permissions:['geolocation'] });
    assert(await page.isVisible('#onboard'), 'onboard not shown on first run');
    await startAlways(page);
    await page.waitForFunction(()=>document.getElementById('cityName').textContent.trim()==='제주시',null,{timeout:6000});
    assert((await page.textContent('#freq')).includes('96.3'),'freq not 96.3');
    assert(!(await page.isVisible('#rememberBtn')),'remember should be hidden when not playing');
    await page.screenshot({ path: OUT+'/sim-player.png' });
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('#player:not(.hidden)',{timeout:5000});
    assert(await page.evaluate(()=>document.getElementById('onboard').classList.contains('hidden')),'re-onboarded after reload');
    assert(await page.evaluate(k=>localStorage.getItem(k)==='제주시', K.city),'city not persisted');
    noErr(page); await ctx.close();
  });

  // S2 first run, ask mode, geo Seoul → tap banner applies location
  await scenario('S2 first-run ask + geo(서울): tap banner → 93.1', async()=>{
    const { ctx, page } = await mk({ geolocation:SEOUL, permissions:['geolocation'] });
    await page.waitForSelector('#onboard');
    await page.click('#choice .choice__opt[data-mode="ask"]');
    await page.click('#obCta');
    await page.waitForSelector('#player:not(.hidden)');
    // ask mode on first run also calls requestLocationOnce immediately
    await page.waitForFunction(()=>document.getElementById('cityName').textContent.trim()==='서울/경기/인천',null,{timeout:6000});
    assert((await page.textContent('#freq')).includes('93.1'),'seoul freq wrong');
    noErr(page); await ctx.close();
  });

  // S3 geo denied → app usable, manual works
  await scenario('S3 geo denied → no crash, default city, manual select works', async()=>{
    const { ctx, page } = await mk({ permissions:[] }); // no geolocation permission
    await startAlways(page);
    await page.waitForTimeout(600);
    const c = await cityOf(page);
    assert(c==='내 주파수' || c.length>0, 'city missing after denied geo');
    await page.click('#settingsBtn'); await page.waitForSelector('#setSheet.is-open');
    await page.click('#manualGrid .rgn[data-city="대구"]');
    await page.waitForFunction(()=>document.getElementById('cityName').textContent.trim()==='대구',null,{timeout:4000});
    assert((await page.textContent('#freq')).includes('89.7'),'daegu freq wrong');
    noErr(page); await ctx.close();
  });

  // S4 no geolocation API → guarded, no crash
  await scenario('S4 geolocation API absent → guarded, player works', async()=>{
    const { ctx, page } = await mk({ noGeoApi:true });
    await startAlways(page);
    await page.waitForTimeout(300);
    assert(await page.isVisible('#player'),'player not visible');
    noErr(page); await ctx.close();
  });

  // S5 nationwide nearest: Busan & Seogwipo
  await scenario('S5 nationwide nearest: 부산→92.7', async()=>{
    const { ctx, page } = await mk({ geolocation:BUSAN, permissions:['geolocation'] });
    await startAlways(page);
    await page.waitForFunction(()=>document.getElementById('cityName').textContent.trim()==='부산',null,{timeout:6000});
    assert((await page.textContent('#freq')).includes('92.7'),'busan wrong');
    noErr(page); await ctx.close();
  });
  await scenario('S5b nationwide nearest: 서귀포→99.9', async()=>{
    const { ctx, page } = await mk({ geolocation:SEOGWIPO, permissions:['geolocation'] });
    await startAlways(page);
    await page.waitForFunction(()=>document.getElementById('cityName').textContent.trim()==='서귀포',null,{timeout:6000});
    assert((await page.textContent('#freq')).includes('99.9'),'seogwipo wrong');
    noErr(page); await ctx.close();
  });

  // S6 history: empty, add, YouTube href, CAP=50, delete one, delete all, persist
  await scenario('S6 history empty→add→youtube href', async()=>{
    const { ctx, page } = await mk({ geolocation:JEJU, permissions:['geolocation'] });
    await startAlways(page);
    await page.click('#histBtn'); await page.waitForSelector('#histSheet.is-open');
    assert(await page.isVisible('.hist-empty'),'empty state missing');
    await page.click('#scrim'); await page.waitForTimeout(200);
    // reveal remember + add one
    await page.evaluate(()=>{ document.getElementById('player').classList.add('is-playing'); document.getElementById('rememberBtn').classList.add('is-shown'); });
    await page.click('#rememberBtn');
    await page.waitForFunction(()=>document.getElementById('histCount').textContent==='1',null,{timeout:4000});
    await page.click('#histBtn'); await page.waitForSelector('#histSheet.is-open');
    const href = await page.getAttribute('#histSheet .hist-card__yt','href');
    assert(href && href.startsWith('https://www.youtube.com/results?search_query='),'bad yt href');
    assert(decodeURIComponent(href).includes('KBS 클래식FM 선곡'),'yt query missing KBS 선곡: '+decodeURIComponent(href));
    await page.screenshot({ path: OUT+'/sim-history.png' });
    noErr(page); await ctx.close();
  });
  await scenario('S6b history CAP=50 (add 55 via app save path)', async()=>{
    const { ctx, page } = await mk({ geolocation:JEJU, permissions:['geolocation'] });
    await startAlways(page);
    await page.evaluate(()=>{ document.getElementById('player').classList.add('is-playing'); document.getElementById('rememberBtn').classList.add('is-shown'); });
    for(let i=0;i<55;i++){ await page.click('#rememberBtn'); }
    const len = await page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'[]').length, K.hist);
    assert(len===50, 'cap failed, stored='+len);
    const cnt = await page.textContent('#histCount');
    assert(cnt==='50','count not 50: '+cnt);
    noErr(page); await ctx.close();
  });
  await scenario('S6c delete one + delete all + persist across reload', async()=>{
    const { ctx, page } = await mk({ geolocation:JEJU, permissions:['geolocation'] });
    await startAlways(page);
    await page.evaluate(()=>{ document.getElementById('player').classList.add('is-playing'); document.getElementById('rememberBtn').classList.add('is-shown'); });
    await page.click('#rememberBtn'); await page.click('#rememberBtn'); await page.click('#rememberBtn');
    await page.waitForFunction(()=>document.getElementById('histCount').textContent==='3',null,{timeout:4000});
    // persist across reload
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('#player:not(.hidden)');
    assert((await page.textContent('#histCount'))==='3','history lost on reload');
    // delete one
    await page.click('#histBtn'); await page.waitForSelector('#histSheet.is-open');
    await page.click('#histSheet .hist-card .hist-card__del');
    await page.waitForFunction(()=>document.getElementById('histCount').textContent==='2',null,{timeout:4000});
    // delete all
    await page.click('#histClear');
    await page.waitForFunction(()=>document.getElementById('histCount').textContent==='0',null,{timeout:4000});
    assert(await page.isVisible('.hist-empty'),'empty state not shown after clear');
    noErr(page); await ctx.close();
  });

  // S7 manual region persists after reload
  await scenario('S7 manual 부산 persists after reload', async()=>{
    const { ctx, page } = await mk({ permissions:[] });
    await startAlways(page);
    await page.click('#settingsBtn'); await page.waitForSelector('#setSheet.is-open');
    await page.click('#manualGrid .rgn[data-city="부산"]');
    await page.waitForFunction(()=>document.getElementById('cityName').textContent.trim()==='부산',null,{timeout:4000});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('#player:not(.hidden)');
    assert((await cityOf(page))==='부산','manual city not persisted');
    noErr(page); await ctx.close();
  });

  // S8 mode switch in settings
  await scenario('S8 settings mode toggle ask↔always (aria)', async()=>{
    const { ctx, page } = await mk({ permissions:[] });
    await startAlways(page);
    await page.click('#settingsBtn'); await page.waitForSelector('#setSheet.is-open');
    await page.click('#modeRow .mode-opt[data-mode="ask"]');
    assert(await page.getAttribute('#modeRow .mode-opt[data-mode="ask"]','aria-checked')==='true','ask not checked');
    await page.click('#modeRow .mode-opt[data-mode="always"]');
    assert(await page.getAttribute('#modeRow .mode-opt[data-mode="always"]','aria-checked')==='true','always not checked');
    noErr(page); await ctx.close();
  });

  // S9 sleep timer set/clear
  await scenario('S9 sleep timer set 30 → active, then off', async()=>{
    const { ctx, page } = await mk({ permissions:[] });
    await startAlways(page);
    await page.click('#sleepBtn'); await page.waitForSelector('#sleepPop:not([hidden])');
    await page.click('#sleepPop button[data-min="30"]');
    await page.waitForFunction(()=>document.getElementById('sleepBtn').classList.contains('is-active'),null,{timeout:3000});
    await page.click('#sleepBtn'); await page.waitForSelector('#sleepPop:not([hidden])');
    await page.click('#sleepPop button[data-min="0"]');
    await page.waitForFunction(()=>!document.getElementById('sleepBtn').classList.contains('is-active'),null,{timeout:3000});
    noErr(page); await ctx.close();
  });

  // S10 interruption banner + hide on playing event
  await scenario('S10 interruption: pause→banner, playing→hide', async()=>{
    const { ctx, page } = await mk({ permissions:[] });
    await startAlways(page);
    // make play() succeed so intendPlaying stays true (no real audio in headless)
    await page.evaluate(()=>{
      const a=document.getElementById('audio');
      a.canPlayType=()=>'maybe';
      a.play=()=>Promise.resolve();
    });
    await page.click('#playBtn');
    await page.waitForTimeout(200);
    await page.evaluate(()=>document.getElementById('audio').dispatchEvent(new Event('pause')));
    await page.waitForFunction(()=>document.getElementById('interrupt').classList.contains('is-shown'),null,{timeout:3000});
    await page.evaluate(()=>document.getElementById('audio').dispatchEvent(new Event('playing')));
    await page.waitForFunction(()=>!document.getElementById('interrupt').classList.contains('is-shown'),null,{timeout:3000});
    noErr(page); await ctx.close();
  });

  // S11 play fallback → external player opened
  await scenario('S11 play fallback (no HLS)→ window.open(streamUrl)', async()=>{
    const { ctx, page } = await mk({ permissions:[] });
    await startAlways(page);
    await page.evaluate(()=>{ document.getElementById('audio').canPlayType=()=>''; });
    await page.click('#playBtn');
    await page.waitForFunction(()=>Array.isArray(window.__opened)&&window.__opened.length>0,null,{timeout:4000});
    const opened = await page.evaluate(()=>window.__opened[0]);
    assert(String(opened).includes('kbs.co.kr'),'fallback not KBS: '+opened);
    noErr(page); await ctx.close();
  });

  // S12 stations.json fails → FALLBACK regions
  await scenario('S12 stations.json fail → FALLBACK loads (regions present)', async()=>{
    const { ctx, page } = await mk({ permissions:[], blockStations:true });
    await startAlways(page);
    await page.click('#settingsBtn'); await page.waitForSelector('#setSheet.is-open');
    const n = await page.$$eval('#manualGrid .rgn', e=>e.length);
    assert(n>=20,'fallback regions <20: '+n);
    noErr(page); await ctx.close();
  });

  // S13 returning user, ask mode → tap banner present
  await scenario('S13 returning ask-mode → location tap banner shown', async()=>{
    const { ctx, page } = await mk({ geolocation:SEOUL, permissions:['geolocation'], storage:{ [K.onboarded]:'1', [K.mode]:'ask' } });
    await page.waitForSelector('#player:not(.hidden)');
    await page.waitForFunction(()=>document.getElementById('interrupt').classList.contains('is-shown'),null,{timeout:3000});
    const txt = await page.textContent('#interruptText');
    assert(txt.includes('현재 위치'),'ask banner text wrong: '+txt);
    noErr(page); await ctx.close();
  });

  // S14 keyboard: Enter on stage toggles play (fallback opens)
  await scenario('S14 keyboard Enter on stage triggers toggle', async()=>{
    const { ctx, page } = await mk({ permissions:[] });
    await startAlways(page);
    await page.evaluate(()=>{ document.getElementById('audio').canPlayType=()=>''; });
    await page.focus('#stage');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>Array.isArray(window.__opened)&&window.__opened.length>0,null,{timeout:4000});
    noErr(page); await ctx.close();
  });

  // S15 onboarding choice toggle reflects selection
  await scenario('S15 onboarding choice toggle aria/selected', async()=>{
    const { ctx, page } = await mk({ permissions:[] });
    await page.waitForSelector('#onboard');
    await page.click('#choice .choice__opt[data-mode="ask"]');
    assert(await page.getAttribute('#choice .choice__opt[data-mode="ask"]','aria-checked')==='true','ask not selected');
    await page.click('#choice .choice__opt[data-mode="always"]');
    assert(await page.getAttribute('#choice .choice__opt[data-mode="always"]','aria-checked')==='true','always not selected');
    noErr(page); await ctx.close();
  });

  await browser.close();
  console.log('\n================ SIMULATION SUMMARY ================');
  console.log('PASS='+PASS+'  FAIL='+FAIL+'  TOTAL='+(PASS+FAIL));
  console.log('RESULT: '+(FAIL===0?'ALL_FLOWS_OK':'HAS_FAILURES'));
  process.exit(FAIL===0?0:1);
})().catch(e=>{ console.error('SIM_ABORTED', e.message, e.stack); process.exit(2); });
