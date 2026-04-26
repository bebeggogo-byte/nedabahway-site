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
  { name: 'Regime Classifier', role: 'KOSPI 200dMA + vol + dd 체제 감지', status: 'done', kind: 'det' },
  { name: 'Strategy Runner', role: '5-strategy ensemble', status: 'done', kind: 'det' },
  { name: 'Balance Fetcher', role: 'KIS 잔고/시세 (또는 Sim)', status: 'done', kind: 'det' },
  { name: 'Risk Manager', role: '사이징 + 일일 한도 + capital scale', status: 'done', kind: 'det' },
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
  { name: 'Cross-sectional Momentum', weight: 0.30, type: '추세', desc: '12-1 모멘텀 상위 N 동일비중' },
  { name: 'Mean Reversion', weight: 0.15, type: '역행', desc: '20일 z-score ≤ -1.5 oversold long' },
  { name: 'Low Volatility', weight: 0.20, type: '방어', desc: '60일 변동성 하위 + 양의 수익률' },
  { name: 'Volatility Breakout', weight: 0.15, type: '단타', desc: 'Larry Williams K=0.55, MA20 추세 필터' },
  { name: 'Quality Value', weight: 0.20, type: '펀더멘털', desc: '저PBR + 고ROE z-score 결합 (Fama-French Quality)' },
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

const REGIME_COLORS = {
  bull: 'var(--c-accent)',
  bear: 'var(--c-fail)',
  choppy: 'var(--c-warn)',
  normal: 'var(--c-mute)',
};

const DD_BAND_COLORS = {
  normal: 'var(--c-accent)',
  alert: 'var(--c-warn)',
  defensive: 'var(--c-warn)',
  strong_defense: 'var(--c-fail)',
  halt: 'var(--c-fail)',
  insufficient_data: 'var(--c-mute2)',
};

function renderDrawdownDefense(data) {
  const root = document.getElementById('dd-summary');
  const whenEl = document.getElementById('dd-when');
  if (!root) return;
  const items = (data && data.history) || [];
  const cur = data ? data.current : null;
  if (!cur) {
    root.innerHTML = '<div class="empty">실현 자본 곡선 데이터 누적 대기 중</div>';
    if (whenEl) whenEl.textContent = '—';
    return;
  }
  if (whenEl) whenEl.textContent = cur.as_of;
  const color = DD_BAND_COLORS[cur.band] || 'var(--c-mute)';
  const bandLabel = {
    normal: '정상', alert: '경고', defensive: '방어',
    strong_defense: '강한 방어', halt: '중단',
    insufficient_data: '데이터 누적 중',
  }[cur.band] || cur.band;
  root.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:12px;background:var(--c-bg);border-left:5px solid ${color}">
      <div style="flex:0 0 auto">
        <div class="mono" style="font-size:.7rem;font-weight:700;letter-spacing:.05em;color:${color};text-transform:uppercase">${bandLabel}</div>
        <div style="font-family:var(--ff-serif);font-weight:700;font-size:1.4rem;line-height:1.1;margin-top:2px">DD ${(cur.current_drawdown*100).toFixed(2)}%</div>
      </div>
      <div style="flex:1;font-size:.84rem;color:var(--c-mute);line-height:1.5">
        DD scale <strong style="color:var(--c-fg)">${(cur.dd_scale*100).toFixed(0)}%</strong> ×
        Regime <strong style="color:var(--c-fg)">${(cur.regime_scale*100).toFixed(0)}%</strong> =
        <strong style="color:var(--c-accent)">${(cur.combined_scale*100).toFixed(0)}%</strong> 최종 자본
      </div>
    </div>
    <div id="dd-history-strip" style="display:flex;gap:2px;height:18px;border-radius:5px;overflow:hidden"></div>
    <div style="font-size:.72rem;color:var(--c-mute2);text-align:right">최근 ${items.slice(-60).length}일 DD band</div>
  `;
  const strip = document.getElementById('dd-history-strip');
  if (strip) {
    strip.innerHTML = items.slice(-60).map(s => {
      const c = DD_BAND_COLORS[s.band] || 'var(--c-mute)';
      return `<div title="${s.as_of}: dd ${(s.current_drawdown*100).toFixed(1)}% · ${s.band} · scale ${(s.combined_scale*100).toFixed(0)}%" style="flex:1;background:${c};opacity:0.7"></div>`;
    }).join('');
  }
}

const CORR_SEVERITY_COLORS = {
  ok: 'var(--c-accent)',
  warn: 'var(--c-warn)',
  fail: 'var(--c-fail)',
};

function renderCorrelation(data) {
  const root = document.getElementById('corr-summary');
  const whenEl = document.getElementById('corr-when');
  if (!root) return;
  const cur = data ? data.current : null;
  if (!cur || cur.matrix == null || Object.keys(cur.matrix).length < 2) {
    root.innerHTML = '<div class="empty">전략 daily P&L 시계열 누적 대기 중 (최소 20일/전략)</div>';
    if (whenEl) whenEl.textContent = '—';
    return;
  }
  if (whenEl) whenEl.textContent = cur.as_of;
  const color = CORR_SEVERITY_COLORS[cur.severity] || 'var(--c-mute)';
  const sevLabel = { ok: '정상', warn: '주의', fail: '동조화 경고' }[cur.severity] || cur.severity;

  const strats = Object.keys(cur.matrix).sort();
  const cellColor = (v) => {
    if (v == null) return 'var(--c-line)';
    if (v >= 0.85) return 'var(--c-fail)';
    if (v >= 0.70) return 'var(--c-fail-soft)';
    if (v >= 0.50) return 'var(--c-warn-soft)';
    if (v >= 0.30) return 'var(--c-line)';
    if (v >= 0) return 'var(--c-accent-soft)';
    return 'var(--c-insight-soft)';
  };
  let table = '<table style="border-collapse:collapse;font-size:.78rem;font-family:var(--ff-mono)"><thead><tr><th></th>';
  for (const s of strats) {
    table += `<th style="padding:6px 4px;color:var(--c-mute);text-align:center;font-size:.7rem">${s.slice(0, 12)}</th>`;
  }
  table += '</tr></thead><tbody>';
  for (const a of strats) {
    table += `<tr><th style="padding:6px 8px;color:var(--c-mute);text-align:right;font-size:.7rem;font-weight:600">${a.slice(0, 12)}</th>`;
    for (const b of strats) {
      const v = cur.matrix[a] && cur.matrix[a][b];
      const isDiag = a === b;
      const txt = v == null ? '—' : v.toFixed(2);
      const bg = isDiag ? 'var(--c-line)' : cellColor(v);
      const fg = (v != null && Math.abs(v) > 0.7) ? '#fff' : 'var(--c-fg)';
      table += `<td style="padding:6px 8px;text-align:center;background:${bg};color:${fg};border:1px solid var(--c-bg);min-width:54px">${txt}</td>`;
    }
    table += '</tr>';
  }
  table += '</tbody></table>';

  const avg = cur.avg != null ? cur.avg.toFixed(2) : '—';
  const max = cur.max != null ? cur.max.toFixed(2) : '—';
  const pair = cur.max_pair ? `${cur.max_pair[0]} ↔ ${cur.max_pair[1]}` : '—';

  root.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:10px;background:var(--c-bg);border-left:5px solid ${color}">
      <div>
        <div class="mono" style="font-size:.7rem;font-weight:700;letter-spacing:.05em;color:${color};text-transform:uppercase">${sevLabel}</div>
        <div style="font-family:var(--ff-serif);font-weight:700;font-size:1.2rem;line-height:1.1;margin-top:2px">평균 ${avg} · 최대 ${max}</div>
      </div>
      <div style="flex:1;font-size:.82rem;color:var(--c-mute);line-height:1.5">
        최대 페어: <strong style="color:var(--c-fg)">${pair}</strong>
        · capital scale ${(cur.scale*100).toFixed(0)}%
        · 결합 ${(cur.combined_scale*100).toFixed(0)}%
      </div>
    </div>
    <div style="overflow-x:auto">${table}</div>
    <div style="font-size:.72rem;color:var(--c-mute2)">상관계수: 녹색 ↔ 분산 / 노랑 ↔ 주의 / 빨강 ↔ 동조화 경고. 대각선은 자기상관 (1.0).</div>
  `;
}

const LIFECYCLE_COLORS = {
  proposal: 'var(--c-mute2)',
  validating: 'var(--c-insight)',
  probation: 'var(--c-warn)',
  active: 'var(--c-accent)',
  retired: 'var(--c-fail)',
};

const LIFECYCLE_LABELS = {
  proposal: '제안',
  validating: '검증중',
  probation: '시범운영',
  active: '운영중',
  retired: '폐기',
};

function renderLifecycle(data) {
  const root = document.getElementById('lifecycle-summary');
  const whenEl = document.getElementById('lifecycle-when');
  if (!root) return;
  const strategies = (data && data.strategies) || {};
  const names = Object.keys(strategies).sort();
  if (names.length === 0) {
    root.innerHTML = '<div class="empty">전략 레지스트리 미초기화</div>';
    if (whenEl) whenEl.textContent = '—';
    return;
  }
  if (whenEl) whenEl.textContent = data.updated_at ? data.updated_at.slice(0, 10) : '—';
  const counts = { proposal: 0, validating: 0, probation: 0, active: 0, retired: 0 };
  for (const name of names) {
    counts[strategies[name].state] = (counts[strategies[name].state] || 0) + 1;
  }
  const summary = `<div style="display:flex;gap:18px;flex-wrap:wrap;font-size:.84rem;color:var(--c-mute);padding-bottom:8px;border-bottom:1px solid var(--c-line)">
    ${Object.entries(counts).filter(([_, c]) => c > 0).map(([s, c]) =>
      `<span><span class="mono" style="color:${LIFECYCLE_COLORS[s]};font-weight:700">${c}</span> ${LIFECYCLE_LABELS[s]}</span>`
    ).join('')}
  </div>`;
  const cards = names.map(name => {
    const s = strategies[name];
    const color = LIFECYCLE_COLORS[s.state] || 'var(--c-mute)';
    const label = LIFECYCLE_LABELS[s.state] || s.state;
    const cap = (s.weight_cap * 100).toFixed(0);
    const sourceLabel = s.proposal_source === 'default' ? '기본' :
                        s.proposal_source === 'researcher_llm' ? 'LLM 제안' :
                        s.proposal_source === 'manual' ? '수동' : s.proposal_source;
    const enteredDate = s.entered_state_at ? s.entered_state_at.slice(0, 10) : '—';
    const lastTransition = (s.history && s.history.length > 0) ? s.history[s.history.length - 1] : null;
    return `<div style="padding:10px 14px;border-radius:10px;background:var(--c-bg);border:1px solid var(--c-line);border-left:4px solid ${color};display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:140px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-weight:600;font-size:.92rem">${name}</span>
          <span class="mono" style="font-size:.7rem;font-weight:700;letter-spacing:.05em;color:${color};text-transform:uppercase">${label}</span>
        </div>
        <div style="font-size:.74rem;color:var(--c-mute);margin-top:3px">${sourceLabel} · 진입 ${enteredDate}</div>
      </div>
      <div class="mono" style="font-size:.78rem;color:var(--c-mute);text-align:right">
        weight cap <strong style="color:var(--c-fg)">${cap}%</strong>
        ${lastTransition && lastTransition.reason ? `<div style="font-size:.7rem;color:var(--c-mute2);max-width:280px">${lastTransition.reason}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  root.innerHTML = summary + cards;
}

const ANOMALY_TYPE_LABELS = {
  equity_outlier: '자본 이상',
  signal_divergence: '신호 발산',
  turnover_spike: '거래 폭주',
  critique_burst: '비판 급증',
  data_freshness: '데이터 stale',
};

const ANOMALY_SEV_COLORS = {
  info: 'var(--c-mute)',
  warn: 'var(--c-warn)',
  fail: 'var(--c-fail)',
};

function renderAnomalies(data) {
  const root = document.getElementById('anomaly-summary');
  const whenEl = document.getElementById('anomaly-when');
  if (!root) return;
  const current = (data && data.current) || [];
  const history = (data && data.history) || [];
  if (whenEl) whenEl.textContent = current.length > 0 ? `${current.length} active` : 'all clear';

  if (current.length === 0 && history.length === 0) {
    root.innerHTML = '<div class="empty">⚪ 데이터 누적 대기 중 (cycle 운영 후 시작)</div>';
    return;
  }
  let block = '';
  if (current.length > 0) {
    block += `<div style="font-size:.78rem;color:var(--c-mute);text-transform:uppercase;letter-spacing:.05em;font-weight:600">현재 발견 (${current.length})</div>`;
    block += current.map(a => {
      const c = ANOMALY_SEV_COLORS[a.severity] || 'var(--c-mute)';
      const label = ANOMALY_TYPE_LABELS[a.type] || a.type;
      return `<div style="padding:12px 14px;border-radius:10px;background:var(--c-bg);border-left:5px solid ${c}">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px">
          <span style="font-weight:600;font-size:.92rem">${label} <span class="mono" style="font-size:.72rem;color:var(--c-mute2)">${a.metric}</span></span>
          <span class="mono" style="font-size:.7rem;font-weight:700;color:${c}">${a.severity.toUpperCase()}</span>
        </div>
        <div style="font-size:.82rem;color:var(--c-mute);line-height:1.5;margin-top:5px">${a.rationale}</div>
        <div class="mono" style="font-size:.72rem;color:var(--c-mute2);margin-top:3px">value=${a.value} · threshold=${a.threshold}</div>
      </div>`;
    }).join('');
  } else {
    block += '<div style="padding:14px 16px;border-radius:10px;background:var(--c-accent-soft);border-left:5px solid var(--c-accent);font-size:.86rem">✅ 현재 이상 없음</div>';
  }
  if (history.length > 0) {
    const recent = history.slice(-5).reverse();
    block += `<div style="font-size:.78rem;color:var(--c-mute);text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-top:8px">최근 history (${history.length})</div>`;
    block += '<div style="display:flex;flex-direction:column;gap:4px">';
    for (const a of recent) {
      const c = ANOMALY_SEV_COLORS[a.severity] || 'var(--c-mute)';
      const label = ANOMALY_TYPE_LABELS[a.type] || a.type;
      const dt = a.detected_at ? a.detected_at.slice(0, 16).replace('T', ' ') : '—';
      block += `<div style="padding:6px 10px;border-radius:6px;background:var(--c-bg);font-size:.78rem;display:flex;justify-content:space-between;gap:10px">
        <span class="mono" style="color:var(--c-mute2);font-size:.72rem">${dt}</span>
        <span style="flex:1;color:${c}">${label}</span>
        <span class="mono" style="font-size:.7rem;color:var(--c-mute2)">${a.value}</span>
      </div>`;
    }
    block += '</div>';
  }
  root.innerHTML = block;
}

function renderTCA(data) {
  const root = document.getElementById('tca-summary');
  const whenEl = document.getElementById('tca-when');
  if (!root) return;
  if (!data || !data.n_trades) {
    root.innerHTML = '<div class="empty">실집행 매매 누적 대기 중 (실거래 시 expected_price ↔ fill_price 비교)</div>';
    if (whenEl) whenEl.textContent = '—';
    return;
  }
  if (whenEl) whenEl.textContent = `${data.n_trades} trades`;
  const o = data.overall || {};
  const meanColor = o.mean_bps > 30 ? 'var(--c-fail)' :
                    o.mean_bps > 15 ? 'var(--c-warn)' : 'var(--c-accent)';
  const totalCost = o.total_cost_krw || 0;
  const costColor = totalCost > 0 ? 'var(--c-fail)' : 'var(--c-accent)';

  const summary = `
    <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));padding:14px 16px;border-radius:10px;background:var(--c-bg);border-left:5px solid ${meanColor}">
      <div>
        <div class="mono" style="font-size:.7rem;color:var(--c-mute);text-transform:uppercase">평균 슬리피지</div>
        <div style="font-family:var(--ff-serif);font-weight:700;font-size:1.3rem;color:${meanColor}">${o.mean_bps?.toFixed(1) || '—'} bp</div>
      </div>
      <div>
        <div class="mono" style="font-size:.7rem;color:var(--c-mute);text-transform:uppercase">중앙값</div>
        <div class="mono" style="font-weight:700;font-size:1.1rem;margin-top:3px">${o.median_bps?.toFixed(1) || '—'} bp</div>
      </div>
      <div>
        <div class="mono" style="font-size:.7rem;color:var(--c-mute);text-transform:uppercase">95%ile (worst)</div>
        <div class="mono" style="font-weight:700;font-size:1.1rem;margin-top:3px">${o.p95_bps?.toFixed(1) || '—'} bp</div>
      </div>
      <div>
        <div class="mono" style="font-size:.7rem;color:var(--c-mute);text-transform:uppercase">불리/유리</div>
        <div class="mono" style="font-size:.92rem;margin-top:3px">${o.n_adverse || 0} <span style="color:var(--c-mute2)">/</span> ${o.n_favorable || 0}</div>
      </div>
      <div>
        <div class="mono" style="font-size:.7rem;color:var(--c-mute);text-transform:uppercase">누적 비용</div>
        <div class="mono" style="font-weight:700;font-size:1.1rem;margin-top:3px;color:${costColor}">${fmtKRW(totalCost)}</div>
      </div>
    </div>
    <div style="font-size:.82rem;color:var(--c-mute);padding:0 4px">${data.rationale || ''}</div>
  `;

  // Per-strategy table
  const strats = Object.entries(data.by_strategy || {});
  let stratTable = '';
  if (strats.length) {
    stratTable = '<div style="font-size:.78rem;color:var(--c-mute);text-transform:uppercase;letter-spacing:.05em;margin-top:8px">전략별 평균 슬리피지</div>';
    stratTable += '<table class="tbl"><thead><tr><th>전략</th><th>거래</th><th>평균 bp</th><th>중앙값 bp</th><th>거래대금</th></tr></thead><tbody>';
    for (const [name, s] of strats.sort((a, b) => b[1].mean_bps - a[1].mean_bps)) {
      const c = s.mean_bps > 30 ? 'var(--c-fail)' : s.mean_bps > 15 ? 'var(--c-warn)' : 'var(--c-accent)';
      stratTable += `<tr><td>${name}</td><td>${s.n_trades}</td><td style="color:${c};font-weight:600">${s.mean_bps.toFixed(1)}</td><td>${s.median_bps.toFixed(1)}</td><td style="text-align:right">${fmtKRW(s.notional)}</td></tr>`;
    }
    stratTable += '</tbody></table>';
  }

  // Worst tickers
  const worst = data.worst_tickers || [];
  let worstBlock = '';
  if (worst.length) {
    worstBlock = '<div style="font-size:.78rem;color:var(--c-mute);text-transform:uppercase;letter-spacing:.05em;margin-top:8px">슬리피지 가장 큰 종목 (top 10)</div>';
    worstBlock += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    for (const w of worst) {
      const c = w.mean_bps > 30 ? 'var(--c-fail)' : w.mean_bps > 15 ? 'var(--c-warn)' : 'var(--c-mute)';
      worstBlock += `<span class="mono" style="font-size:.74rem;padding:4px 8px;border-radius:6px;background:var(--c-bg);border:1px solid var(--c-line);color:${c}"><strong>${w.ticker}</strong> ${w.mean_bps.toFixed(1)}bp <span style="color:var(--c-mute2)">×${w.n}</span></span>`;
    }
    worstBlock += '</div>';
  }

  root.innerHTML = summary + stratTable + worstBlock;
}

function renderRegime(history) {
  const root = document.getElementById('regime-summary');
  const whenEl = document.getElementById('regime-when');
  if (!root) return;
  const items = (history && history.history) || [];
  if (items.length === 0) {
    root.innerHTML = '<div class="empty">체제 데이터 누적 대기 중 (KOSPI 200d 필요)</div>';
    if (whenEl) whenEl.textContent = '—';
    return;
  }
  const latest = items[items.length - 1];
  if (whenEl) whenEl.textContent = latest.as_of;
  const color = REGIME_COLORS[latest.label] || 'var(--c-mute)';

  root.innerHTML = `
    <div style="display:flex;align-items:center;gap:18px;padding:16px 20px;border-radius:12px;background:var(--c-bg);border-left:6px solid ${color}">
      <div style="flex:0 0 auto">
        <div class="mono" style="font-size:.7rem;font-weight:700;letter-spacing:.06em;color:${color};text-transform:uppercase">${latest.label}</div>
        <div style="font-family:var(--ff-serif);font-weight:700;font-size:1.6rem;line-height:1.1;margin-top:2px;color:var(--c-fg)">자본 ${(latest.recommended_capital_scale*100).toFixed(0)}% 배치</div>
      </div>
      <div style="flex:1;font-size:.84rem;color:var(--c-mute);line-height:1.55">${latest.rationale}</div>
      <div class="mono" style="flex:0 0 auto;font-size:.74rem;color:var(--c-mute);text-align:right">
        <div>200dMA <strong style="color:${latest.above_200ma ? 'var(--c-accent)' : 'var(--c-fail)'}">${latest.above_200ma ? '↑' : '↓'} ${(latest.distance_from_200ma_pct*100).toFixed(1)}%</strong></div>
        <div>20d vol <strong style="color:var(--c-fg)">${(latest.realized_vol_20d_annualized*100).toFixed(1)}%</strong></div>
        <div>252d DD <strong style="color:${latest.drawdown_from_peak_252d > -0.05 ? 'var(--c-accent)' : 'var(--c-fail)'}">${(latest.drawdown_from_peak_252d*100).toFixed(1)}%</strong></div>
        <div style="margin-top:3px">신뢰도 <strong style="color:var(--c-fg)">${(latest.confidence*100).toFixed(0)}%</strong></div>
      </div>
    </div>
    <div id="regime-history-strip" style="display:flex;gap:2px;height:24px;border-radius:6px;overflow:hidden"></div>
    <div style="font-size:.72rem;color:var(--c-mute2);text-align:right">최근 ${items.slice(-60).length}일 체제 변천 (최신 →)</div>
  `;

  const strip = document.getElementById('regime-history-strip');
  if (strip) {
    strip.innerHTML = items.slice(-60).map(s => {
      const c = REGIME_COLORS[s.label] || 'var(--c-mute)';
      return `<div title="${s.as_of}: ${s.label} · ${(s.recommended_capital_scale*100).toFixed(0)}%" style="flex:1;background:${c};opacity:${0.4 + s.confidence * 0.6}"></div>`;
    }).join('');
  }
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

function renderPlan(plan) {
  const root = document.getElementById('plan-list');
  const whenEl = document.getElementById('plan-when');
  if (!root) return;
  if (!plan || !plan.active || !plan.active.target_weights || Object.keys(plan.active.target_weights).length === 0) {
    root.innerHTML = '<div class="empty">아직 신호 없음</div>';
    if (whenEl) whenEl.textContent = '—';
    return;
  }
  if (whenEl) whenEl.textContent = fmtTime(plan.active.ts);
  const weights = plan.active.target_weights;
  const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1]).slice(0, 12);
  root.innerHTML = sorted.map(([ticker, w]) => {
    const pct = (w * 100).toFixed(1);
    const bar = Math.min(w * 600, 100);
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--c-line)">
      <span class="mono" style="font-weight:600;font-size:.86rem;min-width:64px">${ticker}</span>
      <span style="flex:1;height:6px;background:var(--c-line);border-radius:3px;overflow:hidden"><span style="display:block;height:100%;width:${bar}%;background:var(--c-accent)"></span></span>
      <span class="mono" style="font-size:.78rem;color:var(--c-mute);min-width:50px;text-align:right">${pct}%</span>
    </div>`;
  }).join('');
}

function renderTrades(rt) {
  const tbody = document.getElementById('trades-tbody');
  if (!tbody) return;
  const trades = (rt?.trades || []).slice(0, 12);
  if (trades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">매매 대기 중</td></tr>';
    return;
  }
  tbody.innerHTML = trades.map(t => {
    const sideColor = t.side === 'buy' ? 'var(--c-accent)' : 'var(--c-copper)';
    const okMark = t.success !== false ? '' : ' <span style="color:var(--c-fail)">!</span>';
    return `<tr>
      <td style="color:var(--c-mute2);font-size:.78rem">${fmtTime(t.ts).slice(5,16)}</td>
      <td style="color:${sideColor};font-weight:700;font-size:.78rem">${(t.side||'').toUpperCase()}${okMark}</td>
      <td>${t.ticker || '—'}</td>
      <td style="text-align:right">${t.qty || '—'}</td>
      <td style="text-align:right">${t.fill_price ? Number(t.fill_price).toLocaleString('ko-KR') : '—'}</td>
    </tr>`;
  }).join('');
}

function renderAttribution(attr, pnl) {
  const root = document.getElementById('attribution-list');
  if (!root) return;
  const rows = attr?.by_strategy || [];
  const pnlByStrat = {};
  for (const p of (pnl?.by_strategy || [])) {
    pnlByStrat[p.strategy] = p;
  }
  if (rows.length === 0 && (!pnl || pnl.by_strategy.length === 0)) {
    root.innerHTML = '<div class="empty">데이터 누적 대기 중</div>';
    return;
  }
  // Merge: show all strategies that appear in either source
  const allStrats = new Set([...rows.map(r => r.strategy), ...Object.keys(pnlByStrat)]);
  const merged = Array.from(allStrats).map(name => {
    const a = rows.find(r => r.strategy === name) || { n_signals: 0, top_tickers: [] };
    const p = pnlByStrat[name] || null;
    return { strategy: name, ...a, pnl: p };
  });
  // Sort by realized P&L if available, else signal count
  merged.sort((x, y) => {
    const px = x.pnl?.realized_pnl || 0;
    const py = y.pnl?.realized_pnl || 0;
    if (px !== py) return py - px;
    return (y.n_signals || 0) - (x.n_signals || 0);
  });
  root.innerHTML = merged.map(r => {
    const tickers = (r.top_tickers || []).slice(0,4).map(t => `<span class="mono" style="font-size:.72rem;background:var(--c-line);padding:2px 6px;border-radius:5px;margin-right:3px">${t[0]}·${t[1]}</span>`).join('');
    let pnlBlock = '<span class="mono" style="font-size:.74rem;color:var(--c-mute2)">P&L 누적 대기</span>';
    if (r.pnl) {
      const realized = r.pnl.realized_pnl;
      const color = realized > 0 ? 'var(--c-accent)' : (realized < 0 ? 'var(--c-fail)' : 'var(--c-mute)');
      const sign = realized > 0 ? '+' : '';
      const wr = (r.pnl.win_rate * 100).toFixed(0);
      pnlBlock = `<span class="mono" style="font-weight:700;color:${color};font-size:.86rem">${sign}${fmtKRW(realized)}</span>
        <span class="mono" style="font-size:.72rem;color:var(--c-mute2);margin-left:6px">${r.pnl.n_round_trips}rt · ${wr}% win</span>`;
    }
    return `<div style="padding:10px 12px;border-radius:10px;background:var(--c-bg);border:1px solid var(--c-line)">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
        <span style="font-weight:600;font-size:.88rem">${r.strategy}</span>
        <span>${pnlBlock}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:.74rem;color:var(--c-mute);gap:8px">
        <span>${r.n_signals || 0} signals</span>
        <div style="flex:1;text-align:right;overflow:hidden">${tickers}</div>
      </div>
    </div>`;
  }).join('');
}

const STATUS_COLORS = {
  healthy: 'var(--c-accent)',
  warning: 'var(--c-warn)',
  unhealthy: 'var(--c-fail)',
  retirement_candidate: 'var(--c-fail)',
  insufficient_data: 'var(--c-mute2)',
};

function renderHealth(h) {
  const root = document.getElementById('health-list');
  const progressEl = document.getElementById('health-progress');
  if (!root) return;
  const rows = h?.by_strategy || [];
  if (progressEl) {
    progressEl.textContent = h?.n_candidates > 0
      ? `${h.n_candidates} retirement candidate(s)`
      : `${rows.length} strategies tracked`;
  }
  if (rows.length === 0) {
    root.innerHTML = '<div class="empty">데이터 누적 대기 중 (최소 5 round-trips per strategy 필요)</div>';
    return;
  }
  root.innerHTML = rows.map(r => {
    const color = STATUS_COLORS[r.status] || 'var(--c-mute)';
    const pnlColor = r.pnl_4w > 0 ? 'var(--c-accent)' : (r.pnl_4w < 0 ? 'var(--c-fail)' : 'var(--c-mute)');
    const winColor = r.win_rate_8w >= 0.5 ? 'var(--c-accent)' : (r.win_rate_8w < 0.4 ? 'var(--c-fail)' : 'var(--c-mute)');
    return `<div style="padding:12px 14px;border-radius:10px;background:var(--c-bg);border:1px solid var(--c-line);border-left:4px solid ${color}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <span style="font-weight:600;font-size:.92rem">${r.strategy}</span>
        <span class="mono" style="font-size:.7rem;font-weight:700;letter-spacing:.04em;color:${color};text-transform:uppercase">${r.status}</span>
      </div>
      <div class="mono" style="font-size:.78rem;color:var(--c-mute);display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px">
        <span>4w P&L <strong style="color:${pnlColor}">${r.pnl_4w > 0 ? '+' : ''}${fmtKRW(r.pnl_4w)}</strong></span>
        <span>8w win <strong style="color:${winColor}">${(r.win_rate_8w * 100).toFixed(0)}%</strong></span>
        <span>${r.n_round_trips_8w}rt</span>
      </div>
      <div style="font-size:.74rem;color:var(--c-mute2)">→ ${r.recommended_action}: ${r.reason}</div>
    </div>`;
  }).join('');
}

function renderGate(g) {
  const progressEl = document.getElementById('gate-progress');
  const detailEl = document.getElementById('gate-detail');
  const root = document.getElementById('gate-criteria');
  if (!root) return;
  if (!g) {
    root.innerHTML = '<div class="empty">평가 대기 중</div>';
    return;
  }
  if (progressEl) progressEl.textContent = `${g.n_passed} / ${g.n_total} passed`;
  if (g.all_passed) {
    detailEl.innerHTML = '<strong style="color:var(--c-accent)">✅ 모든 기준 통과 — Phase 3 후보</strong>. 사용자 결정 대기 (자동 전환 안 됨). GitHub issue 확인.';
  }
  root.innerHTML = (g.criteria || []).map(c => {
    const verdictColor = c.passed ? 'var(--c-accent)' : 'var(--c-fail)';
    const verdictLabel = c.passed ? 'PASS' : 'NOT YET';
    return `<div style="padding:12px 14px;border-radius:10px;background:var(--c-bg);border:1px solid var(--c-line);display:flex;flex-direction:column;gap:4px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-weight:600;font-size:.88rem">${c.label}</span>
        <span class="mono" style="font-size:.7rem;font-weight:700;color:${verdictColor};letter-spacing:.05em">${verdictLabel}</span>
      </div>
      <div class="mono" style="font-size:.78rem;color:var(--c-mute);display:flex;justify-content:space-between">
        <span>측정 <strong style="color:var(--c-fg)">${c.measured}</strong></span>
        <span>한계 ${c.threshold}</span>
      </div>
      ${c.detail ? `<div style="font-size:.72rem;color:var(--c-mute2)">${c.detail}</div>` : ''}
    </div>`;
  }).join('');
}

const STRATEGY_NAME_TO_KEY = {
  'Cross-sectional Momentum': 'xs_momentum',
  'Mean Reversion': 'mean_reversion',
  'Low Volatility': 'low_volatility',
  'Volatility Breakout': 'volatility_breakout',
  'Quality Value': 'quality_value',
};

function renderStrategies(portfolioWeights) {
  const root = document.getElementById('strategies-list');
  if (!root) return;
  const dyn = (portfolioWeights && portfolioWeights.weights) || {};
  const method = portfolioWeights ? portfolioWeights.method : 'fallback_static';
  const isDynamic = method === 'inverse_vol';

  const header = isDynamic
    ? `<div style="font-size:.78rem;color:var(--c-mute);margin-bottom:8px"><strong style="color:var(--c-accent)">⚡ Risk-parity 동적 가중치</strong> · ${portfolioWeights.n_eligible} 전략 inverse-vol weighting</div>`
    : `<div style="font-size:.78rem;color:var(--c-mute2);margin-bottom:8px">Static fallback (실집행 이력 누적 후 dynamic 활성화)</div>`;

  root.innerHTML = header + STRATEGIES.map(s => {
    const key = STRATEGY_NAME_TO_KEY[s.name];
    const dynPct = (dyn[key] != null) ? (dyn[key] * 100) : null;
    const staticPct = s.weight * 100;
    const showDynamic = isDynamic && dynPct != null;

    let weightDisplay;
    if (showDynamic) {
      const delta = dynPct - staticPct;
      const deltaColor = delta > 0 ? 'var(--c-accent)' : (delta < 0 ? 'var(--c-fail)' : 'var(--c-mute)');
      const deltaStr = (delta > 0 ? '+' : '') + delta.toFixed(1);
      weightDisplay = `<div style="text-align:right;min-width:110px">
        <div class="mono" style="font-weight:700;color:var(--c-accent);font-size:.95rem">${dynPct.toFixed(1)}%</div>
        <div class="mono" style="font-size:.7rem;color:var(--c-mute2)">static ${staticPct.toFixed(0)}% <span style="color:${deltaColor}">(${deltaStr})</span></div>
      </div>`;
    } else {
      weightDisplay = `<div class="mono" style="font-weight:700;color:var(--c-accent);font-size:.95rem;min-width:60px;text-align:right">${staticPct.toFixed(0)}%</div>`;
    }

    return `<div style="padding:12px 14px;border-radius:10px;background:var(--c-bg);border:1px solid var(--c-line);display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.92rem">${s.name} <span style="font-size:.7rem;color:var(--c-mute2);font-weight:500;letter-spacing:.05em;text-transform:uppercase">· ${s.type}</span></div>
        <div style="font-size:.78rem;color:var(--c-mute);margin-top:3px">${s.desc}</div>
      </div>
      ${weightDisplay}
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
  const [meta, equity, decisions, critiques, heartbeat, council, gate, plan, trades, attribution, pnl, health, regimeHist, portfolio, ddDefense, correlation, lifecycle, tca, anomalies] = await Promise.all([
    fetchJSON('./data/meta.json'),
    fetchJSON('./data/equity.json'),
    fetchJSON('./data/decisions.json'),
    fetchJSON('./data/critiques.json'),
    fetchJSON('./data/heartbeat.json'),
    fetchJSON('./data/council-latest.json'),
    fetchJSON('./data/phase-gate.json'),
    fetchJSON('./data/today_plan.json'),
    fetchJSON('./data/recent_trades.json'),
    fetchJSON('./data/attribution.json'),
    fetchJSON('./data/per_strategy_pnl.json'),
    fetchJSON('./data/strategy_health.json'),
    fetchJSON('./data/regime_history.json'),
    fetchJSON('./data/portfolio_weights.json'),
    fetchJSON('./data/drawdown_defense.json'),
    fetchJSON('./data/correlation_history.json'),
    fetchJSON('./data/strategy_lifecycle.json'),
    fetchJSON('./data/tca.json'),
    fetchJSON('./data/anomalies.json'),
  ]);

  renderPhases(meta?.phase || 1);
  renderStatus(meta || {});
  renderAgents(meta || {});
  renderEquity(equity || {});
  renderKpis(equity || {});
  renderDecisions(decisions || {});
  renderCritiques(critiques || {});
  renderHeartbeat(heartbeat);
  renderRegime(regimeHist);
  renderDrawdownDefense(ddDefense);
  renderCorrelation(correlation);
  renderLifecycle(lifecycle);
  renderTCA(tca);
  renderAnomalies(anomalies);
  renderStrategies(portfolio);
  renderCouncil(council);
  renderGate(gate);
  renderHealth(health);
  renderPlan(plan);
  renderTrades(trades);
  renderAttribution(attribution, pnl);
}

load();
// auto-refresh every 5 minutes (page typically left open)
setInterval(load, 5 * 60 * 1000);
