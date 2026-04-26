/* Quant Lab dashboard — fetches /quant/data/*.json and renders. No build step. */

const PHASES = [
  { num: 'PHASE 1', name: '인프라 구축', detail: '16-에이전트 + 대시보드 + 자기개선 루프' },
  { num: 'PHASE 2', name: '페이퍼 검증', detail: 'KIS 모의투자 3~6개월, OOS 검증' },
  { num: 'PHASE 3', name: '소액 실거래', detail: '의도자본 5~10%부터 점진 확대' },
  { num: 'PHASE 4', name: '정상 운영 + 자기개선', detail: '자본 증대, 전략 추가, 메타 최적화' },
];

const AGENTS = [
  { name: 'Universe Curator', role: 'KOSPI 시총·유동성 필터', status: 'done', kind: 'det' },
  { name: 'Data Engineer', role: 'pykrx OHLCV 캐시', status: 'done', kind: 'det' },
  { name: 'Strategy Runner', role: '4-strategy ensemble', status: 'done', kind: 'det' },
  { name: 'Balance Fetcher', role: 'KIS 잔고/시세 (또는 Sim)', status: 'done', kind: 'det' },
  { name: 'Risk Manager', role: '사이징 + 일일 한도', status: 'done', kind: 'det' },
  { name: 'Execution Trader', role: 'KIS 또는 SimulatedBroker', status: 'done', kind: 'det' },
  { name: 'Performance Analyst', role: '일일 P&L 기록', status: 'done', kind: 'det' },
  { name: 'Statistical Skeptic', role: 'bootstrap CI / DSR / look-ahead', status: 'done', kind: 'crit' },
  { name: 'Regime Skeptic', role: 'rolling Sharpe / drawdown 기간', status: 'done', kind: 'crit' },
  { name: 'Cost Skeptic', role: 'turnover / slippage stress', status: 'done', kind: 'crit' },
  { name: 'Microstructure Skeptic', role: 'tick / 유동성 / 가격 drift (live block)', status: 'done', kind: 'crit' },
  { name: 'Strategy Researcher', role: '새 가설 제안 (LLM, prompt ready)', status: 'pending', kind: 'llm' },
  { name: 'CIO', role: '채택/폐기 결정 (LLM, prompt ready)', status: 'pending', kind: 'llm' },
  { name: 'CRO', role: '리스크 거부권 (LLM, prompt ready)', status: 'pending', kind: 'llm' },
  { name: 'CTO', role: '코드 리뷰 (LLM, prompt ready)', status: 'pending', kind: 'llm' },
  { name: 'Meta-Optimizer', role: '프롬프트 자기개선 (LLM, prompt ready)', status: 'pending', kind: 'llm' },
];

const STRATEGIES = [
  { name: 'Cross-sectional Momentum', weight: 0.40, type: '추세', desc: '12-1 모멘텀 상위 N 동일비중' },
  { name: 'Mean Reversion', weight: 0.20, type: '역행', desc: '20일 z-score ≤ -1.5 oversold long' },
  { name: 'Low Volatility', weight: 0.25, type: '방어', desc: '60일 변동성 하위 + 양의 수익률' },
  { name: 'Volatility Breakout', weight: 0.15, type: '단타', desc: 'Larry Williams K=0.55, MA20 추세 필터' },
];

function fmtKRW(n) {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + ' 억';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + ' 만';
  return Math.round(n).toLocaleString('ko-KR');
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + (n * 100).toFixed(2) + '%';
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' });
  } catch { return iso; }
}

async function fetchJSON(path) {
  try {
    const r = await fetch(path + '?t=' + Date.now(), { cache: 'no-cache' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    console.warn('fetch failed', path, e);
    return null;
  }
}

function renderPhases(currentPhase) {
  const root = document.getElementById('phase-strip');
  root.innerHTML = PHASES.map((p, i) => {
    let cls = '';
    if (i + 1 < currentPhase) cls = 'phase__step--done';
    else if (i + 1 === currentPhase) cls = 'phase__step--active';
    return `<div class="phase__step ${cls}">
      <div class="phase__num">${p.num}</div>
      <div class="phase__name">${p.name}</div>
      <div class="phase__detail">${p.detail}</div>
    </div>`;
  }).join('');
}

function renderAgents(meta) {
  const total = (meta?.agents?.deterministic_backbone || 0) + (meta?.agents?.deterministic_critics || 0) + (meta?.agents?.llm_council || 0);
  document.getElementById('agent-progress').textContent = `${total} / ${meta?.agents?.target || 16} active`;
  const root = document.getElementById('agents-grid');
  root.innerHTML = AGENTS.map(a => {
    const cls = a.status === 'done' ? 'agent--done' : 'agent--pending';
    return `<div class="agent ${cls}">
      <div class="agent__name">${a.name}</div>
      <div class="agent__role">${a.role}</div>
    </div>`;
  }).join('');
}

function renderStatus(meta) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const sys = meta?.system || {};
  if (sys.trading_allowed === false) {
    dot.classList.add('pulse--blocked');
    text.textContent = `🛑 trading paused · ${sys.blocked_reason || ''}`;
  } else {
    dot.classList.remove('pulse--blocked');
    text.textContent = `live · last update ${fmtTime(meta?.last_updated)}`;
  }
  document.getElementById('today-stamp').textContent = fmtTime(meta?.last_updated);
}

function renderEquity(equity) {
  const chart = echarts.init(document.getElementById('equity-chart'));
  const points = (equity?.points || []).filter(p => p.equity != null);

  if (points.length === 0) {
    chart.setOption({
      graphic: {
        type: 'text',
        left: 'center', top: 'middle',
        style: { text: '데이터 누적 대기 중\n(첫 daily cycle 이후 표시)', fontSize: 14, fill: '#9A9A9A', textAlign: 'center', lineHeight: 22 },
      },
    });
    return;
  }
  const dates = points.map(p => p.date);
  const equities = points.map(p => p.equity);
  chart.setOption({
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    tooltip: { trigger: 'axis', valueFormatter: fmtKRW },
    xAxis: { type: 'category', data: dates, boundaryGap: false, axisLine: { lineStyle: { color: '#D6D3CA' } }, axisLabel: { color: '#6B6B6B', fontSize: 11 } },
    yAxis: { type: 'value', scale: true, axisLine: { show: false }, splitLine: { lineStyle: { color: '#E8E6E0', type: 'dashed' } }, axisLabel: { color: '#6B6B6B', fontSize: 11, formatter: fmtKRW } },
    series: [{ data: equities, type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#10803D', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,128,61,.18)' }, { offset: 1, color: 'rgba(16,128,61,.01)' }] } } }],
  });
  window.addEventListener('resize', () => chart.resize());
}

function renderKpis(equity) {
  const points = equity?.points || [];
  if (points.length === 0) return;
  const last = points[points.length - 1];
  document.getElementById('kpi-equity').textContent = fmtKRW(last.equity);
  const pnlEl = document.getElementById('kpi-pnl');
  pnlEl.textContent = (last.pnl > 0 ? '+' : '') + fmtKRW(last.pnl);
  pnlEl.classList.add(last.pnl > 0 ? 'kpi__value--up' : (last.pnl < 0 ? 'kpi__value--dn' : 'kpi__value--neutral'));
  document.getElementById('kpi-pnl-sub').textContent = fmtPct(last.pnl_pct);
  document.getElementById('kpi-cycles').textContent = points.length;
}

function renderDecisions(decisions) {
  const tbody = document.getElementById('decisions-tbody');
  const rows = (decisions?.decisions || []).slice(0, 10);
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">데이터 대기 중</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const okBadge = r.errors.length === 0 ? '<span class="badge badge--pass">OK</span>' : `<span class="badge badge--fail">${r.errors.length} err</span>`;
    return `<tr>
      <td title="${r.cycle_id}">${(r.cycle_id || '').slice(0, 24)}</td>
      <td>${r.phases_run.length}</td>
      <td>${r.intents_count}</td>
      <td>${okBadge}</td>
    </tr>`;
  }).join('');
}

function renderCritiques(crit) {
  const root = document.getElementById('critiques-list');
  const items = (crit?.critiques || []).slice(0, 8);
  if (items.length === 0) {
    root.innerHTML = '<div class="empty"><div class="empty__icon">🔎</div>아직 비판 리포트 없음</div>';
    return;
  }
  root.innerHTML = items.map(c => {
    const badge = c.worst_verdict || 'pass';
    return `<div class="crit">
      <div class="crit__main">
        <div class="crit__name">${c.critic} <span style="color:var(--c-mute2);font-size:.78rem">· ${c.target || ''}</span></div>
        <div class="crit__detail">${c.n_findings} findings · ${fmtTime(c.ts)}</div>
      </div>
      <span class="badge badge--${badge}">${badge}</span>
    </div>`;
  }).join('');
}

function fmtAgo(hours) {
  if (hours == null || isNaN(hours)) return '—';
  if (hours < 1) return Math.round(hours * 60) + 'm ago';
  if (hours < 48) return hours.toFixed(1) + 'h ago';
  return (hours / 24).toFixed(1) + 'd ago';
}

function renderHeartbeat(hb) {
  if (!hb) return;
  document.getElementById('hb-last').textContent = fmtAgo(hb.stale_hours_since_last_cycle);
  document.getElementById('hb-uptime').textContent = (hb.uptime_days != null ? hb.uptime_days + 'd · ' : '') + (hb.n_cycles_total || 0) + ' cycles';
  const healthEl = document.getElementById('hb-health');
  if (hb.is_healthy) {
    healthEl.textContent = '✓ healthy';
    healthEl.style.color = 'var(--c-accent)';
  } else {
    healthEl.textContent = '⚠ stale';
    healthEl.style.color = 'var(--c-fail)';
  }
}

function renderStrategies() {
  const root = document.getElementById('strategies-list');
  if (!root) return;
  root.innerHTML = STRATEGIES.map(s => {
    const pct = (s.weight * 100).toFixed(0);
    return `<div style="padding:12px 14px;border-radius:10px;background:var(--c-bg);border:1px solid var(--c-line);display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.92rem">${s.name} <span style="font-size:.7rem;color:var(--c-mute2);font-weight:500;letter-spacing:.05em;text-transform:uppercase">· ${s.type}</span></div>
        <div style="font-size:.78rem;color:var(--c-mute);margin-top:3px">${s.desc}</div>
      </div>
      <div class="mono" style="font-weight:700;color:var(--c-accent);font-size:.95rem">${pct}%</div>
    </div>`;
  }).join('');
}

function renderCouncil(c) {
  const summaryEl = document.getElementById('council-summary');
  const detailEl = document.getElementById('council-detail');
  const whenEl = document.getElementById('council-when');
  if (!c || !c.consensus) {
    summaryEl.textContent = '의회 미개최';
    return;
  }
  whenEl.textContent = c.date || 'pending';
  summaryEl.textContent = c.consensus.cycle_summary || '—';
  const adopted = (c.consensus.adopted_strategies || []).length;
  const vetoes = (c.consensus.vetoes || []).length;
  detailEl.innerHTML = `
    <span><strong style="color:var(--c-fg)">${adopted}</strong> 채택</span>
    <span><strong style="color:var(--c-fg)">${vetoes}</strong> veto</span>
    <span style="color:var(--c-mute2)">· ${c.path || 'dry-run'}</span>
  `;
}

async function load() {
  const [meta, equity, decisions, critiques, heartbeat, council] = await Promise.all([
    fetchJSON('./data/meta.json'),
    fetchJSON('./data/equity.json'),
    fetchJSON('./data/decisions.json'),
    fetchJSON('./data/critiques.json'),
    fetchJSON('./data/heartbeat.json'),
    fetchJSON('./data/council-latest.json'),
  ]);

  renderPhases(meta?.phase || 1);
  renderStatus(meta || {});
  renderAgents(meta || {});
  renderEquity(equity || {});
  renderKpis(equity || {});
  renderDecisions(decisions || {});
  renderCritiques(critiques || {});
  renderHeartbeat(heartbeat);
  renderStrategies();
  renderCouncil(council);
}

load();
// auto-refresh every 5 minutes (page typically left open)
setInterval(load, 5 * 60 * 1000);
