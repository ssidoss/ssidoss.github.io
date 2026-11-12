/* Sidoss Capital v2 app — Dashboard · Asset · Prop · Office · CEO Console. No framework, no build.
   Data contract: ../data/** (see CLAUDE.md). Private (git-ignored) files win over public fixtures. */
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PM = window.PropMath, usd = PM.usd, r2 = PM.r2;
const ASSETS = ['NQ', 'GOLD', 'BTC', 'ETH', 'SOL'];
const ALABEL = { NQ: 'NQ / MNQ', GOLD: 'Gold / MGC', BTC: 'BTC', ETH: 'ETH', SOL: 'SOL' };
const LEGACY = 'https://ssidoss.github.io/desk/';
const S = { data: {}, fixture: new Set(), clock: 'local', theme: localStorage.getItem('sx-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'), live: { status: [], usage: null, conn: 'off' } };

/* ---------------- time ---------------- */
const NYZ = 'America/New_York';
const tfmt = (d, tz, o = {}) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', ...o }).format(d);
const utc = iso => iso ? tfmt(new Date(iso), 'UTC') : '—';
const et = iso => iso ? tfmt(new Date(iso), NYZ) : '—';
const local = iso => iso ? tfmt(new Date(iso), undefined) : '—';
const dshort = iso => iso ? new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso)) : '';
const age = iso => { if (!iso) return '—'; const m = (Date.now() - new Date(iso)) / 6e4; if (m < 1) return 'just now'; if (m < 60) return Math.round(m) + 'm ago'; if (m < 1440) return Math.floor(m / 60) + 'h ' + Math.round(m % 60) + 'm ago'; return Math.floor(m / 1440) + 'd ago'; };
const until = iso => { const m = (new Date(iso) - Date.now()) / 6e4; if (m < 0) return 'passed'; if (m < 60) return 'in ' + Math.round(m) + 'm'; return 'in ' + Math.floor(m / 60) + 'h ' + Math.round(m % 60) + 'm'; };
const stamp = iso => iso ? `${utc(iso)} UTC · ${et(iso)} ET` : '—';

/* ---------------- data ---------------- */
async function getJSON(paths) {
  for (const p of paths) {
    try { const r = await fetch(p, { cache: 'no-store' }); if (r.ok) { const j = await r.json(); return { j, p }; } } catch (e) { /* next */ }
  }
  return { j: null, p: null };
}
async function loadAll() {
  if (window.__BUNDLE) { // single-file encrypted build: data embedded at build time
    const Bd = window.__BUNDLE; for (const k of Object.keys(Bd.data)) { S.data[k] = Bd.data[k]; if (Bd.data[k] && (Bd.data[k]._FIXTURE || Bd.data[k]._EXAMPLE_DATA)) S.fixture.add(k); }
    S.data.runs = Bd.runs || []; return;
  }
  const B = '../data/';
  const spec = {
    snapshot: [B + 'market/snapshot.json'], research: [B + 'research/latest.json'], analyst: [B + 'analyst/latest.json'],
    coach: [B + 'coach/private/gameplan.json', B + 'coach/gameplan.json'], rules: [B + 'rules/private/rules.json', B + 'rules/rules.json'],
    prop: [B + 'prop/private/accounts.json', B + 'prop/accounts.json'], validation: [B + 'office/validation.json'],
    journal: [B + 'journal/private/data.json', B + 'journal/data.json'],
  };
  const out = await Promise.all(Object.entries(spec).map(async ([k, ps]) => [k, await getJSON(ps)]));
  for (const [k, { j, p }] of out) { S.data[k] = j; if (j && (j._FIXTURE || j._EXAMPLE_DATA)) S.fixture.add(k); S.data[k + 'Path'] = p; }
  try { const t = await (await fetch(B + 'office/runs.jsonl', { cache: 'no-store' })).text(); S.data.runs = t.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { S.data.runs = []; }
}

/* ---------------- icons ---------------- */
const I = {
  brief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13h4l2-6 4 12 2-6h4"/></svg>',
  asset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-6"/></svg>',
  prop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M8 6V4h8v2M3 12h18"/></svg>',
  office: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M14 18.5c.5-2 1.8-3.2 3.5-3.2s3 1.2 3.5 3.2"/></svg>',
  ceo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  macro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  journal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h11a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1zM9 8h6M9 12h6"/></svg>',
  performance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  psychology: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7-4.4-7-10a4.5 4.5 0 0 1 7-3.7A4.5 4.5 0 0 1 19 11c0 5.6-7 10-7 10z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
};
const NAV = [
  { r: 'dashboard', t: 'Brief', i: I.brief }, { r: 'asset/NQ', t: 'Markets', i: I.asset, m: 'asset' }, { r: 'prop', t: 'Prop', i: I.prop },
  { r: 'office', t: 'Office', i: I.office }, { r: 'ceo', t: 'CEO', i: I.ceo },
];
const LEG = [['macro', 'Macro'], ['calendar', 'Calendar'], ['journal', 'Journal'], ['performance', 'Performance'], ['psychology', 'Psychology']];

/* ---------------- derived ---------------- */
function primaryAccount() {
  const P = S.data.prop; if (!P) return null;
  const rules = S.data.rules || {};
  return P.accounts.find(a => (rules.accounts || []).includes(a.id)) || P.accounts.find(a => a.status === 'active') || null;
}
function accountPlan(a) { return PM.consistencyPlan(a, a.daily || [], [], new Date().toISOString().slice(0, 10), {}, [], {}); }
function limitsFor(a) {
  const R = S.data.rules || {}, C = (a && a.criteria) || {};
  const L = [];
  const pers = R.daily_stop_usd ?? (a && a.personal && a.personal.daily_stop_usd);
  if (pers != null) L.push({ k: 'Personal daily stop', v: pers, src: `rules ${R.id || ''}` });
  if (C.daily_loss_limit_usd != null) L.push({ k: 'Firm daily loss limit', v: C.daily_loss_limit_usd, src: C.source });
  if (a && a.balance != null && C.min_balance_usd != null) L.push({ k: 'Room to max-loss level', v: r2(a.balance - C.min_balance_usd), src: `${usd(a.balance)} − MLL ${usd(C.min_balance_usd)} (${C.max_loss_type || 'MLL'})` });
  const bind = L.length ? L.reduce((m, x) => x.v < m.v ? x : m) : null;
  return { L, bind };
}
function highEvents() { const R = S.data.research; return R ? (R.calendar || []).filter(e => e.impact === 'high' && e.time_utc) : []; }
function verdict() {
  const now = Date.now(), why = [];
  let st = 'go';
  const a = primaryAccount();
  if (a && a.unlogged_change && a.unlogged_change.value < 0) {
    const { bind } = limitsFor(a); const loss = -a.unlogged_change.value;
    const pers = (S.data.rules || {}).daily_stop_usd;
    if (pers != null && loss >= pers) { st = 'stop'; why.push(`⚠️ ${a.label}: balance implies ${usd(a.unlogged_change.value)} today with no trades logged — beyond the ${usd(pers)} daily stop. Confirm on the firm dashboard. (${a.unlogged_change.calc})`); }
  }
  for (const e of highEvents()) {
    const w = e.no_entry_window_utc; if (!w) continue;
    const s = new Date(w.start), en = new Date(w.end);
    if (now >= s && now <= en) { if (st !== 'stop') st = 'wait'; why.push(`No-entry window now: ${e.event} ${utc(e.time_utc)} UTC (${utc(w.start)}–${utc(w.end)})`); }
    else if (s - now > 0 && s - now < 30 * 6e4) why.push(`No-entry window ${until(w.start)}: ${e.event}`);
  }
  const nx = highEvents().filter(e => e.no_entry_window_utc && new Date(e.no_entry_window_utc.end) > now).sort((a, b) => a.time_utc < b.time_utc ? -1 : 1)[0];
  if (nx && !why.some(w => w.includes(nx.event))) why.push(`Next no-entry window: ${nx.event} · ${dshort(nx.time_utc)} ${utc(nx.no_entry_window_utc.start)}–${utc(nx.no_entry_window_utc.end)} UTC (${et(nx.no_entry_window_utc.start)}–${et(nx.no_entry_window_utc.end)} ET) · ${until(nx.no_entry_window_utc.start)}`);
  else if (!nx) why.push('No high-impact no-entry window on the research calendar.');
  if (!S.data.rules) { st = st === 'stop' ? st : 'wait'; why.push('No approved rule set loaded'); }
  if (st === 'go' && !why.some(w => /⚠️|now/.test(w))) why.unshift('No rule breach in the data, no no-entry window in the next 30 min.');
  return { st, why };
}
const dirClass = d => d === 'bullish' ? 'up' : d === 'bearish' ? 'dn' : '';
const dirBadge = d => d === 'bullish' ? 'b-up' : d === 'bearish' ? 'b-dn' : d === 'no_data' ? 'b-mut' : 'b-info';

/* ---------------- shell ---------------- */
function renderShell(route) {
  const cur = route.split('/')[0];
  const needs = needsYou().length;
  $('#nav').innerHTML = NAV.map(n => `<a href="#/${n.r}" class="${(n.m || n.r) === cur ? 'on' : ''}" aria-current="${(n.m || n.r) === cur ? 'page' : 'false'}">${n.i}<span>${n.t}</span>${n.r === 'office' && needs ? '<i class="dot" style="background:var(--amb)"></i>' : ''}</a>`).join('')
    + '<h6>More</h6>' + LEG.map(([k, t]) => `<a href="#/${k}" class="${k === cur ? 'on' : ''}">${I[k] || I.brief}<span>${t}</span></a>`).join('')
    + `<h6>Previous Desk</h6><a href="${LEGACY}" target="_blank" rel="noopener">${I.ext}<span>Open current Desk</span></a>`;
  $('#btabs').innerHTML = NAV.map(n => `<a href="#/${n.r}" class="${(n.m || n.r) === cur ? 'on' : ''}">${n.i}<span>${n.t}</span>${n.r === 'office' && needs ? `<span class="badge">${needs}</span>` : ''}</a>`).join('');
  $('#foot').innerHTML = `<button class="btn" id="theme" title="Day / night" style="padding:6px">${I.sun}</button>`;
  $('#theme').onclick = () => { S.theme = S.theme === 'day' ? 'night' : 'day'; localStorage.setItem('sx-theme', S.theme); document.documentElement.dataset.theme = S.theme; };
}
function topBar(title, sub) {
  const n = new Date();
  const sess = sessionNow();
  return `<header class="top"><div><h1>${esc(title)}</h1><div class="sub">${sub || ''}</div></div><span class="sp"></span>
   <button class="kbar hide-m" id="kbtn">Jump or ask… <kbd>⌘K</kbd></button>
   <span class="pill hide-m">${sess}</span>
   <div class="clock" id="clock"></div>
   <div class="seg" role="group" aria-label="Clock zone"><button data-z="local" class="${S.clock === 'local' ? 'on' : ''}">Local</button><button data-z="utc" class="${S.clock === 'utc' ? 'on' : ''}">UTC</button></div></header>
   <div class="ltitle">${esc(title)}</div>${sub ? `<div class="lsub">${sub}</div>` : ''}`
    + (routeFixtures().length ? `<div class="fixture"><b>FIXTURE DATA</b> — ${routeFixtures().join(', ')} loaded from synthetic examples (public repo). Real values load from the private data folder inside the encrypted build.</div>` : '');
}
const ROUTE_DATA = { dashboard: ['coach', 'rules', 'prop'], asset: ['rules', 'prop'], prop: ['prop', 'rules'], office: [], ceo: [], macro: [], calendar: [], journal: ['journal'], performance: ['journal'], psychology: ['journal', 'coach'] };
function routeFixtures() { const r = cur().split(/[/?]/)[0] || 'dashboard'; return (ROUTE_DATA[r] || []).filter(k => S.fixture.has(k)); }
function sessionNow() {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  const S2 = [['London', 7, 11], ['New York', 12, 18]];
  for (const [n, a, b] of S2) if (h >= a && h < b) return `<b>${n}</b> open · closes ${until(todayAt(b))}`;
  const nx = S2.find(([, a]) => h < a);
  return nx ? `${nx[0]} opens ${until(todayAt(nx[1]))}` : 'Sessions closed · London 07:00 UTC';
}
function todayAt(h) { const d = new Date(); d.setUTCHours(h, 0, 0, 0); return d.toISOString(); }
function tickClock() {
  const c = $('#clock'); if (!c) return; const n = new Date();
  c.innerHTML = `<span><b>${S.clock === 'utc' ? tfmt(n, 'UTC', { second: '2-digit' }) : tfmt(n, undefined, { second: '2-digit' })}</b> ${S.clock === 'utc' ? 'UTC' : 'local'}</span><span class="hide-m">${tfmt(n, NYZ)} ET</span>`;
}
function bindTop() {
  $$('.seg [data-z]').forEach(b => b.onclick = () => { S.clock = b.dataset.z; route(); });
  const k = $('#kbtn'); if (k) k.onclick = openCmdk;
  tickClock();
}
const sec = (no, title, right = '') => `<div class="sec"><span class="no">${no}</span><h2>${title}</h2><span class="r">${right}</span></div>`;

/* ---------------- Dashboard ---------------- */
function viewDashboard() {
  const D = S.data, A = D.analyst, R = D.research, Sn = D.snapshot, C = D.coach;
  const v = verdict(), a = primaryAccount(), { L, bind } = limitsFor(a);
  const lamp = { go: 'GO', wait: 'WAIT', stop: 'STOP' }[v.st];
  const head = { go: 'Clear to trade inside your rules', wait: 'Wait — conditions not clear yet', stop: 'Stop — resolve before the next trade' }[v.st];
  let h = topBar('Pre-session brief', `${dshort(new Date().toISOString())} · ${sessionNow().replace(/<[^>]+>/g, '')}`);
  h += `<div class="grid g-brief">
   <section class="card"><h2>01 · Before your next trade <span class="r">${a ? esc(a.label) : ''}</span></h2>
    <div class="verdict"><div class="lamp ${v.st}">${lamp}</div><div><h3>${head}</h3>${v.why.map(w => `<div class="small ink2" style="margin:3px 0">${esc(w)}</div>`).join('')}</div></div>
    <div class="limits">${L.length ? L.map(x => `<div class="limit ${x === bind ? 'bind' : ''}" title="${esc(x.src || '')}"><div class="l">${esc(x.k)}${x === bind ? ' · binding' : ''}</div><div class="v">${usd(x.v)}</div><div class="tiny muted">${esc(x.src || '')}</div></div>`).join('') : '<div class="limit"><div class="l">Limits</div><div class="unavail">Unavailable — no account/rules loaded</div></div>'}</div>
    ${C ? `<div class="hr"></div><div class="small"><b>Size</b> <span class="ink2">${esc(C.size_text || (D.rules || {}).size_text || '—')}</span></div>
      <div class="small" style="margin-top:6px"><b>Focus</b> <span class="ink2">${esc(C.focus || '—')}</span></div>
      <details class="calc"><summary>Position size</summary>${sizerHTML('NQ')}</details>
      <details class="calc"><summary>If → then (${(C.if_then || []).length})</summary>${(C.if_then || []).map(x => `<div class="chk"><span class="acc">→</span><span><b>${esc(x.if)}</b> <span class="ink2">${esc(x.then)}</span></span></div>`).join('')}</details>
      <div class="src"><span>Coach ${stamp(C.generated_at)}</span><span>confidence ${esc(C.confidence)}</span><span>journal: ${esc(C.journal || (C.based_on || {}).journal_synced_at || '—')}</span><span>advice, not rules</span></div>` : '<div class="src"><span class="unavail">Game plan unavailable — Trading Coach has not run</span></div>'}
   </section>
   <section class="card"><h2>02 · Next hours <span class="r">UTC · ET</span></h2>${timeline()}</section>
  </div>`;
  h += sec('03', 'Instruments', A ? `Head Analyst ${stamp(A.generated_at)} · ${age(A.generated_at)}` : 'Head Analyst: unavailable');
  h += `<div class="grid g5 inst-grid">${ASSETS.map(k => instTile(k)).join('')}</div>`;
  h += `<div class="grid loose g2" style="margin-top:16px">
    <section class="card solo"><h2>04 · What changed <span class="r">${R ? 'Researcher ' + age(R.generated_at) : ''}</span></h2>${whatChanged()}</section>
    <section class="card solo"><h2>05 · Data & pipeline <span class="r">every number has a source</span></h2>${pipeline()}${freshness()}</section></div>`;
  return h;
}
function instTile(k) {
  const s = ((S.data.snapshot || {}).assets || {})[k] || {}, a = ((S.data.analyst || {}).assets || {})[k] || {};
  const d = a.direction || 'no_data', ag = a.agreement;
  const pts = s.spark_5m || []; let sp = '';
  if (pts.length > 2) { const mn = Math.min(...pts), mx = Math.max(...pts), w = 200, hh = 36; sp = `<svg class="spark" viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none"><polyline fill="none" stroke="${s.change_pct >= 0 ? 'var(--up)' : 'var(--dn)'}" stroke-width="1.5" points="${pts.map((p, i) => `${(i / (pts.length - 1) * w).toFixed(1)},${(hh - 2 - (p - mn) / ((mx - mn) || 1) * (hh - 4)).toFixed(1)}`).join(' ')}"/></svg>`; }
  const fr = s.price == null ? '<span class="badge b-mut">no data</span>' : s.stale ? '<span class="badge b-amb">stale</span>' : s.provider_delay_min ? `<span class="badge b-mut">~${s.provider_delay_min}m delay</span>` : '<span class="badge b-up">live</span>';
  return `<a class="card inst" href="#/asset/${k}"><div class="row"><span class="tk">${ALABEL[k]}</span><span class="px">${s.price != null ? fmtPx(k, s.price) : '—'}</span></div>
   <div class="row small"><span class="${s.change_pct >= 0 ? 'up' : 'dn'} num">${s.change_pct != null ? (s.change_pct >= 0 ? '+' : '') + s.change_pct.toFixed(2) + '%' : ''}</span><span style="margin-left:auto">${fr}</span></div>${sp}
   <div class="row"><span class="dirtag ${dirClass(d)}">${d === 'no_data' ? 'No read' : d}</span>${a.conflict ? '<span class="badge b-amb" title="' + esc(a.conflict_text || '') + '">conflict</span>' : ''}<span class="small muted" style="margin-left:auto">${ag != null ? 'Agreement ' + ag + '/100' : esc(a.missing_reason || '')}</span></div>
   ${ag != null ? `<div class="meter"><i style="width:${ag}%;background:var(--${d === 'bullish' ? 'up' : d === 'bearish' ? 'dn' : 'ink3'})"></i></div>` : ''}
   <div class="tiny muted">${s.observed_at ? 'obs ' + utc(s.observed_at) + ' UTC · ' + esc((s.source || {}).symbol || '') : esc(s.missing_reason || '')}</div></a>`;
}
const fmtPx = (k, p) => p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function timeline() {
  const now = Date.now(), t0 = now - 1 * 3600e3, t1 = now + 11 * 3600e3, X = t => Math.max(0, Math.min(100, (t - t0) / (t1 - t0) * 100));
  const R = S.data.research, evs = R ? (R.calendar || []).filter(e => e.time_utc && new Date(e.time_utc) >= t0 && new Date(e.time_utc) <= t1) : [];
  const sess = [];
  for (const dd of [-1, 0, 1]) for (const [n, a, b] of [['London', 7, 11], ['New York', 12, 18]]) { const d = new Date(); d.setUTCDate(d.getUTCDate() + dd); d.setUTCHours(a, 0, 0, 0); const e = new Date(d); e.setUTCHours(b); if (e > t0 && d < t1) sess.push({ n, s: +d, e: +e }); }
  let h = `<div class="tl"><div class="tl-track">${sess.map(s => `<div class="tl-sess" style="left:${X(s.s)}%;width:${X(s.e) - X(s.s)}%">${s.n}</div>`).join('')}
   ${evs.filter(e => e.no_entry_window_utc).map(e => `<div class="tl-win" style="left:${X(+new Date(e.no_entry_window_utc.start))}%;width:${X(+new Date(e.no_entry_window_utc.end)) - X(+new Date(e.no_entry_window_utc.start))}%" title="No entries ${utc(e.no_entry_window_utc.start)}–${utc(e.no_entry_window_utc.end)} UTC"></div>`).join('')}
   ${evs.map(e => `<div class="tl-ev ${e.impact}" style="left:${X(+new Date(e.time_utc))}%" title="${esc(e.event)}"></div>`).join('')}
   <div class="tl-now" style="left:${X(now)}%"></div></div><div class="tl-ticks">${[0, 3, 6, 9, 12].map(k => `<span>${utc(new Date(t0 + k * 3600e3).toISOString())}</span>`).join('')}</div></div>`;
  const list = R ? (R.calendar || []).filter(e => !e.time_utc || new Date(e.time_utc) >= now - 2 * 3600e3).slice(0, 7) : [];
  h += `<div class="evlist">${list.length ? list.map(e => `<div class="ev ${e.impact} ${e.time_utc && new Date(e.time_utc) < now ? 'past' : ''}"><div class="t">${e.time_utc ? utc(e.time_utc) + ' UTC<small>' + (e.time_et || et(e.time_utc)) + ' ET · ' + dshort(e.time_utc) + '</small>' : '<span class="muted">untimed</span><small>' + esc(e.date || '') + '</small>'}</div>
     <div class="e">${esc(e.event)}${e.no_entry_window_utc ? `<div class="tiny dn">No entries ${utc(e.no_entry_window_utc.start)}–${utc(e.no_entry_window_utc.end)} UTC</div>` : ''}${e.actual ? `<div class="tiny muted">actual ${esc(e.actual)}</div>` : ''}${e.time_missing_reason ? `<div class="tiny muted">${esc(e.time_missing_reason)}</div>` : ''}</div>
     <div class="x"><span class="badge ${e.impact === 'high' ? 'b-dn' : e.impact === 'medium' ? 'b-amb' : 'b-mut'}">${e.impact}</span></div></div>`).join('') : '<div class="unavail small">Calendar unavailable — Market Researcher has not run</div>'}</div>`;
  if (R) h += `<div class="src"><span>One source of truth for no-entry windows: Market Researcher calendar ${stamp(R.generated_at)}</span></div>`;
  return h;
}
function whatChanged() {
  const R = S.data.research; if (!R) return '<div class="unavail">Unavailable — Market Researcher has not run</div>';
  const br = (R.breaking || []).map(b => ({ ...R.headlines[b.headline_ref], why: b.why_it_matters })).filter(x => x.url);
  const rest = (R.headlines || []).filter(h => !br.some(b => b.url === h.url)).slice(0, 7 - br.length);
  return `<div class="hl">${[...br.map(b => ({ ...b, br: 1 })), ...rest].map(h => `<a href="${esc(h.url)}" target="_blank" rel="noopener"><span class="tm">${utc(h.time_utc)}<br>${h.time_et || ''} ET</span><span><span class="tt">${h.br ? '<span class="badge b-dn">breaking</span> ' : ''}${esc(h.title_verbatim || h.summary)}</span><div class="meta">${esc(h.source)}${(h.confirmed_by || []).length ? ' · confirmed by ' + esc(h.confirmed_by.join(', ')) : ''} · ${(h.assets || []).join(' ')} · ${h.kind || ''}</div>${h.why ? `<div class="small ink2">${esc(h.why)}</div>` : ''}</span></a>`).join('')}</div>`;
}
function pipeline() {
  const D = S.data, st = [
    ['01', 'Market Researcher', D.research && D.research.generated_at], ['02', 'Head Analyst', D.analyst && D.analyst.generated_at],
    ['03', 'Trading Coach', D.coach && D.coach.generated_at], ['04', 'Head of CICM · QA', D.validation ? 'validated' : null]];
  const V = D.validation;
  return `<div class="pipe">${st.map(([i, n, t]) => `<div class="st"><div class="idx">${i}</div><div class="n">${n}</div><div class="s">${t === 'validated' ? (V.every(x => x.pass) ? '✓ all files pass' : '✗ ' + V.filter(x => !x.pass).length + ' failing') : t ? utc(t) + ' UTC · ' + age(t) : 'not run'}</div></div>`).join('')}</div>`;
}
function freshness() {
  const D = S.data, Sn = D.snapshot;
  const rows = [];
  if (Sn) { for (const k of ASSETS) { const a = Sn.assets[k]; rows.push([ALABEL[k], a.price != null ? `${(a.source || {}).name || ''} · ${(a.source || {}).symbol || ''}` : a.missing_reason, a.observed_at, a.provider_delay_min ? `~${a.provider_delay_min} min provider delay` : '24/7 spot']); }
    for (const [k, g] of Object.entries(Sn.gauges || {})) rows.push([k, `${g.value ?? '—'}${g.unit || ''} · ${(g.source || {}).symbol || g.missing_reason || ''}`, g.observed_at, '']); }
  return `<table style="margin-top:12px"><thead><tr><th>Data</th><th>Source</th><th class="n">Observed</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td class="small ink2">${esc(r[1])}<div class="tiny muted">${esc(r[3])}</div></td><td class="n">${r[2] ? utc(r[2]) + ' UTC<div class="tiny muted">' + age(r[2]) + '</div>' : '—'}</td></tr>`).join('')}</tbody></table>
   <div class="src"><span>Snapshot fetched ${stamp(Sn && Sn.fetched_at)}</span></div>`;
}

/* ---------------- Asset ---------------- */
function viewAsset(k) {
  k = ASSETS.includes(k) ? k : 'NQ';
  const s = ((S.data.snapshot || {}).assets || {})[k] || {}, a = ((S.data.analyst || {}).assets || {})[k] || {}, R = S.data.research;
  let h = topBar(ALABEL[k], esc(s.desc || ''));
  h += `<nav class="tabs-assets">${ASSETS.map(x => `<a href="#/asset/${x}" class="${x === k ? 'on' : ''}">${x}</a>`).join('')}</nav>`;
  h += `<div class="ah"><div><div class="px">${s.price != null ? fmtPx(k, s.price) : '—'}</div><div class="${s.change_pct >= 0 ? 'up' : 'dn'} num">${s.change_pct != null ? (s.change_pct >= 0 ? '+' : '') + s.change_pct.toFixed(2) + '% vs prior close ' + (s.prev_close != null ? fmtPx(k, s.prev_close) : '') : esc(s.missing_reason || '')}</div></div>
    <div><span class="badge ${dirBadge(a.direction)}" style="font-size:13px;padding:4px 10px">${esc(a.direction || 'no read')}</span> ${a.agreement != null ? `<span class="pill">Agreement <b>${a.agreement}/100</b></span>` : ''} ${a.conflict ? '<span class="badge b-amb">conflict</span>' : ''}
     ${(a.score_breakdown || []).length ? `<div class="votes mono small" style="margin-top:8px">Evidence: ${a.score_breakdown.map(x => `${({ news: 'News', h4: '4H', m30: '30M', vwap: 'VWAP' })[x.line] || x.line} <span class="vote ${x.vote > 0 ? 'p' : x.vote < 0 ? 'm' : 'z'}">${x.vote > 0 ? '+1' : x.vote < 0 ? '−1' : '0'}</span>`).join(' ')}</div>` : ''}</div>
    ${a.price != null && s.price != null && a.price !== s.price ? `<div class="small ${Math.abs(s.price - a.price) > (s.atr_5m_14 || 0) * 3 ? 'amb' : 'muted'}" style="width:100%">Head Analyst read at ${utc((S.data.analyst || {}).generated_at)} UTC with price ${fmtPx(k, a.price)} · now ${fmtPx(k, s.price)} (${s.price - a.price >= 0 ? '+' : ''}${(s.price - a.price).toFixed(2)})${Math.abs(s.price - a.price) > (s.atr_5m_14 || 0) * 3 ? ' — price has moved more than 3× ATR since the read; check the invalidation below or ask for a refresh' : ''}</div>` : ''}
    <div class="small muted mono ameta" style="margin-left:auto;text-align:right">${esc(a.contract || (s.source || {}).symbol || '')}<br>observed ${stamp(s.observed_at)} · ${age(s.observed_at)}<br>${s.provider_delay_min ? '~' + s.provider_delay_min + ' min provider delay · ' : ''}${s.stale ? '<span class="amb">STALE</span>' : 'fresh'}${s.bar_in_progress ? ' · bar in progress' : ''}</div></div>`;
  h += `<div class="card" data-k="${k}" style="margin-top:16px"><h2>Price · 1h bars <span class="r"><span class="seg">${['1D', '5D', '1M'].map(r => `<button data-rg="${r}" class="${(S.range || '5D') === r ? 'on' : ''}">${r}</button>`).join('')}</span></span></h2><div id="chart">${chartSVG(k, S.range || '5D')}</div>
    <div class="src"><span>${esc((s.source || {}).name || '')} · ${esc((s.source || {}).symbol || '')}</span><span>levels from Head Analyst / snapshot · shaded = V Areas zones</span></div></div>`;
  if (a.direction === 'no_data' || !a.direction) h += `<div class="fixture" style="margin-top:16px">No Head Analyst read for ${ALABEL[k]}: ${esc(a.missing_reason || 'not run')}. Prices and levels below are from the snapshot only.</div>`;
  h += sec('01', 'Bias — how the score is built', 'Agreement = how much the evidence agrees, not a probability');
  const sb = a.score_breakdown || [];
  h += `<div class="grid g2"><section class="card"><table><thead><tr><th>Evidence</th><th>Vote</th><th>What the data says</th></tr></thead><tbody>${sb.length ? sb.map(x => `<tr><td><b>${esc({ news: 'News', h4: '4H structure', m30: '30M structure', vwap: 'Price vs VWAP' }[x.line] || x.line)}</b><div class="tiny muted">${esc(x.source || '')}</div></td><td><span class="vote ${x.vote > 0 ? 'p' : x.vote < 0 ? 'm' : 'z'}">${x.vote > 0 ? '+1' : x.vote < 0 ? '−1' : '0'}</span></td><td class="small ink2">${esc(x.evidence)}</td></tr>`).join('') : '<tr><td colspan="3" class="unavail">No breakdown</td></tr>'}</tbody></table>
     ${sb.length ? (() => { const nn = sb.filter(x => x.vote != null), sm = nn.reduce((t, x) => t + x.vote, 0); return `<div class="math">sum = ${nn.map(x => (x.vote > 0 ? '+1' : x.vote < 0 ? '−1' : '0')).join(' ')} = ${sm}<br>agreement = round(100 × |${sm}| ÷ ${nn.length}) = ${Math.round(100 * Math.abs(sm) / nn.length)}<br>direction = ${sm > 0 ? 'bullish' : sm < 0 ? 'bearish' : 'neutral'} (sign of the sum)</div>`; })() : ''}
     ${a.conflict_text ? `<div class="small" style="margin-top:12px"><span class="badge b-amb">conflict</span> ${esc(a.conflict_text)}</div>` : ''}</section>
    <section class="card"><h2>Invalidation</h2><div style="font-size:15px">${esc(a.invalidation || '—')}</div><div class="hr"></div><h2>Session plan</h2><div class="ink2">${esc(a.session_plan || '—')}</div>
     <div class="src"><span>Head Analyst ${stamp((S.data.analyst || {}).generated_at)}</span><span>context, not orders</span></div></section></div>`;
  h += sec('02', 'Levels', 'from the snapshot · nearest first');
  const lv = [...(a.levels && a.levels.length ? a.levels : (s.levels || []))].filter(x => x.price != null);
  if (s.price != null) lv.push({ label: 'Price now', price: s.price, role: 'px' });
  lv.sort((x, y) => y.price - x.price);
  h += `<div class="grid g2"><section class="card"><div class="ladder">${lv.map(x => `<div class="lv ${x.role === 'px' ? 'px' : x.role === 'resistance' ? 'res' : x.role === 'support' ? 'sup' : x.role === 'pivot' ? 'piv' : ''}"><span>${esc(x.label)}</span><span class="num">${fmtPx(k, x.price)}</span><span class="tiny muted num">${x.role === 'px' ? '' : (s.price != null ? (x.price - s.price >= 0 ? '+' : '') + (x.price - s.price).toFixed(2) : '')}</span></div>`).join('')}</div></section>
    <section class="card"><h2>Volatility & participation</h2><dl class="kv"><dt>ATR(14) 5m</dt><dd>${s.atr_5m_14 ?? '—'}</dd><dt>Range today</dt><dd>${s.range_today ?? '—'}</dd><dt>Session VWAP</dt><dd>${(s.vwap || {}).value ?? '—'}</dd><dt>RVOL at time</dt><dd>${(s.rvol || {}).value ?? '—'}× <span class="tiny muted">(${(s.rvol || {}).sessions_compared ?? 0} sessions)</span></dd>
     <dt>4H structure</dt><dd>${esc((s.structure || {}).h4 || '—')}</dd><dt>30M structure</dt><dd>${esc((s.structure || {}).m30 || '—')}</dd>${k === 'NQ' || k === 'GOLD' ? Object.values((S.data.snapshot || {}).gauges || {}).map(g => `<dt>${g.key}</dt><dd>${g.value ?? '—'}${g.unit || ''} <span class="tiny ${g.change >= 0 ? 'up' : 'dn'}">${g.change != null ? (g.change >= 0 ? '+' : '') + g.change : ''}</span></dd>`).join('') : ''}</dl>
     ${(s.rvol || {}).note ? `<div class="tiny amb" style="margin-top:8px">${esc(s.rvol.note)}</div>` : ''}<div class="src"><span>${esc((s.vwap || {}).method || '')}</span></div></section></div>`;
  h += sec('', 'V Areas & position size') + `<div class="grid g2">${zonesHTML(k)}<div class="card"><h2>Position size</h2>${sizerHTML(k)}</div></div>`;
  h += sec('', 'Volume') + `<div class="grid g2">${vpHTML(k)}${rvolHTML(k)}</div>`;
  h += sec('03', 'News & events for ' + ALABEL[k], R ? 'Market Researcher ' + age(R.generated_at) : '');
  const nb = R && R.news_bias ? R.news_bias[k] : null;
  const hs = R ? (R.headlines || []).filter(x => (x.assets || []).includes(k) || (x.assets || []).includes('MACRO')) : [];
  h += `<div class="grid g2"><section class="card">${nb ? `<div style="margin-bottom:10px"><span class="badge ${dirBadge(nb.bias)}">news ${esc(nb.bias)}</span> ${nb.strength != null ? `<span class="small muted">evidence strength ${nb.strength}/100</span>` : ''}<div class="small ink2" style="margin-top:6px">${esc(nb.reason || '')}</div></div>` : ''}
    <div class="hl">${hs.slice(0, 10).map(h2 => `<a href="${esc(h2.url)}" target="_blank" rel="noopener"><span class="tm">${utc(h2.time_utc)}<br>${h2.time_et || ''} ET</span><span><span class="tt">${esc(h2.title_verbatim)}</span><div class="meta">${esc(h2.source)} · ${h2.impact} · ${h2.kind}</div></span></a>`).join('') || '<div class="unavail">No headlines tagged for this instrument</div>'}</div></section>
   <section class="card"><h2>Calendar</h2>${(R ? R.calendar || [] : []).map(e => `<div class="ev ${e.impact}"><div class="t">${e.time_utc ? utc(e.time_utc) + ' UTC<small>' + (e.time_et || '') + ' ET · ' + dshort(e.time_utc) + '</small>' : 'untimed'}</div><div class="e small">${esc(e.event)}<div class="tiny muted">${esc(e.source || '')}</div></div><div class="x"><span class="badge ${e.impact === 'high' ? 'b-dn' : e.impact === 'medium' ? 'b-amb' : 'b-mut'}">${e.impact}</span></div></div>`).join('') || '<div class="unavail">Unavailable</div>'}</section></div>`;
  return h;
}

/* ---------------- Prop ---------------- */
function viewProp() {
  const P = S.data.prop;
  let h = topBar('Prop firms', P ? `${P.accounts.filter(a => a.status === 'active').length} active · data ${age(P.updated_at)} · ${esc(P.source || '')}` : '');
  if (!P) return h + '<div class="unavail">Prop data unavailable</div>';
  const firms = Object.fromEntries((P.firms || []).map(f => [f.id, f]));
  const act = P.accounts.filter(a => a.status === 'active'), closed = P.accounts.filter(a => a.status !== 'active');
  const calc = Object.fromEntries(P.accounts.map(a => [a.id, a.type === 'funded'
    ? { kind: 'payout', t: PM.payoutTracker(a, firms[a.firm], a.balance != null ? r2(a.balance - a.size) : null, a.payout_progress, new Date()) }
    : { kind: 'eval', t: accountPlan(a) }]));
  // spend / payouts
  const fees = P.accounts.flatMap(a => (a.fees || []).map(f => ({ ...f, acct: a.id }))).filter(f => f.amount != null);
  const feeIn = fees.filter(f => f.in_desk_totals !== false).reduce((t, f) => t + f.amount, 0), feeAll = fees.reduce((t, f) => t + f.amount, 0);
  const paid = P.accounts.flatMap(a => a.payouts || []).filter(p => p.status === 'paid').reduce((t, p) => t + (p.net ?? p.gross ?? 0), 0);
  h += `<div class="grid kpis">
   <div class="card"><h2>Payouts received</h2><div class="big">${usd(r2(paid))}</div></div>
   <div class="card"><h2>Fees counted</h2><div class="big">${usd(r2(feeIn))}</div><div class="tiny muted">${feeAll !== feeIn ? `${usd(r2(feeAll - feeIn))} more not counted (owner decision pending)` : 'all fees counted'}</div></div>
   <div class="card"><h2>Net realised</h2><div class="big ${paid - feeIn >= 0 ? 'up' : 'dn'}">${usd(r2(paid - feeIn))}</div><div class="tiny muted">${feeAll !== feeIn ? 'incl. all fees: ' + usd(r2(paid - feeAll)) : ''}</div></div>
   <div class="card"><h2>Closest to a payout</h2>${closest(act, calc)}</div></div>`;
  h += sec('01', 'Compare accounts', 'scroll sideways on phone · every number has ƒ(x) below');
  const row = (label, f, cls = '') => `<tr><td>${label}</td>${act.map(a => `<td class="n ${cls}">${f(a, calc[a.id].t, calc[a.id].kind) ?? '—'}</td>`).join('')}</tr>`;
  const grp = t => `<tr class="grp"><td>${t}</td>${act.map(() => '<td></td>').join('')}</tr>`;
  h += `<div class="cmp"><table><thead><tr><th>Account</th>${act.map(a => `<th class="n">${esc(a.label)}<div class="tiny muted" style="text-transform:none;letter-spacing:0">${esc(a.plan)}</div></th>`).join('')}</tr></thead><tbody>
   ${grp('Account')}
   ${row('Type', a => `<span class="badge ${a.type === 'funded' ? 'b-up' : 'b-info'}">${a.type}</span>`)}
   ${row('Balance', a => `${usd(a.balance)}<div class="tiny muted">${age(a.balance_observed_at)}</div>`)}
   ${row('Profit to date', a => { const p = a.balance != null ? r2(a.balance - a.size) : null; return `<span class="${p >= 0 ? 'up' : 'dn'}">${usd(p)}</span>`; })}
   ${grp('Risk today')}
   ${row('Max-loss level (MLL)', a => `${usd((a.criteria || {}).min_balance_usd)}<div class="tiny muted">${esc((a.criteria || {}).max_loss_type || '')}</div>`)}
   ${row('Room to MLL at close', a => { const c = a.criteria || {}; if (a.balance == null || c.min_balance_usd == null) return null; const v = r2(a.balance - c.min_balance_usd); const tight = c.daily_loss_limit_usd != null && v < c.daily_loss_limit_usd; return `<span class="${tight ? 'amb' : ''}">${usd(v)}</span>${tight ? '<div class="tiny amb">smaller than DLL</div>' : ''}`; })}
   ${row('Firm daily loss limit', a => (a.criteria || {}).daily_loss_limit_usd != null ? usd(a.criteria.daily_loss_limit_usd) : '<span class="muted">none</span>')}
   ${row('Binding limit today', a => { const { bind } = limitsFor(a); return bind ? `<b>${usd(bind.v)}</b><div class="tiny muted">${esc(bind.k)}</div>` : null; })}
   ${row('Unlogged balance change', a => a.unlogged_change ? `<span class="dn">${usd(a.unlogged_change.value)}</span><div class="tiny amb">${esc(a.unlogged_change.status)}</div>` : '<span class="muted">none</span>')}
   ${grp('Progress')}
   ${row('Goal', (a, t, k) => k === 'eval' ? (t.available ? `${usd(t.T)} profit<div class="tiny muted">${t.TSource === 'lucid-adjusted' ? 'firm-adjusted target' : 'computed'}</div>` : `<span class="unavail">${esc(t.reason)}</span>`) : `${t.need ?? '—'} qualifying days`)}
   ${row('Progress', (a, t, k) => { const pct = k === 'eval' ? (t.available && t.T ? Math.max(0, Math.min(100, (t.P || 0) / t.T * 100)) : 0) : (t.pct || 0); return `<div class="prog ${pct >= 100 ? 'up' : ''}"><i style="width:${pct}%"></i></div><span class="tiny">${pct.toFixed(0)}%</span>`; })}
   ${row('Still needed', (a, t, k) => k === 'eval' ? (t.available ? usd(t.remaining) : '—') : `${t.remaining} days`)}
   ${row('Fewest more profit days', (a, t, k) => k === 'eval' ? (t.minProfitDaysLeft ?? '—') : (t.earliest ? 'earliest ' + t.earliest : t.eligible ? 'eligible now' : '—'))}
   ${row('Consistency: best day vs cap', (a, t, k) => k === 'eval' && t.available ? `${usd(t.B)} / ${usd(t.capAtTarget)}<div class="tiny ${t.B > t.capAtTarget - 1 ? 'amb' : 'muted'}">margin ${usd(r2(t.capAtTarget - t.B))}</div>` : '—')}
   ${row('Payout now (gross → yours)', (a, t, k) => k === 'payout' ? `${usd(t.gross)} → ${usd(t.share)}` : '<span class="muted">after passing</span>')}
  </tbody></table></div>`;
  h += sec('02', 'Remaining requirements & calculations', 'planning aid, not a rule change');
  h += `<div class="acards">${act.map(a => accountCard(a, calc[a.id], firms[a.firm])).join('')}</div>`;
  if (closed.length) h += sec('03', 'Closed accounts', closed.length) + `<div class="cmp"><table><thead><tr><th>Account</th><th>Plan</th><th class="n">Final balance</th><th class="n">Payouts</th></tr></thead><tbody>${closed.map(a => `<tr><td>${esc(a.label)}</td><td>${esc(a.plan)}</td><td class="n">${usd(a.balance)}</td><td class="n">${usd((a.payouts || []).reduce((t, p) => t + (p.net ?? 0), 0))}</td></tr>`).join('')}</tbody></table></div>`;
  h += `<div class="src"><span>Rules: ${(P.firms || []).map(f => f.rules_url ? `<a href="${esc(f.rules_url)}" target="_blank" rel="noopener">${esc(f.name)} rules</a>` : esc(f.name)).join(' · ')}</span><span>${esc((P.firms || [])[0] ? P.firms[0].rules_note : '')}</span><span>Math: prop-math.js, parity-tested against Grok prop.py (400 cases)</span></div>`;
  return h;
}
function closest(act, calc) {
  let best = null;
  for (const a of act) { const c = calc[a.id]; let d = null; if (c.kind === 'eval' && c.t.available) d = c.t.minProfitDaysLeft; if (c.kind === 'payout') d = c.t.remaining; if (d != null && (!best || d < best.d)) best = { a, d, k: c.kind }; }
  return best ? `<div class="big">${best.d}</div><div class="small ink2">${best.k === 'payout' ? 'qualifying days' : 'profit days (min)'} · ${esc(best.a.label)}</div>` : '<div class="unavail">—</div>';
}
function accountCard(a, c, firm) {
  const t = c.t, reqs = [];
  if (c.kind === 'eval') {
    if (t.available) {
      reqs.push([t.remaining <= 0, `Reach ${usd(t.T)} total profit`, t.remaining > 0 ? `${usd(t.remaining)} to go` : 'done']);
      reqs.push([t.B <= t.capAtTarget, `No day above ${usd(t.capAtTarget)} (${r2(t.c * 100)}% of the goal)`, `best ${usd(t.B)}`]);
      reqs.push([t.minProfitDaysLeft === 0, `At least ${t.minProfitDaysLeft} more profit day(s)`, '']);
    } else reqs.push([false, 'Plan unavailable', t.reason]);
    const C = a.criteria || {};
    if (C.min_balance_usd != null) reqs.push([a.balance > C.min_balance_usd, `Close every day above ${usd(C.min_balance_usd)}`, `cushion ${usd(r2(a.balance - C.min_balance_usd))}`]);
  } else {
    reqs.push([t.eligible, `${t.need ?? '—'} qualifying days of ≥ ${usd(t.minDay)}`, `${t.done} done`]);
    reqs.push([(t.gross || 0) > 0, `Profit above start for a payout (cap ${usd(t.cap)})`, usd(t.gross)]);
  }
  const checks = PM.checkAccount(a, c.kind === 'eval' ? t : null);
  const steps = t.steps || [];
  return `<section class="card"><h2>${esc(a.label)} <span class="r">${esc((firm || {}).name || '')}</span></h2>
   <div class="reqs">${reqs.map(([ok, txt, note]) => `<div class="req"><span class="ic ${ok ? 'up' : 'amb'}">${ok ? '✓' : '•'}</span><span>${esc(txt)}</span><span class="small muted num">${esc(note)}</span></div>`).join('')}</div>
   <div style="margin-top:10px">${checks.map(x => `<div class="chk"><span class="badge ${x.state === 'ok' ? 'b-up' : x.state === 'warn' ? 'b-amb' : x.state === 'breach' ? 'b-dn' : 'b-mut'}">${x.state}</span><span><b>${esc(x.rule)}</b> <span class="ink2">${esc(x.detail)}</span></span></div>`).join('')}</div>
   ${a.unlogged_change ? `<div class="chk"><span class="badge b-dn">check</span><span><b>Unlogged change</b> <span class="ink2">${esc(a.unlogged_change.calc)} · ${esc(a.unlogged_change.corroboration || '')}</span></span></div>` : ''}
   <details class="calc"><summary>Show calculation (${steps.length} steps)</summary><div class="steps">${steps.map(s => `<div class="step"><span>${esc(s.label)}</span><span class="v">${typeof s.value === 'number' && s.k !== 'days' ? usd(s.value) : esc(s.value)}</span><span class="f">${esc(s.formula)} = ${esc(s.calc)}</span>${s.warn ? `<span class="f amb">${esc(s.warn)}</span>` : ''}</div>`).join('')}</div></details>
   <div class="src"><span>balance: ${esc(a.balance_source || '—')} · ${stamp(a.balance_observed_at)}</span><span>rules: ${esc((a.criteria || {}).source || '—')}</span></div></section>`;
}

/* ---------------- Office ---------------- */
const ROSTER = [
  ['Head of CICM', 'Management', '#d9c49a'], ['S-Scriba', 'Management', '#f59e6b'],
  ['Market Researcher', 'Trading', '#5ed4c0'], ['Head Analyst', 'Trading', '#3ddc97'], ['Trading Coach', 'Trading', '#64d6a8'], ['Trading Journal', 'Trading', '#a3e06a'], ['Strategy Developer', 'Trading', '#b8e986'],
  ['HC', 'IT & Coding', '#8fb8ff'], ['Office Coder', 'IT & Coding', '#6fd3e6'], ['Desk & Finance Coder', 'IT & Coding', '#9ad7ff'],
  ['Cutter', 'Video', '#ff8a7a'], ['Head of FMOK', 'Finance', '#a7b8ff']];
function allStatus() { return [...(S.data.runs || []), ...S.live.status].filter(x => x.type === 'status').sort((a, b) => a.ts < b.ts ? -1 : 1); }
function latestBy() { const m = {}; for (const s of allStatus()) m[s.bot] = s; return m; }
function needsYou() {
  const L = latestBy(); return Object.values(L).filter(s => s.needs_owner || s.state === 'waiting' && /user|owner|you\b|answer|video|decision|approve/i.test(s.task || '') || s.state === 'stuck');
}
function viewOffice() {
  const L = latestBy(), N = needsYou(), outs = {};
  for (const s of allStatus()) if (s.output) outs[s.bot] = s;
  let h = topBar('Office', `${Object.values(L).filter(s => s.state === 'working').length} working · ${N.length} need you · ${S.live.conn === 'live' ? '<span class="up">live topic</span>' : 'run log' + (S.topic ? ' · connecting' : ' · add #/office?topic=… for live')}`);
  h += sec('01', 'Needs you', N.length ? N.length + ' open' : 'nothing waiting');
  h += N.length ? `<div class="grid">${N.map(s => `<div class="card need"><div class="row" style="display:flex;gap:10px;align-items:center"><span class="st s-${s.state}">${s.state}</span><b>${esc(s.bot)}</b><span class="muted small" style="margin-left:auto">${stamp(s.ts)} · ${age(s.ts)}</span></div><div style="margin-top:6px">${esc(s.needs_owner || s.task)}</div><div style="margin-top:8px;display:flex;gap:8px">${s.output ? `<button class="btn" data-out="${esc(s.output)}">Open output</button>` : ''}<a class="btn pri" href="#/ceo?to=${encodeURIComponent(s.bot)}" style="text-decoration:none">Reply via CEO</a></div></div>`).join('')}</div>` : '<div class="card solo muted">Nobody is waiting on you.</div>';
  h += sec('02', 'Pre-session pipeline', 'Researcher → Analyst → Coach → CICM QA');
  h += `<div class="card solo">${flowSVG(outs)}</div>`;
  h += sec('03', 'Every agent', '12 agents · latest status and output');
  h += `<div class="agents">${ROSTER.map(([n, team, col]) => { const s = L[n], o = outs[n]; return `<div class="card agent ${N.includes(s) ? 'need' : ''}"><div class="hd"><span class="av" style="background:${col}">${n.split(/\s|&/).filter(w => w && w !== 'of').map(w => w[0].toUpperCase()).join('').slice(0, 2)}</span><div><div class="nm">${esc(n)}</div><div class="tm">${team}</div></div><span class="st s-${s ? s.state : 'unknown'}" style="margin-left:auto">${s ? s.state : 'no status'}</span></div>
     <div class="small">${s ? esc(s.task) : '<span class="unavail">No status posted in the loaded history</span>'}</div><div class="tm">${s ? stamp(s.ts) + ' · ' + age(s.ts) : ''}</div>
     ${o ? `<div class="out">Latest output · <a href="#" data-out="${esc(o.output)}">${esc(o.output.split('/').slice(-2).join('/'))}</a> <span class="muted tiny">${age(o.ts)}</span></div>` : ''}</div>`; }).join('')}</div>`;
  h += `<div class="grid loose g2" style="margin-top:16px"><section class="card solo"><h2>04 · Activity <span class="r">newest first · UTC</span></h2><div class="feed">${allStatus().slice(-60).reverse().map(s => `<div><span>${utc(s.ts)}</span><span class="b"><b>${esc(s.bot)}</b></span><span><span class="st s-${s.state}"></span> ${esc(s.task)}</span></div>`).join('')}</div></section>
   <section class="card solo"><h2>05 · Usage & integrations</h2>${usage()}<div class="hr"></div><div class="integr"><span><img src="icons/claude-ai.svg" alt="">Claude Code agents</span><span><img src="icons/notion.svg" alt="">Notion journal</span><span><img src="icons/github.svg" alt="">GitHub Pages</span><span><img src="icons/ntfy.svg" alt="">ntfy Office topic</span><span><img src="icons/telegram.svg" alt="">Telegram (CEO)</span></div>
   <div class="src"><span>3D building view: <a href="https://ssidoss.github.io/office/" target="_blank" rel="noopener">current Office ↗</a></span><span>icons: homarr-labs/dashboard-icons (Apache-2.0)</span></div></section></div>`;
  return h;
}
function usage() {
  const u = S.live.usage; if (!u) return '<div class="unavail small">Weekly usage arrives with the live topic (usage post) — not in the run log.</div>';
  return `<div class="big">${u.weekly_used_pct}%</div><div class="small muted">weekly limit used · resets ${dshort(u.resets_at)} ${utc(u.resets_at)} UTC · updated ${age(u.updated_at)}</div><div class="prog"><i style="width:${u.weekly_used_pct}%"></i></div>
   <table style="margin-top:8px">${(u.bots || []).map(b => `<tr><td>${esc(b.name)}</td><td class="n">${b.share_pct}%</td></tr>`).join('')}</table>`;
}
function flowSVG(outs) {
  const st = [['Market Researcher', 'news + calendar', 'research/latest.json', 'Brief §02/§04 · Asset §03'], ['Head Analyst', 'bias + levels', 'analyst/latest.json', 'Brief §03 · Asset §01/§02'], ['Trading Coach', 'game plan', 'coach/gameplan.json', 'Brief §01'], ['Head of CICM', 'QA + briefing', 'validation.json', 'Office · CEO · Telegram']];
  const L = latestBy(), W = 1000, bw = 214, gap = (W - bw * 4) / 3;
  return `<svg class="flow" viewBox="0 0 ${W} 150" role="img" aria-label="Agent handoff diagram"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--acc)"/></marker></defs>
   ${st.map(([n, d, f, p], i) => { const x = i * (bw + gap), s = L[n]; return `<g><rect x="${x}" y="10" width="${bw}" height="96" rx="6" fill="var(--panel2)" stroke="var(--${s && s.state === 'finished' ? 'acc' : 'rule2'})"/>
     <text x="${x + 14}" y="32" fill="var(--acc)" font-family="var(--mono)" font-size="11">0${i + 1} · ${s ? s.state.toUpperCase() : 'NOT RUN'}</text><text x="${x + 14}" y="54" fill="var(--ink)" font-size="15" font-weight="600">${n}</text>
     <text x="${x + 14}" y="74" fill="var(--ink3)" font-size="12">${d}</text><text x="${x + 14}" y="94" fill="var(--ink2)" font-family="var(--mono)" font-size="11">${s ? utc(s.ts) + ' UTC · ' + age(s.ts) : '—'}</text>
     <text x="${x + 14}" y="128" fill="var(--ink3)" font-family="var(--mono)" font-size="10.5">→ ${p}</text>
     ${i < 3 ? `<line x1="${x + bw + 4}" y1="58" x2="${x + bw + gap - 4}" y2="58" stroke="var(--acc)" stroke-width="1.5" marker-end="url(#ar)"/>` : ''}</g>`; }).join('')}</svg>`;
}
async function openOutput(path) {
  const d = $('#drawer'); d.innerHTML = `<div class="sec" style="margin-top:0"><h2>${esc(path)}</h2><button class="btn" id="dx" style="margin-left:auto">Close</button></div><pre>Loading…</pre>`; d.classList.add('on'); $('#scrim').classList.add('on');
  $('#dx').onclick = closeDrawer;
  const p = path.startsWith('v2/') ? '../' + path.slice(3) : path;
  if (window.__BUNDLE && window.__BUNDLE.files) { const t = window.__BUNDLE.files[path]; $('pre', d).textContent = t ? JSON.stringify(t, null, 1) : 'Not included in this build.'; return; }
  try { const t = await (await fetch(p, { cache: 'no-store' })).text(); let pretty = t; try { pretty = JSON.stringify(JSON.parse(t), null, 1); } catch { } $('pre', d).textContent = pretty.slice(0, 60000); }
  catch (e) { $('pre', d).textContent = 'Not available in this build: ' + e; }
}
function closeDrawer() { $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); }

/* live Office topic (GET only here; the CEO console is the only place that posts) */
async function connectTopic() {
  if (!S.topic || S.live.conn !== 'off') return; S.live.conn = 'connecting';
  const take = line => { try { const m = JSON.parse(line.message ?? line); if (m.type === 'status') S.live.status.push(m); if (m.type === 'usage') S.live.usage = m; if (m.type === 'chat' && m.re) CEO.onReply(m); if (m.type === 'chat_ack') CEO.onAck(m); } catch { } };
  try {
    const t = await (await fetch(`https://ntfy.sh/${encodeURIComponent(S.topic)}/json?poll=1&since=12h`)).text();
    t.split('\n').filter(Boolean).forEach(l => { try { take(JSON.parse(l)); } catch { } });
    S.live.conn = 'live';
    const es = new EventSource(`https://ntfy.sh/${encodeURIComponent(S.topic)}/sse`); es.onmessage = e => { try { take(JSON.parse(e.data)); if (cur().startsWith('office')) route(); } catch { } };
    es.onerror = () => { S.live.conn = 'reconnecting'; };
  } catch { S.live.conn = 'off'; }
  route();
}

/* ---------------- CEO console ---------------- */
// minimal, safe markdown for agent replies: escape first, then bold / code / bullets
const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code class="mono">$1</code>').replace(/^- (.*)$/gm, '<span style="display:block;padding-left:14px;text-indent:-10px">• $1</span>');
const CEO = {
  msgs: JSON.parse(sessionStorage.getItem('ceo-msgs') || '[]'), transport: localStorage.getItem('ceo-transport') || 'auto', lang: localStorage.getItem('ceo-lang') || 'en-US',
  bridge: localStorage.getItem('ceo-bridge') || 'http://127.0.0.1:8787', rec: null, speaking: false, listening: false, to: 'Head of CICM',
  save() { sessionStorage.setItem('ceo-msgs', JSON.stringify(this.msgs.slice(-80))); },
  push(m) { this.msgs.push(m); this.save(); this.draw(); },
  draw() {
    const box = $('#msgs'); if (!box) return;
    box.innerHTML = this.msgs.map(m => `<div class="msg ${m.from === 'me' ? 'me' : 'bot'}"><div class="who">${m.from === 'me' ? 'You' : esc(m.from)} · ${utc(m.ts)} UTC<span class="state">${m.state ? esc(m.state) : ''}${m.via ? ' · ' + esc(m.via) : ''}</span></div>${m.from === 'me' ? esc(m.text) : md(m.text)}${m.sources ? `<div class="src">${m.sources.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''}</div>`).join('') || `<div class="muted" style="margin:auto;text-align:center;max-width:420px">Talk or type to <b>Head of CICM</b>. Hold the mic (or Space) to speak. Answers come from the Desk data files, with sources.</div>`;
    box.scrollTop = box.scrollHeight;
  },
  async send(text) {
    text = text.trim(); if (!text) return;
    if (/(sk-|ghp_|github_pat_|password|seed phrase|0x[0-9a-f]{20,})/i.test(text)) { this.push({ from: 'Head of CICM', ts: new Date().toISOString(), text: 'Not sent: the message looks like it contains a secret. Remove it and try again.', via: 'guard' }); return; }
    const m = { from: 'me', ts: new Date().toISOString(), text, state: 'sending', id: crypto.randomUUID() }; this.push(m);
    const mode = this.transport === 'auto' ? (await this.bridgeUp() ? 'bridge' : S.topic ? 'office' : 'desk') : this.transport;
    try {
      if (mode === 'bridge') {
        const r = await fetch(this.bridge + '/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, to: this.to, history: this.msgs.slice(-12).map(x => ({ role: x.from === 'me' ? 'user' : 'assistant', text: x.text })) }) });
        const j = await r.json(); m.state = 'answered'; m.via = 'local bridge'; this.save();
        this.reply(j.reply, j.sources, 'Claude · ' + (j.agent || 'head-of-cicm'));
      } else if (mode === 'office') {
        if (Date.now() - (this.lastSend || 0) < 5000) throw new Error('One message per 5 seconds');
        this.lastSend = Date.now();
        await fetch(`https://ntfy.sh/${encodeURIComponent(S.topic)}`, { method: 'POST', body: JSON.stringify({ v: 1, type: 'chat', id: m.id, to_bot: this.to, text: text.slice(0, 1000), ts: m.ts, client: 'office' }) });
        m.state = 'sent'; m.via = 'Office relay'; this.save(); this.draw();
      } else {
        m.state = 'answered'; m.via = 'Desk data (offline)'; this.save();
        const a = deskAnswer(text); this.reply(a.text, a.sources, 'Head of CICM · offline');
      }
    } catch (e) { m.state = 'failed: ' + e.message; this.save(); this.draw(); }
  },
  reply(text, sources, via) { this.push({ from: this.to, ts: new Date().toISOString(), text, sources, via }); if ($('#speak') && $('#speak').checked) this.say(text); },
  onAck(a) { const m = this.msgs.find(x => x.id === a.re); if (m && ['sent', 'received'].includes(m.state)) { m.state = a.state; this.save(); this.draw(); } },
  onReply(r) { const m = this.msgs.find(x => x.id === r.re); if (m) { m.state = 'replied'; this.save(); } this.reply(r.text, null, 'Office relay'); },
  async bridgeUp() { try { const c = new AbortController(); setTimeout(() => c.abort(), 600); return (await fetch(this.bridge + '/health', { signal: c.signal })).ok; } catch { return false; } },
  say(text) { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, '').slice(0, 600)); u.lang = this.lang; const v = speechSynthesis.getVoices().find(v => v.lang === this.lang && /Daniel|Google UK|Serena|Anna|Markus/i.test(v.name)) || speechSynthesis.getVoices().find(v => v.lang === this.lang); if (v) u.voice = v; u.rate = 1.03; u.onstart = () => this.orb('speaking'); u.onend = () => this.orb(''); speechSynthesis.speak(u); },
  orb(s) { this.scopeMode = s; },
  listen(on) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { this.push({ from: 'Head of CICM', ts: new Date().toISOString(), text: 'Voice input needs Chrome, Edge or Safari. You can still type.', via: 'browser' }); return; }
    if (on && !this.rec) {
      const r = new SR(); r.lang = this.lang; r.interimResults = true; r.continuous = true; let fin = '';
      r.onresult = e => { let t = ''; for (const x of e.results) t += x[0].transcript; fin = t; $('#ta').value = t; };
      r.onend = () => { $('#mic').classList.remove('rec'); this.rec = null; this.orb(''); if (fin.trim()) { this.send(fin); $('#ta').value = ''; } };
      r.start(); this.rec = r; $('#mic').classList.add('rec'); this.orb('listening'); scope(true);
    } else if (!on && this.rec) { this.rec.stop(); scope(false); }
  },
};
let scopeStream = null;
async function scope(on) {
  const cv = $('#scope'); if (!cv) return; const g = cv.getContext('2d');
  if (on && navigator.mediaDevices) { try { scopeStream = await navigator.mediaDevices.getUserMedia({ audio: true }); const ac = new AudioContext(), an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(scopeStream).connect(an); CEO.an = an; } catch { } }
  if (!on && scopeStream) { scopeStream.getTracks().forEach(t => t.stop()); scopeStream = null; CEO.an = null; }
}
function drawScope() {
  const cv = $('#scope'); if (cv) {
    const g = cv.getContext('2d'), w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2, buf = new Uint8Array(256);
    g.clearRect(0, 0, w, h); g.strokeStyle = getComputedStyle(document.body).getPropertyValue(CEO.scopeMode === 'listening' ? '--dn' : '--acc'); g.lineWidth = 3; g.beginPath();
    if (CEO.an) CEO.an.getByteTimeDomainData(buf);
    for (let i = 0; i < 256; i++) { const t = performance.now() / 300, base = CEO.an ? (buf[i] - 128) / 128 : (CEO.scopeMode === 'speaking' ? Math.sin(i / 9 + t * 3) * .35 * Math.sin(t) : Math.sin(i / 16 + t) * .04); const x = i / 255 * w, y = h / 2 + base * h * .42; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  requestAnimationFrame(drawScope);
}
function deskAnswer(q) {
  const D = S.data, low = q.toLowerCase(), src = [];
  const k = ASSETS.find(a => low.includes(a.toLowerCase())) || (/gold|mgc|gc\b/.test(low) ? 'GOLD' : /nasdaq|mnq/.test(low) ? 'NQ' : /bitcoin/.test(low) ? 'BTC' : /ether/.test(low) ? 'ETH' : /solana/.test(low) ? 'SOL' : null);
  if (/payout|eval|target|consisten|prop|account|left|remaining|übrig|auszahlung/.test(low)) {
    const P = D.prop; if (!P) return { text: 'Prop data is not loaded.', sources: [] };
    const lines = P.accounts.filter(a => a.status === 'active').map(a => { if (a.type === 'funded') { const t = PM.payoutTracker(a, null, r2(a.balance - a.size), a.payout_progress, new Date()); return `${a.label}: ${t.done} of ${t.need} qualifying days; ${t.eligible ? 'eligible now' : t.remaining + ' to go, earliest ' + t.earliest}.`; } const t = accountPlan(a); return t.available ? `${a.label}: ${usd(t.remaining)} still needed toward ${usd(t.T)}, at least ${t.minProfitDaysLeft} more profit days, no day above ${usd(t.capAtTarget)}.` : `${a.label}: plan unavailable (${t.reason}).`; });
    return { text: lines.join('\n'), sources: [`prop data ${age(P.updated_at)}`, 'prop-math.js'] };
  }
  if (/need|waiting|attention|stuck|warte/.test(low)) { const N = needsYou(); return { text: N.length ? N.map(s => `${s.bot}: ${s.needs_owner || s.task} (${age(s.ts)})`).join('\n') : 'Nobody is waiting on you right now.', sources: ['Office run log'] }; }
  if (/news|event|calendar|ppi|cpi|fomc|nfp/.test(low)) { const R = D.research; if (!R) return { text: 'No research file yet.', sources: [] }; const hi = (R.calendar || []).filter(e => e.time_utc && new Date(e.time_utc) > Date.now()).slice(0, 3); return { text: `Next: ${hi.map(e => `${e.event} ${dshort(e.time_utc)} ${utc(e.time_utc)} UTC / ${e.time_et} ET (${e.impact})`).join('; ')}.` + ((R.breaking || [])[0] ? `\nBreaking: ${R.headlines[R.breaking[0].headline_ref].title_verbatim} (${R.headlines[R.breaking[0].headline_ref].source}).` : ''), sources: [`Market Researcher ${utc(R.generated_at)} UTC`] }; }
  if (k || /bias|market|price/.test(low)) { const kk = k || 'NQ', a = (D.analyst || {}).assets?.[kk], s = (D.snapshot || {}).assets?.[kk]; if (!a) return { text: 'No analyst file yet.', sources: [] }; return { text: a.direction === 'no_data' ? `${ALABEL[kk]}: no read yet (${a.missing_reason}).` : `${ALABEL[kk]} is ${a.direction}, agreement ${a.agreement} out of 100${a.conflict ? ', with a conflict: ' + a.conflict_text : ''}. Price ${fmtPx(kk, s.price)}, about ${s.provider_delay_min || 0} minutes delayed. Invalidation: ${a.invalidation}`, sources: [`Head Analyst ${utc(D.analyst.generated_at)} UTC`, `${(s.source || {}).symbol} obs ${utc(s.observed_at)} UTC`] }; }
  if (/trade|can i|go|stop|limit|risk|darf/.test(low)) { const v = verdict(), { bind } = limitsFor(primaryAccount()); return { text: `${v.st.toUpperCase()}. ${v.why.join(' ')}${bind ? ` Binding limit today: ${usd(bind.v)} (${bind.k}).` : ''}`, sources: ['rules + prop data + research calendar'] }; }
  return { text: 'Offline mode answers from the Desk data: try "NQ bias", "can I trade", "what is left on my evals", "who needs me", or "next news". Start the local bridge for full Claude answers.', sources: [] };
}
function viewCEO(params) {
  if (params.get('to')) CEO.to = params.get('to');
  const h = topBar('CEO Console', `Talk to ${esc(CEO.to)} · voice + text`) + `<div class="ceo"><section class="chat"><div class="msgs" id="msgs" aria-live="polite"></div>
   <form class="composer" id="cf"><button type="button" class="mic" id="mic" aria-label="Hold to talk">${I.mic}</button><textarea id="ta" rows="1" placeholder="Ask anything… (Enter to send, Shift+Enter new line)"></textarea><button class="btn pri" type="submit">Send</button></form></section>
   <aside class="side2"><div class="scope"><span class="lbl">${esc(CEO.to)}</span><canvas id="scope"></canvas></div>
    <div class="card solo"><h2>Ask</h2><div class="chips">${['What should I know before NY?', 'Can I trade the 150K eval now?', "What's left on my evals?", 'Who needs me?', 'NQ bias and invalidation', 'Next high-impact news'].map(c => `<button type="button" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="hr"></div><h2>Settings</h2><dl class="kv">
     <dt>Route</dt><dd><select id="tr"><option value="auto">Auto</option><option value="bridge">Local Claude bridge</option><option value="office">Office relay (ntfy)</option><option value="desk">Offline (Desk data)</option></select></dd>
     <dt>Agent</dt><dd><select id="to">${ROSTER.map(([n]) => `<option ${n === CEO.to ? 'selected' : ''}>${n}</option>`).join('')}</select></dd>
     <dt>Voice</dt><dd><select id="lang"><option value="en-US">English</option><option value="de-DE">Deutsch</option></select></dd>
     <dt>Read replies aloud</dt><dd><input type="checkbox" id="speak" checked></dd></dl>
     <div class="src"><span id="trs">checking routes…</span></div></div></aside></div>`;
  return h;
}
function bindCEO() {
  CEO.draw(); $('#tr').value = CEO.transport; $('#lang').value = CEO.lang;
  $('#tr').onchange = e => { CEO.transport = e.target.value; localStorage.setItem('ceo-transport', CEO.transport); };
  $('#lang').onchange = e => { CEO.lang = e.target.value; localStorage.setItem('ceo-lang', CEO.lang); };
  $('#to').onchange = e => { CEO.to = e.target.value; };
  $('#cf').onsubmit = e => { e.preventDefault(); const t = $('#ta').value; $('#ta').value = ''; CEO.send(t); };
  $('#ta').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#cf').requestSubmit(); } };
  $$('[data-q]').forEach(b => b.onclick = () => CEO.send(b.dataset.q));
  const mic = $('#mic'); mic.onpointerdown = () => CEO.listen(true); mic.onpointerup = mic.onpointerleave = () => CEO.listen(false);
  CEO.bridgeUp().then(up => { $('#trs').textContent = `Local bridge: ${up ? 'connected' : 'off (run node v2/ceo-bridge/server.mjs)'} · Office relay: ${S.topic ? 'topic set' : 'no topic'} · Offline answers: always`; });
}

/* ---------------- command bar ---------------- */
const CMDS = () => [...NAV.map(n => ({ t: n.t, h: '#/' + n.r })), ...ASSETS.map(a => ({ t: ALABEL[a] + ' — asset page', h: '#/asset/' + a })), ...LEG.map(([k, t]) => ({ t: t + ' (current Desk)', h: LEGACY + '#/' + k, ext: 1 })), { t: 'Toggle day / night', act: () => $('#theme').click() }];
function openCmdk() { $('#cmdk').classList.add('on'); $('#cmdk-in').value = ''; drawCmdk(); $('#cmdk-in').focus(); }
function drawCmdk() {
  const q = $('#cmdk-in').value.toLowerCase(), list = CMDS().filter(c => c.t.toLowerCase().includes(q)).slice(0, 8);
  if (q && !list.length) list.push({ t: `Ask Head of CICM: “${$('#cmdk-in').value}”`, ask: 1 });
  $('#cmdk-res').innerHTML = list.map((c, i) => `<a href="${c.h || '#'}" data-i="${i}" class="${i === 0 ? 'sel' : ''}" ${c.ext ? 'target="_blank"' : ''}>${esc(c.t)}<small>${c.ask ? 'Enter' : c.ext ? '↗' : ''}</small></a>`).join('');
  $$('#cmdk-res a').forEach((a, i) => a.onclick = e => { const c = list[i]; if (c.act || c.ask) { e.preventDefault(); c.act ? c.act() : (location.hash = '#/ceo', setTimeout(() => CEO.send(q ? $('#cmdk-in').value : ''), 50)); } $('#cmdk').classList.remove('on'); });
  S.cmdList = list;
}

/* ---------------- router ---------------- */
const cur = () => location.hash.replace(/^#\/?/, '') || 'dashboard';
function route() {
  const raw = cur(), [path, qs] = raw.split('?'), params = new URLSearchParams(qs || '');
  if (params.get('topic')) { S.topic = params.get('topic'); sessionStorage.setItem('office-topic', S.topic); connectTopic(); }
  const parts = path.split('/');
  renderShell(path);
  let html;
  switch (parts[0]) {
    case 'asset': html = viewAsset((parts[1] || 'NQ').toUpperCase().replace('XAU', 'GOLD')); break;
    case 'prop': html = viewProp(); break;
    case 'office': html = viewOffice(); break;
    case 'ceo': html = viewCEO(params); break;
    case 'macro': html = viewMacro(); break;
    case 'calendar': html = viewCalendar(); break;
    case 'journal': html = viewJournal(); break;
    case 'performance': html = viewPerformance(); break;
    case 'psychology': html = viewPsychology(); break;
    default: html = viewDashboard();
  }
  $('#main').innerHTML = html; bindTop();
  $$('[data-out]').forEach(b => b.onclick = e => { e.preventDefault(); openOutput(b.dataset.out); });
  if (parts[0] === 'ceo') bindCEO();
  if (parts[0] === 'asset') { bindZones((parts[1] || 'NQ').toUpperCase().replace('XAU', 'GOLD')); $$('[data-rg]').forEach(b => b.onclick = () => { S.range = b.dataset.rg; $('#chart').innerHTML = chartSVG(b.closest('[data-k]').dataset.k, S.range); $$('[data-rg]').forEach(x => x.classList.toggle('on', x === b)); }); }
  bindSizer();
  document.title = 'Sidoss Capital · ' + ({ asset: ALABEL[(parts[1] || 'NQ').toUpperCase()] || 'Markets', prop: 'Prop', office: 'Office', ceo: 'CEO', macro: 'Macro', calendar: 'Calendar', journal: 'Journal', performance: 'Performance', psychology: 'Psychology' }[parts[0]] || 'Brief');
}
addEventListener('hashchange', () => { closeDrawer(); route(); scrollTo(0, 0); });
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 50), { passive: true });
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); }
  if (e.key === 'Escape') { $('#cmdk').classList.remove('on'); closeDrawer(); }
  if ($('#cmdk').classList.contains('on') && e.key === 'Enter' && document.activeElement === $('#cmdk-in')) { e.preventDefault(); $('#cmdk-res a')?.click(); }
  if (e.code === 'Space' && cur().startsWith('ceo') && document.activeElement.tagName !== 'TEXTAREA' && !e.repeat) { e.preventDefault(); CEO.listen(true); }
});
addEventListener('keyup', e => { if (e.code === 'Space' && cur().startsWith('ceo') && document.activeElement.tagName !== 'TEXTAREA') CEO.listen(false); });
$('#cmdk-in').addEventListener('input', drawCmdk);
$('#cmdk').addEventListener('click', e => { if (e.target.id === 'cmdk') e.target.classList.remove('on'); });
$('#scrim').onclick = closeDrawer;
document.documentElement.dataset.theme = S.theme;
(async () => {
  S.topic = sessionStorage.getItem('office-topic') || null;
  await loadAll(); route(); if (S.topic) connectTopic();
  setInterval(tickClock, 1000); setInterval(() => { if (!document.hidden && !cur().startsWith('ceo')) route(); }, 60000);
  requestAnimationFrame(drawScope);
})();
