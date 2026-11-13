/* Parity with the live Grok Desk/Office (inventory 12 Nov) + voice mode. Loaded after app.js and features.js. */
'use strict';

/* ================= Desk · Brief extras ================= */
function greeting() {
  const h = new Date().getHours(), part = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return `<div class="hello"><div><div class="hello-t">${part}, Stanislav</div><div class="small muted">${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())} · bias ${S.data.analyst ? utc(S.data.analyst.generated_at) + ' UTC' : '—'} · snapshot ${S.data.snapshot ? utc(S.data.snapshot.fetched_at) + ' UTC' : '—'}</div></div>${nextBig()}</div>`;
}
function nextBig() {
  const e = highEvents().filter(x => new Date(x.time_utc) > Date.now()).sort((a, b) => a.time_utc < b.time_utc ? -1 : 1)[0];
  if (!e) return '<div class="redf calm"><div class="l">Red folder</div><div class="v">none scheduled</div></div>';
  return `<div class="redf"><div class="l">Next red folder · ${dshort(e.time_utc)}</div><div class="v" data-count="${e.time_utc}">${until(e.time_utc).replace('in ', '')}</div><div class="tiny">${esc(e.event)} · ${utc(e.time_utc)} UTC · ${e.time_et} ET · no entries ${utc(e.no_entry_window_utc.start)}–${utc(e.no_entry_window_utc.end)}</div></div>`;
}
function ticker() {
  const Sn = S.data.snapshot, A = S.data.analyst; if (!Sn) return '';
  const it = ASSETS.map(k => { const s = Sn.assets[k], a = (A && A.assets[k]) || {}; return `<a class="tk-i" href="#/asset/${k}"><b>${k === 'GOLD' ? 'GC' : k}</b><span class="num">${s.price != null ? fmtPx(k, s.price) : '—'}</span><span class="num ${s.change_pct >= 0 ? 'up' : 'dn'}">${s.change_pct != null ? (s.change_pct >= 0 ? '+' : '') + s.change_pct.toFixed(2) + '%' : ''}</span>${a.direction && a.direction !== 'no_data' ? `<span class="tk-b ${dirClass(a.direction)}">${a.direction === 'bullish' ? 'Higher' : a.direction === 'bearish' ? 'Lower' : 'Flat'} ${a.agreement}</span>` : ''}</a>`; });
  for (const g of Object.values(Sn.gauges || {})) it.push(`<span class="tk-i"><b>${g.key}</b><span class="num">${g.value ?? '—'}${g.unit || ''}</span><span class="num ${g.change >= 0 ? 'up' : 'dn'}">${g.change != null ? (g.change >= 0 ? '+' : '') + g.change : ''}</span></span>`);
  return `<div class="ticker">${it.join('')}</div>`;
}
const MARKETS = [['Sydney', 'Australia/Sydney', 10, 0, 16, 0], ['Tokyo', 'Asia/Tokyo', 9, 0, 15, 0], ['London', 'Europe/London', 8, 0, 16, 30], ['New York', 'America/New_York', 9, 30, 16, 0]];
function sessionMap() {
  const now = new Date();
  const row = ([n, tz, h0, m0, h1, m1]) => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(now);
    const H = +p.find(x => x.type === 'hour').value, M = +p.find(x => x.type === 'minute').value, wd = p.find(x => x.type === 'weekday').value;
    const t = H * 60 + M, o = h0 * 60 + m0, c = h1 * 60 + m1, weekend = wd === 'Sat' || wd === 'Sun', open = !weekend && t >= o && t < c;
    const mins = open ? c - t : (t < o ? o - t : 24 * 60 - t + o);
    return `<div class="sm-r"><span class="st ${open ? 's-working' : 's-resting'}">${open ? 'open' : 'closed'}</span><b>${n}</b><span class="small muted">${String(h0).padStart(2, '0')}:${String(m0).padStart(2, '0')}–${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')} local</span><span class="small num" style="margin-left:auto">${weekend ? 'weekend' : (open ? 'closes in ' : 'opens in ') + Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm'}</span></div>`;
  };
  return `<div class="card"><h2>Session map <span class="r">cash hours, DST-aware</span></h2>${MARKETS.map(row).join('')}<div class="src"><span>Strategy sessions (15m): London 07:00–11:00 UTC · New York 12:00–18:00 UTC</span></div></div>`;
}
function rulesPanel() {
  const R = S.data.rules || {}, a = primaryAccount() || {}, C = a.criteria || {}, F = R.firm || {};
  const tile = (l, v, s) => `<div class="limit"><div class="l">${l}</div><div class="v">${v}</div><div class="tiny muted">${esc(s || '')}</div></div>`;
  return `<div class="card"><h2>Current trading rules <span class="r">${esc(R.id || '')} · effective ${esc(R.effective_from || '—')}</span></h2>
   <div class="small muted" style="margin-bottom:6px">FIRM · ${esc(F.name || ((S.data.prop || {}).firms || [{}])[0].name || '')}</div>
   <div class="limits" style="margin-top:0">${tile('Daily loss limit', usd(C.daily_loss_limit_usd ?? F.dll_usd), 'firm')}${tile('Max loss', usd(C.max_loss_usd ?? F.max_loss_usd), (C.max_loss_type || F.max_loss_type || '') + (C.min_balance_usd ? ' · MLL ' + usd(C.min_balance_usd) : ''))}${tile('Target', usd(C.profit_target_usd ?? F.profit_target_usd), (C.consistency ?? F.consistency_pct ?? '—') + '% consistency')}</div>
   <div class="small muted" style="margin:10px 0 6px">PERSONAL</div>
   <div class="limits" style="margin-top:0">${tile('Daily loss stop', usd(R.daily_stop_usd), '')}${tile('Max win', usd(R.profit_stop_usd), 'done for the day')}${tile('Loss-count stop', (R.max_losses_per_day ?? '—') + ' losses', 'and done')}</div>
   <div class="small" style="margin-top:8px"><b>Size</b> <span class="ink2">${esc(R.size_text || '—')}</span> · <b>Size cap</b> <span class="ink2">${esc(C.size_cap || F.size_cap || '—')}</span> · <b>News</b> <span class="ink2">±${R.news_window_min ?? '—'} min, ${esc(R.news_scope || '')}</span></div></div>`;
}
function checks() {
  const J0 = J(), a = primaryAccount(), Sn = S.data.snapshot, R = S.data.research;
  const today = new Date().toISOString().slice(0, 10), jt = J0 && !J0._FIXTURE ? (J0.trades || []).filter(t => t.date === today) : null;
  const vix = Sn && Sn.gauges.VIX, vAge = vix && vix.observed_at ? (Date.now() - new Date(vix.observed_at)) / 6e4 : null;
  const rows = [
    ['Personal rules', jt ? (jt.length + ' trades logged today · ' + jt.filter(t => t.pnl < 0).length + ' losses') : 'Journal not connected — trades today unknown', jt ? 'ok' : 'unknown'],
    ['Account sync', a ? `${a.label} balance ${usd(a.balance)} read ${age(a.balance_observed_at)} · ${a.balance_source || ''} · not broker-verified` : 'no account', a && (Date.now() - new Date(a.balance_observed_at)) / 36e5 < 6 ? 'ok' : 'warn'],
    ['Market data', `VIX ${vix ? vix.value : '—'} · ${vAge != null ? Math.round(vAge) + ' min old' : '—'} (limit 60) · news ${R ? age(R.generated_at) : '—'}`, vAge != null && vAge < 60 && R && (Date.now() - new Date(R.generated_at)) / 6e4 < 90 ? 'ok' : 'warn'],
  ];
  return `<div class="card"><h2>Checks</h2>${rows.map(([n, d, s]) => `<div class="chk"><span class="badge ${s === 'ok' ? 'b-up' : s === 'warn' ? 'b-amb' : 'b-mut'}">${s === 'ok' ? 'ok' : s === 'warn' ? 'check' : 'n/a'}</span><span><b>${n}</b> <span class="ink2">${esc(d)}</span></span></div>`).join('')}</div>`;
}
function gaugesRow() {
  const Sn = S.data.snapshot; if (!Sn) return '';
  return `<div class="grid kpis">${Object.values(Sn.gauges).map(g => { const pct = g.day_high > g.day_low ? (g.value - g.day_low) / (g.day_high - g.day_low) * 100 : 50; return `<div class="card"><h2>${g.key} <span class="r ${g.change >= 0 ? 'up' : 'dn'}">${g.change != null ? (g.change >= 0 ? '▲ +' : '▼ ') + g.change : ''}</span></h2><div class="big">${g.value ?? '—'}${g.unit || ''}</div><div class="rng"><span class="num tiny">L ${g.day_low ?? '—'}</span><div class="rng-b"><i style="left:${pct}%"></i></div><span class="num tiny">H ${g.day_high ?? '—'}</span></div><div class="src"><span>${esc((g.source || {}).symbol || '')} · ${utc(g.observed_at)} UTC · ${age(g.observed_at)}</span></div></div>`; }).join('')}
   <div class="card"><h2>Volatility rule</h2><div class="small ink2">${(S.data.rules || {}).vix_rule ? esc(S.data.rules.vix_rule) : 'No VIX rule in today\'s rule set.'}</div></div></div>`;
}
function whatChangedCounts() {
  const A = S.data.analyst, Sn = S.data.snapshot, R = S.data.research; if (!A || !Sn) return '';
  const crossed = [], conf = [];
  for (const k of ASSETS) { const a = A.assets[k], s = Sn.assets[k]; if (!a || a.price == null || s.price == null) continue;
    for (const l of a.levels || []) if ((a.price - l.price) * (s.price - l.price) < 0) crossed.push(`${ALABEL[k]} ${s.price > l.price ? 'reclaimed' : 'broke'} ${l.label} ${fmtPx(k, l.price)}`);
    if (a.conflict) conf.push(`${ALABEL[k]}: ${a.conflict_text}`); }
  const rel = R ? (R.calendar || []).filter(e => e.actual) : [], hl = R ? R.headlines.length : 0;
  const box = (n, t, items) => `<details class="wc"><summary><span class="big">${n}</span><span class="small muted">${t}</span></summary>${items.map(i => `<div class="small ink2 chk">• ${esc(i)}</div>`).join('') || '<div class="small muted">nothing</div>'}</details>`;
  return `<div class="card"><h2>What changed <span class="r">since the analyst read ${utc(A.generated_at)} UTC</span></h2><div class="grid kpis" style="gap:8px">
   ${box(crossed.length, 'levels broken or reclaimed', crossed)}${box(hl, 'sourced headlines (24h)', (R ? R.headlines.slice(0, 6).map(h => utc(h.time_utc) + ' ' + h.title_verbatim) : []))}${box(rel.length, 'releases with results', rel.map(e => e.event + ': ' + e.actual))}${box(conf.length, 'conflicting evidence', conf)}</div></div>`;
}
function pnlSummary() {
  const P = S.data.prop, J0 = J(); let h = '<div class="grid kpis">';
  if (!J0) h += `<div class="card"><h2>Net P&L</h2><div class="unavail">Journal not connected</div><div class="tiny muted">needs Trading Journal data.json</div></div>`;
  if (J0) { const st = perfStats(trades()); const m = new Date().toISOString().slice(0, 7), mt = perfStats(trades().filter(t => (t.date || '').startsWith(m)));
    h += `<div class="card"><h2>Net P&L · all time ${J0._FIXTURE ? '<span class="badge b-amb">fixture</span>' : ''}</h2><div class="big ${st.net >= 0 ? 'up' : 'dn'}">${usd(st.net)}</div><div class="tiny muted">${st.n} trades · PF ${st.pf ?? '—'}</div></div><div class="card"><h2>This month</h2><div class="big ${mt.net >= 0 ? 'up' : 'dn'}">${usd(mt.net)}</div><div class="tiny muted">${mt.n} trades</div></div>`; }
  if (P) { const r = propTotals(P); h += `<div class="card"><h2>Prop · net realised</h2><div class="big ${r.net >= 0 ? 'up' : 'dn'}">${usd(r.net)}</div><div class="tiny muted">payouts ${usd(r.paid)} − fees ${usd(r.fees)}</div></div><div class="card"><h2>Prop ROI · realised</h2><div class="big">${r.roi != null ? (r.roi >= 0 ? '+' : '') + r.roi + '%' : '—'}</div><div class="tiny muted">${r.active} active accounts</div></div>`; }
  return h + '</div>';
}
function briefExtras() { return greeting() + ticker(); }
function briefBottom() {
  return sec('', 'Rules & checks') + `<div class="grid g2">${rulesPanel()}<div class="grid" style="gap:10px">${checks()}${sessionMap()}</div></div>`
    + sec('', 'Gauges') + gaugesRow() + sec('', 'What changed') + whatChangedCounts() + sec('', 'P&L and prop') + pnlSummary();
}

/* ================= Desk · Prop extras ================= */
function propTotals(P) {
  const fees = P.accounts.flatMap(a => a.fees || []).filter(f => f.amount != null && f.in_desk_totals !== false).reduce((t, f) => t + f.amount, 0);
  const paid = P.accounts.flatMap(a => a.payouts || []).filter(p => p.status === 'paid').reduce((t, p) => t + (p.net ?? p.gross ?? 0), 0);
  return { fees: r2(fees), paid: r2(paid), net: r2(paid - fees), roi: fees ? r2((paid - fees) / fees * 100, 1) : null, active: P.accounts.filter(a => a.status === 'active').length };
}
const GROUP = a => a.status === 'active' ? (a.type === 'funded' ? 'Funded' : 'Challenges') : a.outcome === 'passed' ? 'Passed' : a.status === 'breached' ? 'Breached' : 'Closed';
function propExtras() {
  const P = S.data.prop; if (!P) return '';
  const firms = (P.firms || []).map(f => { const ac = P.accounts.filter(a => a.firm === f.id), t = propTotals({ accounts: ac }); return { f, n: ac.length, act: ac.filter(a => a.status === 'active').length, ...t }; });
  const grp = {}; P.accounts.forEach(a => (grp[GROUP(a)] ||= []).push(a));
  const T = propTotals(P), mx = Math.max(T.fees, T.paid, 1);
  let h = sec('', 'Per firm') + `<div class="grid g2"><div class="card" style="padding:0"><table><thead><tr><th>Firm</th><th class="n">Accounts</th><th class="n">Spend</th><th class="n">Payouts</th><th class="n">Net</th></tr></thead><tbody>${firms.map(x => `<tr><td><b>${esc(x.f.name)}</b><div class="tiny muted">split ${x.f.split != null ? x.f.split * 100 + '%' : '—'}</div></td><td class="n">${x.n} (${x.act} active)</td><td class="n">${usd(x.fees)}</td><td class="n">${usd(x.paid)}</td><td class="n ${x.net >= 0 ? 'up' : 'dn'}">${usd(x.net)}</td></tr>`).join('')}</tbody></table></div>
   <div class="card"><h2>Spend vs payouts <span class="r">ROI ${T.roi != null ? (T.roi >= 0 ? '+' : '') + T.roi + '%' : '—'} realised</span></h2><div class="bars"><div><span>Spend</span><i style="width:${T.fees / mx * 100}%;background:var(--dn)"></i><b class="num">${usd(T.fees)}</b></div><div><span>Payouts</span><i style="width:${T.paid / mx * 100}%;background:var(--up)"></i><b class="num">${usd(T.paid)}</b></div></div><div class="src"><span>ROI = (payouts − counted fees) ÷ counted fees</span></div></div></div>`;
  h += sec('', 'Accounts by status') + `<div class="chips grp-chips">${Object.entries(grp).map(([g, l]) => `<button type="button" data-grp="${g}">${g} · ${l.length}</button>`).join('')}</div><div id="grp-list" class="small ink2" style="margin:8px 2px"></div>`;
  if (P.plan) h += sec('', 'Your stated plan', 'text only — adds no rule') + `<div class="card">${P.plan.steps.map((s, i) => `<div class="req"><span class="ic" style="background:var(--acc)">${i + 1}</span><span><b>${esc(s.when)}:</b> ${esc(s.text)}${s.note ? `<div class="tiny amb">${esc(s.note)}</div>` : ''}</span><span></span></div>`).join('')}</div>`;
  h += sec('', 'Can I trade today', 'per active account') + `<div class="acards">${P.accounts.filter(a => a.status === 'active').map(a => { const { bind } = limitsFor(a), uc = a.unlogged_change, st = uc && uc.value < 0 && (S.data.rules || {}).daily_stop_usd != null && -uc.value >= S.data.rules.daily_stop_usd ? 'stop' : bind && bind.v > 0 ? 'go' : 'wait';
    return `<div class="card"><h2>${esc(a.label)}</h2><div class="verdict"><div class="lamp ${st}">${st.toUpperCase()}</div><div class="small ink2">${st === 'stop' ? 'Balance implies a loss beyond the daily stop — confirm first.' : 'Inside the rules in the data.'} Binding limit ${bind ? usd(bind.v) + ' (' + esc(bind.k) + ')' : '—'}.</div></div>${balanceChart(a)}${dayLedger(a)}</div>`; }).join('')}</div>`;
  return h;
}
function balanceChart(a) {
  const C = a.criteria || {}, pts = [...(a.eod_balances || []).map(x => ({ d: x.date, v: x.balance })), ...(a.balance != null ? [{ d: 'now', v: a.balance }] : [])];
  if (a.size != null) pts.unshift({ d: 'start', v: a.size });
  if (pts.length < 2 || C.min_balance_usd == null) return '';
  const vals = [...pts.map(p => p.v), C.min_balance_usd], mn = Math.min(...vals), mx = Math.max(...vals, a.size + (a.profitTargetUsd || 0)), W = 320, H = 110, Y = v => H - 12 - (v - mn) / ((mx - mn) || 1) * (H - 24), X = i => 8 + i * (W - 16) / (pts.length - 1);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" style="margin-top:10px"><line x1="0" x2="${W}" y1="${Y(C.min_balance_usd)}" y2="${Y(C.min_balance_usd)}" stroke="var(--dn)" stroke-dasharray="4 3"/><text x="${W - 4}" y="${Y(C.min_balance_usd) - 3}" text-anchor="end" font-size="10" fill="var(--dn)">MLL ${usd(C.min_balance_usd)}</text>
   ${a.profitTargetUsd ? `<line x1="0" x2="${W}" y1="${Y(a.size + (a.adjustedTargetUsd || a.profitTargetUsd))}" y2="${Y(a.size + (a.adjustedTargetUsd || a.profitTargetUsd))}" stroke="var(--up)" stroke-dasharray="4 3"/><text x="${W - 4}" y="${Y(a.size + (a.adjustedTargetUsd || a.profitTargetUsd)) - 3}" text-anchor="end" font-size="10" fill="var(--up)">target</text>` : ''}
   <polyline fill="none" stroke="var(--acc)" stroke-width="2" points="${pts.map((p, i) => X(i) + ',' + Y(p.v)).join(' ')}"/>${pts.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.v)}" r="3" fill="var(--acc)"/><text x="${X(i)}" y="${H - 1}" font-size="9.5" text-anchor="middle" fill="var(--ink3)">${esc(p.d.slice(5) || p.d)}</text>`).join('')}</svg>`;
}
function dayLedger(a) {
  const d = a.daily || []; if (!d.length) return '';
  return `<table style="margin-top:8px"><thead><tr><th>Day</th><th class="n">Net</th><th>Source</th></tr></thead><tbody>${d.map(x => `<tr><td>${esc(x.date)}</td><td class="n ${x.net >= 0 ? 'up' : 'dn'}">${usd(x.net)}</td><td class="tiny muted">${esc(x.source || 'journal')}</td></tr>`).join('')}${a.unlogged_change ? `<tr><td>today</td><td class="n dn">${usd(a.unlogged_change.value)}</td><td class="tiny amb">derived, not logged</td></tr>` : ''}</tbody></table>`;
}
function bindProp() {
  $$('[data-grp]').forEach(b => b.onclick = () => { const P = S.data.prop, l = P.accounts.filter(a => GROUP(a) === b.dataset.grp); $('#grp-list').innerHTML = l.map(a => `<div class="chk"><b>${esc(a.label)}</b> · ${esc(a.plan || '')} · ${a.balance != null ? usd(a.balance) : '—'} · ${esc(a.status)}${a.outcome ? ' (' + esc(a.outcome) + ')' : ''}</div>`).join(''); $$('[data-grp]').forEach(x => x.classList.toggle('on', x === b)); });
}

/* ================= Desk · Journal / Performance / Psychology / Calendar extras ================= */
function tradeDetail(id) {
  const t = (J().trades || []).find(x => x.id === id); if (!t) return;
  const d = $('#drawer'), row = (l, a, p) => `<tr><td>${l}</td><td class="n">${a ?? '—'}</td><td class="n muted">${p ?? 'not planned'}</td></tr>`;
  d.innerHTML = `<div class="sec" style="margin-top:0"><h2>${esc(t.ticker)} ${esc(t.side)} · ${esc(t.date)} ${esc(t.time || '')} UTC</h2><button class="btn" id="dx" style="margin-left:auto">Close</button></div>
   <div class="big ${t.pnl >= 0 ? 'up' : 'dn'}">${t.pnl != null ? usd(t.pnl) : 'P&L unknown'}</div><div class="small muted">${esc(t.account || '')} · ${esc(t.setup || '')} · grade ${esc(t.grade || '—')} · ${esc(t.session || '')}</div>
   <h3 style="margin-top:16px">How it went vs your plan</h3><table><thead><tr><th></th><th class="n">Actual</th><th class="n">Planned</th></tr></thead><tbody>${row('Entry', t.entry, t.plannedEntry)}${row('Exit', t.exit, t.plannedExit)}${row('Stop', t.stop, t.plannedStop)}${row('Size', t.qty, t.plannedSize)}</tbody></table>
   <h3 style="margin-top:16px">In your words</h3><div class="ink2">${esc(t.note || '—')}</div><div class="small" style="margin-top:6px">Emotion: <b>${esc(t.emotional || '—')}</b> · rules broken: ${(t.rules || []).length ? esc(t.rules.join(', ')) : 'none'}${t.stopRemoved ? ' · <span class="dn">stop removed</span>' : ''}</div>
   <h3 style="margin-top:16px">Coach review</h3><div class="ink2">${t.coach ? esc(t.coach.comment) : 'Awaiting coach review — Trading Coach has not graded this trade yet.'}</div>`;
  d.classList.add('on'); $('#scrim').classList.add('on'); $('#dx').onclick = closeDrawer;
}
function journalHeader() {
  if (!J()) return '';
  const ts = [...(J().trades || [])].sort((a, b) => (b.date + b.time) < (a.date + a.time) ? -1 : 1), t = ts[0]; if (!t) return '';
  return `<div class="card" style="margin-top:10px"><h2>Reflect while it's fresh <span class="r">latest of ${ts.length}</span></h2><div class="verdict"><div class="lamp ${t.pnl >= 0 ? 'go' : 'stop'}" style="font-size:11px">${esc(t.ticker)}</div><div><h3>${esc(t.side)} · ${t.pnl != null ? usd(t.pnl) : 'P&L unknown'} · ${esc(t.setup || '')}</h3><div class="small muted">${esc(t.date)} ${esc(t.time || '')} UTC · ${esc(t.account || '')} · ${t.coach ? 'coach-graded' : 'awaiting coach review'}</div><button class="btn" data-trade="${esc(t.id)}" style="margin-top:8px">Open trade report</button></div></div></div>`;
}
function perfExtras() {
  const P = S.data.prop; if (!P) return '';
  const T = propTotals(P);
  return sec('', 'Fees vs payouts · reconciliation') + `<div class="grid g2"><div class="card"><h2>Fees vs payouts</h2><div class="big">${usd(T.fees)} / ${usd(T.paid)}</div><div class="small muted">net realised ${usd(T.net)} · ROI ${T.roi ?? '—'}%</div></div>
   <div class="card" style="padding:0"><table><thead><tr><th>Account</th><th class="n">Start</th><th class="n">Balance</th><th class="n">Change</th><th class="n">Journal net</th><th class="n">Difference</th></tr></thead><tbody>${P.accounts.filter(a => a.balance != null && a.size != null).map(a => { const ch = r2(a.balance - a.size), jn = J() && !J()._FIXTURE ? r2((J().trades || []).filter(t => t.account === a.id && t.pnl != null).reduce((s, t) => s + t.pnl, 0)) : null; return `<tr><td>${esc(a.label)}</td><td class="n">${usd(a.size)}</td><td class="n">${usd(a.balance)}</td><td class="n ${ch >= 0 ? 'up' : 'dn'}">${usd(ch)}</td><td class="n">${jn != null ? usd(jn) : '<span class="muted">journal n/a</span>'}</td><td class="n ${jn != null && Math.abs(ch - jn) > 1 ? 'amb' : ''}">${jn != null ? usd(r2(ch - jn)) : '—'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}
function psychExtras() {
  const ts = trades(); if (!ts.length) return '';
  const days = {}; ts.forEach(t => (days[t.date] ||= []).push(t));
  const boxes = Object.entries(days).sort().map(([d, l]) => { const ok = l.filter(t => !(t.rules || []).length).length; return `<div class="dbox" title="${d}: ${ok}/${l.length} trades inside the rules"><b>${d.slice(5)}</b><span class="${ok === l.length ? 'up' : 'amb'}">${ok}/${l.length}</span></div>`; }).join('');
  const all = ts.length, inside = ts.filter(t => !(t.rules || []).length).length, score = Math.round(inside / all * 100);
  const lossBreak = r2(ts.filter(t => (t.rules || []).length && t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  let streak = 0; for (const t of [...ts].sort((a, b) => (b.date + b.time) < (a.date + a.time) ? -1 : 1)) { if (!streak || Math.sign(t.pnl) === Math.sign(streak)) streak += Math.sign(t.pnl); else break; }
  const today = ts.filter(t => t.date === new Date().toISOString().slice(0, 10)).length;
  return `<div class="grid kpis" style="margin-top:10px"><div class="card"><h2>Discipline score</h2><div class="big">${score}/100</div><div class="tiny muted">${inside} of ${all} trades inside the rules</div></div><div class="card"><h2>Losses on rule-breaking trades</h2><div class="big dn">${usd(lossBreak)}</div></div><div class="card"><h2>Current streak</h2><div class="big ${streak >= 0 ? 'up' : 'dn'}">${streak > 0 ? '+' : ''}${streak}</div><div class="tiny muted">${Math.abs(streak)} ${streak >= 0 ? 'wins' : 'losses'} in a row</div></div><div class="card"><h2>Today's trades</h2><div class="big">${today}</div><div class="tiny muted">plan max ${(S.data.rules || {}).max_trades_per_day ?? '—'}</div></div></div>`
    + sec('', 'Rule boxes by day') + `<div class="card"><div class="dboxes">${boxes}</div></div>`;
}
function calendarExtras() {
  const R = S.data.research; if (!R) return '';
  return `<div class="grid g2" style="margin-top:10px"><div class="card">${nextBig()}</div><div class="card"><h2>Filter</h2><div class="seg" id="calf"><button data-f="key" class="on">Key</button><button data-f="high">High</button><button data-f="all">All</button></div><div class="src"><span>Key = high + medium · times UTC, ET for US releases</span></div></div></div>`;
}
function bindCalendar() {
  const f = $('#calf'); if (!f) return; const apply = m => { $$('.main .ev').forEach(e => { const hi = e.classList.contains('high'), md = e.classList.contains('medium'); e.style.display = m === 'all' || (m === 'high' && hi) || (m === 'key' && (hi || md)) ? '' : 'none'; }); $$('#calf button').forEach(b => b.classList.toggle('on', b.dataset.f === m)); };
  $$('#calf button').forEach(b => b.onclick = () => apply(b.dataset.f)); apply('key');
}

/* ================= Office app ================= */
const FLOORS = [[5, 'Management', '#C9A227'], [4, 'IT & Coding', '#0EA5E9'], [3, 'Trading', '#2EB872'], [2, 'Video', '#E4572E'], [1, 'Finance', '#3B82F6']];
function viewOfficeApp() {
  const L = latestBy(), N = needsYou(), cnt = st => Object.values(L).filter(s => s.state === st).length, outs = {};
  for (const s of allStatus()) if (s.output) outs[s.bot] = s;
  const U = S.live.usage || S.data.usage;
  let h = topBar('CICM Office', `${S.live.conn === 'live' ? '<span class="up">● Live</span>' : '● Run log'} · ${cnt('working')} working · ${cnt('waiting')} waiting · ${cnt('stuck')} stuck · ${cnt('resting') + cnt('finished')} idle`);
  h += `<div class="grid kpis"><div class="card"><h2>Working</h2><div class="big up">${cnt('working')}</div></div><div class="card"><h2>Waiting on you</h2><div class="big amb">${N.length}</div></div><div class="card"><h2>Stuck</h2><div class="big dn">${cnt('stuck')}</div></div><div class="card"><h2>Weekly limit</h2>${U ? `<div class="big">${U.weekly_used_pct}%</div><div class="prog"><i style="width:${U.weekly_used_pct}%"></i></div><div class="tiny muted">resets ${dshort(U.resets_at)} ${utc(U.resets_at)} UTC · updated ${age(U.updated_at)}</div>` : '<div class="unavail small">arrives with the live topic</div>'}</div></div>`;
  h += sec('', 'Waiting on me', N.length + ' open') + (N.length ? `<div class="grid">${N.map(s => `<div class="card need"><div style="display:flex;gap:10px;align-items:center"><span class="st s-${s.state}">${s.state}</span><b>${esc(s.bot)}</b><span class="small muted" style="margin-left:auto">${stamp(s.ts)} · ${age(s.ts)}</span></div><div style="margin-top:6px">${esc(s.needs_owner || s.task)}</div><div style="margin-top:8px;display:flex;gap:8px">${s.output ? `<button class="btn" data-out="${esc(s.output)}">Open output</button>` : ''}<button class="btn pri" data-chat="${esc(s.bot)}">Reply</button></div></div>`).join('')}</div>` : '<div class="card muted">Nobody is waiting on you.</div>');
  h += sec('', 'Floors') + FLOORS.map(([n, team, col]) => { const bots = ROSTER.filter(r => r[1] === team); return `<div class="floor"><div class="floor-h" style="--fc:${col}"><span class="fn">${String(n).padStart(2, '0')}</span><b>${team}</b><span class="small muted">${bots.length} agents · ${bots.filter(b => (L[b[0]] || {}).state === 'working').length} working</span>${team === 'Trading' ? '<a class="small" href="../desk-v2/" style="margin-left:auto">Desk ↗</a>' : team === 'Finance' ? '<a class="small" href="https://ssidoss.github.io/finance/" target="_blank" rel="noopener" style="margin-left:auto">Finance ↗</a>' : ''}</div>
     <div class="agents">${bots.map(([nm, , c]) => { const s = L[nm], o = outs[nm]; return `<div class="card agent ${N.includes(s) ? 'need' : ''}"><div class="hd"><span class="av" style="background:${c}">${nm.split(/\s|&/).filter(w => w && w !== 'of').map(w => w[0].toUpperCase()).join('').slice(0, 2)}</span><div><div class="nm">${esc(nm)}</div><div class="tm">${s ? stamp(s.ts) + ' · ' + age(s.ts) : 'no status yet'}</div></div><span class="st s-${s ? s.state : 'unknown'}" style="margin-left:auto">${s ? s.state : '—'}</span></div><div class="small">${s ? esc(s.task) : '<span class="unavail">No status posted in the loaded history</span>'}</div>${o ? `<div class="out">Latest output · <a href="#" data-out="${esc(o.output)}">${esc(o.output.split('/').slice(-2).join('/'))}</a></div>` : ''}<div><button class="btn" data-chat="${esc(nm)}">Chat</button></div></div>`; }).join('')}</div></div>`; }).join('');
  const Rt = (S.data.routines || {}).routines || [];
  h += `<div class="grid g2" style="margin-top:10px"><div class="card"><h2>Routines <span class="r">${Rt.length}</span></h2><table><thead><tr><th>Routine</th><th>Owner</th><th>Cadence</th><th>Grok</th><th>Claude</th></tr></thead><tbody>${Rt.map(r => `<tr><td><b>${esc(r.id)}</b> ${esc(r.name)}</td><td class="small">${esc(r.owner)}</td><td class="small">${esc(r.cadence)} <span class="muted">${esc(r.timezone || '')}</span></td><td><span class="badge ${r.grok_state === 'active' ? 'b-up' : 'b-mut'}">${esc(r.grok_state)}</span></td><td class="tiny muted">not scheduled</td></tr>`).join('')}</tbody></table></div>
   <div class="card"><h2>Activity <span class="r">newest first · UTC</span></h2><div class="feed">${allStatus().slice(-80).reverse().map(s => `<div><span>${utc(s.ts)}</span><span class="b"><b>${esc(s.bot)}</b></span><span><span class="st s-${s.state}"></span> ${esc(s.task)}</span></div>`).join('')}</div></div></div>`;
  if (U && U.bots) h += sec('', 'Share of usage') + `<div class="card">${U.bots.map(b => `<div class="bars"><div><span>${esc(b.name)}</span><i style="width:${b.share_pct === '<1' ? 1 : b.share_pct}%"></i><b class="num">${b.share_pct}%</b></div></div>`).join('')}</div>`;
  h += `<div class="src"><span>3D building: <a href="https://ssidoss.github.io/office/" target="_blank" rel="noopener">current Office ↗</a></span><span>Live: add <code class="mono">?topic=…</code> to the address (read-only here; replies use the chat)</span></div>`;
  return h;
}
function bindOffice() { $$('[data-chat]').forEach(b => b.onclick = () => openVoice(b.dataset.chat, false)); }

/* ================= Voice mode (on every page, both apps) ================= */
function voiceShell() {
  if ($('#vfab')) return;
  document.body.insertAdjacentHTML('beforeend', `<button id="vfab" class="vfab" aria-label="Talk to Head of CICM" title="Talk to Head of CICM (V)">${I.mic}</button>
   <div id="voice" class="voice" role="dialog" aria-label="Voice"><div class="v-top"><span class="v-who" id="v-who">Head of CICM</span><span class="small muted" id="v-route"></span><select id="v-agent">${ROSTER.map(([n]) => `<option>${n}</option>`).join('')}</select><select id="v-lang"><option value="en-US">English</option><option value="de-DE">Deutsch</option></select><button class="btn" id="v-x">Close</button></div>
   <canvas id="v-orb" class="v-orb"></canvas><div class="v-state" id="v-state">Hold the button or Space to talk</div><div class="v-tr" id="v-tr"></div><div class="v-ans" id="v-ans"></div>
   <div class="v-bar"><button class="mic big-mic" id="v-mic" aria-label="Hold to talk">${I.mic}</button><form id="v-form" class="v-form"><input id="v-in" placeholder="…or type and press Enter" autocomplete="off"></form></div>
   <div class="chips v-chips">${['What should I know before NY?', 'Can I trade the 150K eval now?', "What's left on my evals?", 'Who needs me?', 'NQ bias and invalidation', 'Next high-impact news'].map(c => `<button type="button" data-vq="${esc(c)}">${esc(c)}</button>`).join('')}</div>
   <div class="src v-note" id="v-note"></div></div>`);
  $('#vfab').onclick = () => openVoice(CEO.to || 'Head of CICM', true);
  $('#v-x').onclick = closeVoice;
  $('#v-agent').onchange = e => { CEO.to = e.target.value; $('#v-who').textContent = CEO.to; };
  $('#v-lang').onchange = e => { CEO.lang = e.target.value; SAFE.set(localStorage, 'ceo-lang', CEO.lang); };
  const m = $('#v-mic'); m.onpointerdown = e => { e.preventDefault(); vListen(true); }; m.onpointerup = m.onpointerleave = () => vListen(false);
  $('#v-form').onsubmit = e => { e.preventDefault(); const t = $('#v-in').value.trim(); if (t) { $('#v-in').value = ''; vAsk(t); } };
  $$('[data-vq]').forEach(b => b.onclick = () => vAsk(b.dataset.vq));
  addEventListener('keydown', e => { const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName); if (!typing && e.key.toLowerCase() === 'v' && !$('#voice').classList.contains('on')) openVoice(CEO.to || 'Head of CICM', true); if ($('#voice').classList.contains('on') && e.code === 'Space' && !typing && !e.repeat) { e.preventDefault(); vListen(true); } if (e.key === 'Escape') closeVoice(); });
  addEventListener('keyup', e => { if ($('#voice').classList.contains('on') && e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) vListen(false); });
  requestAnimationFrame(orbLoop);
}
function openVoice(agent, voiceFirst) {
  CEO.to = agent; $('#v-who').textContent = agent; $('#v-agent').value = agent; $('#v-lang').value = CEO.lang;
  $('#voice').classList.add('on'); vState('idle');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  $('#v-note').innerHTML = `<span>${SR ? 'Voice: browser speech recognition (Chrome, Edge, Safari) · replies read aloud' : 'This browser has no speech recognition — type instead (Chrome/Edge/Safari support voice)'}</span><span>Inside the Claude preview the microphone is blocked; use the real page.</span>`;
  CEO.bridgeUp().then(up => { $('#v-route').textContent = up ? '· live agent (local bridge)' : S.topic ? '· Office relay' : '· offline answers from Desk data'; });
  if (!voiceFirst) $('#v-in').focus();
}
function closeVoice() { const v = $('#voice'); if (v) v.classList.remove('on'); try { speechSynthesis.cancel(); } catch { } vListen(false); }
let vRec = null, vMode = 'idle';
function vState(m, txt) { vMode = m; $('#v-state').textContent = txt || { idle: 'Hold the button or Space to talk', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…' }[m]; $('#v-mic').classList.toggle('rec', m === 'listening'); }
function vListen(on) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (on && !SR) { vState('idle', 'No speech recognition in this browser — type below'); return; }
  if (on && !vRec) {
    try { speechSynthesis.cancel(); } catch { }
    const r = new SR(); r.lang = CEO.lang; r.interimResults = true; r.continuous = true; let fin = '';
    r.onresult = e => { let t = ''; for (const x of e.results) t += x[0].transcript; fin = t; $('#v-tr').textContent = '“' + t + '”'; };
    r.onerror = e => vState('idle', e.error === 'not-allowed' ? 'Microphone blocked — allow it in the browser (not available inside the Claude preview)' : 'Voice error: ' + e.error);
    r.onend = () => { vRec = null; scope(false); if (fin.trim()) vAsk(fin.trim()); else if (vMode === 'listening') vState('idle'); };
    try { r.start(); vRec = r; vState('listening'); scope(true); } catch (e) { vState('idle', 'Could not start the microphone'); }
  } else if (!on && vRec) { try { vRec.stop(); } catch { } }
}
async function vAsk(text) {
  $('#v-tr').textContent = '“' + text + '”'; vState('thinking'); $('#v-ans').innerHTML = '';
  const before = CEO.msgs.length; await CEO.send(text);
  const reply = CEO.msgs.slice(before).reverse().find(m => m.from !== 'me');
  if (reply) { $('#v-ans').innerHTML = md(reply.text) + (reply.sources ? `<div class="src">${reply.sources.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''); }
  else $('#v-ans').textContent = (CEO.msgs[CEO.msgs.length - 1] || {}).state === 'sent' ? 'Sent through the Office relay — the reply appears here when the agent answers.' : '';
  if (reply && 'speechSynthesis' in window) { vState('speaking'); const u = new SpeechSynthesisUtterance(reply.text.replace(/[*_#`]/g, '').slice(0, 700)); u.lang = CEO.lang; const vv = speechSynthesis.getVoices().find(v => v.lang === CEO.lang); if (vv) u.voice = vv; u.onend = () => vState('idle'); u.onerror = () => vState('idle'); speechSynthesis.speak(u); }
  else vState('idle');
}
function orbLoop(t) {
  const cv = $('#v-orb');
  if (cv && $('#voice').classList.contains('on')) {
    const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2, g = cv.getContext('2d'), cx = w / 2, cy = h / 2, R = Math.min(w, h) * .26;
    const cs = getComputedStyle(document.body), acc = cs.getPropertyValue('--acc').trim() || '#3b82f6', dn = cs.getPropertyValue('--dn').trim() || '#f43f5e', up = cs.getPropertyValue('--up').trim() || '#10b981';
    const col = vMode === 'listening' ? dn : vMode === 'speaking' ? up : acc;
    let lvl = 0; if (CEO.an) { const b = new Uint8Array(256); CEO.an.getByteTimeDomainData(b); for (const x of b) lvl = Math.max(lvl, Math.abs(x - 128) / 128); }
    const amp = vMode === 'listening' ? .08 + lvl * .5 : vMode === 'speaking' ? .12 + .08 * Math.sin(t / 90) : vMode === 'thinking' ? .06 : .03;
    g.clearRect(0, 0, w, h);
    for (let ring = 0; ring < 3; ring++) {
      g.beginPath();
      for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, n = Math.sin(a * (3 + ring) + t / (500 - ring * 120)) * amp + Math.sin(a * 7 - t / 300) * amp * .4, r = R * (1 + ring * .12) * (1 + n); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = col; g.globalAlpha = .9 - ring * .28; g.lineWidth = 3 - ring * .6; g.stroke();
    }
    g.globalAlpha = .14; g.fillStyle = col; g.beginPath(); g.arc(cx, cy, R * .92, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    if (vMode === 'thinking') { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R * 1.45, t / 200, t / 200 + 1.2); g.stroke(); }
  }
  requestAnimationFrame(orbLoop);
}
