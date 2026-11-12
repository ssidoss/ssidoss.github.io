/* Sidoss v2 — features that the Grok Desk had and v2 was missing:
   price chart (levels, VWAP, EQ zones, manual zones), position-size calculator, V Areas zones, volume profile, session RVOL,
   Macro, Calendar, Journal, Performance, Psychology pages. Loaded after app.js (shares its helpers). */
'use strict';
const SPEC = { // CME contract specs (point value in USD, tick size) — source: CME Group contract specifications
  MNQ: { pv: 2, tick: 0.25, asset: 'NQ', name: 'MNQ · Micro E-mini Nasdaq-100' }, NQ: { pv: 20, tick: 0.25, asset: 'NQ', name: 'NQ · E-mini Nasdaq-100' },
  MGC: { pv: 10, tick: 0.1, asset: 'GOLD', name: 'MGC · Micro Gold' }, GC: { pv: 100, tick: 0.1, asset: 'GOLD', name: 'GC · Gold' } };

/* ---------- chart ---------- */
function chartSVG(k, range) {
  const s = ((S.data.snapshot || {}).assets || {})[k] || {}, a = ((S.data.analyst || {}).assets || {})[k] || {};
  let bars = (s.bars_1h || []).map(b => ({ t: b[0], o: b[1], h: b[2], l: b[3], c: b[4] }));
  const cut = Date.now() / 1000 - (range === '1D' ? 26 : range === '5D' ? 24 * 5.5 : 24 * 30) * 3600; bars = bars.filter(b => b.t >= cut);
  if (bars.length < 3) return '<div class="unavail">Chart unavailable — no hourly bars in the snapshot</div>';
  const zones = [...(s.eq_zones || []).filter(z => z.low != null), ...manualZones(k)];
  const lv = (a.levels && a.levels.length ? a.levels : s.levels || []).filter(x => x.price != null);
  const ys = [...bars.flatMap(b => [b.h, b.l])]; let mn = Math.min(...ys), mx = Math.max(...ys);
  const pad = (mx - mn) * .08; mn -= pad; mx += pad;
  const W = 900, H = 320, L = 8, R = 70, T = 10, B = 24, X = i => L + (i + .5) * (W - L - R) / bars.length, Y = p => T + (mx - p) / (mx - mn) * (H - T - B);
  const bw = Math.max(1.5, (W - L - R) / bars.length * .62);
  const inR = p => p >= mn && p <= mx;
  let g = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${ALABEL[k]} hourly chart with levels">`;
  for (let i = 0; i <= 4; i++) { const p = mn + (mx - mn) * i / 4; g += `<line x1="${L}" x2="${W - R}" y1="${Y(p)}" y2="${Y(p)}" stroke="var(--rule)"/><text x="${W - R + 6}" y="${Y(p) + 4}" font-size="11" fill="var(--ink3)">${fmtPx(k, p)}</text>`; }
  for (const z of zones) if (inR(z.low) || inR(z.high)) g += `<rect x="${L}" width="${W - L - R}" y="${Y(Math.min(mx, z.high))}" height="${Math.max(2, Y(Math.max(mn, z.low)) - Y(Math.min(mx, z.high)))}" fill="var(--acc-bg)" stroke="var(--acc)" stroke-dasharray="3 3"/><text x="${L + 6}" y="${Y(Math.min(mx, z.high)) - 3}" font-size="10.5" fill="var(--acc)">${esc(z.label)}</text>`;
  const used = [];
  for (const x of [...lv].sort((p, q) => q.price - p.price)) if (inR(x.price)) { const c = x.role === 'resistance' ? 'var(--dn)' : x.role === 'support' ? 'var(--up)' : 'var(--info)'; const y = Y(x.price);
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${c}" stroke-opacity=".5" stroke-width="1"/>`;
    if (!used.some(u => Math.abs(u - y) < 13) && (s.price == null || Math.abs(Y(s.price) - y) > 12)) { used.push(y); g += `<text x="${W - R - 4}" y="${y - 3}" font-size="10" text-anchor="end" fill="${c}">${esc(x.label)} ${fmtPx(k, x.price)}</text>`; } }
  bars.forEach((b, i) => { const up = b.c >= b.o, c = up ? 'var(--up)' : 'var(--dn)'; g += `<line x1="${X(i)}" x2="${X(i)}" y1="${Y(b.h)}" y2="${Y(b.l)}" stroke="${c}"/><rect x="${X(i) - bw / 2}" width="${bw}" y="${Y(Math.max(b.o, b.c))}" height="${Math.max(1, Math.abs(Y(b.o) - Y(b.c)))}" fill="${c}" rx="1"/>`; });
  if (s.price != null && inR(s.price)) g += `<line x1="${L}" x2="${W - R}" y1="${Y(s.price)}" y2="${Y(s.price)}" stroke="var(--acc)" stroke-dasharray="2 3"/><rect x="${W - R + 2}" y="${Y(s.price) - 9}" width="${R - 4}" height="18" rx="4" fill="var(--acc)"/><text x="${W - R + 6}" y="${Y(s.price) + 4}" font-size="11" font-weight="600" fill="#fff">${fmtPx(k, s.price)}</text>`;
  const d0 = new Date(bars[0].t * 1000), d1 = new Date(bars[bars.length - 1].t * 1000);
  g += `<text x="${L}" y="${H - 6}" font-size="11" fill="var(--ink3)">${dshort(d0.toISOString())} ${utc(d0.toISOString())}</text><text x="${W - R}" y="${H - 6}" font-size="11" text-anchor="end" fill="var(--ink3)">${dshort(d1.toISOString())} ${utc(d1.toISOString())} UTC</text></svg>`;
  return g;
}

/* ---------- position size ---------- */
function sizerHTML(defAsset) {
  const ins = defAsset === 'GOLD' ? 'MGC' : 'MNQ', R = S.data.rules || {};
  return `<div class="sizer" data-sizer><div class="sz-row">
    <label>Contract<select data-sz="ins">${Object.entries(SPEC).map(([c, v]) => `<option value="${c}" ${c === ins ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label>
    <label>Entry<input data-sz="entry" inputmode="decimal" placeholder="${(((S.data.snapshot || {}).assets || {})[SPEC[ins].asset] || {}).price ?? ''}"></label>
    <label>Stop<input data-sz="stop" inputmode="decimal" placeholder="stop price"></label>
    <label>Risk $<input data-sz="risk" inputmode="decimal" placeholder="planned risk"></label></div>
    <div class="sz-out small" data-sz="out">Enter entry, stop and your planned risk. ${esc(R.size_text || '')}</div></div>`;
}
function bindSizer(root = document) {
  root.querySelectorAll('[data-sizer]').forEach(box => {
    const v = n => box.querySelector(`[data-sz="${n}"]`), calc = () => {
      const sp = SPEC[v('ins').value], e = +v('entry').value || +v('entry').placeholder, st = +v('stop').value, risk = +v('risk').value;
      const out = v('out');
      if (!e || !st || e === st) { out.innerHTML = `Tick ${sp.tick} = ${usd(sp.tick * sp.pv)} · 1 point = ${usd(sp.pv)} per contract (CME specs).`; return; }
      const pts = Math.abs(e - st), ticks = Math.round(pts / sp.tick), per = r2(pts * sp.pv);
      const { bind } = limitsFor(primaryAccount());
      let html = `<b>${pts.toFixed(2)} pts</b> (${ticks} ticks) × ${usd(sp.pv)} = <b>${usd(per)}</b> risk per contract.`;
      if (risk) { const n = Math.floor(risk / per + 1e-9); html += ` For ${usd(risk)} planned risk: <b class="acc">${n} contract${n === 1 ? '' : 's'}</b> (${usd(r2(n * per))}).`; if (bind && n * per > bind.v) html += ` <span class="dn">⚠️ above today's binding limit ${usd(bind.v)} (${esc(bind.k)}).</span>`; }
      html += ` <span class="muted">Planning aid — your rule set decides size.</span>`;
      out.innerHTML = html;
    };
    box.querySelectorAll('input,select').forEach(x => x.addEventListener('input', calc)); calc();
  });
}

/* ---------- V Areas zones ---------- */
const manualZones = k => { try { return JSON.parse(localStorage.getItem('zones-' + k) || '[]'); } catch { return []; } };
function zonesHTML(k) {
  const s = ((S.data.snapshot || {}).assets || {})[k] || {}, all = [...(s.eq_zones || []).map(z => ({ ...z, auto: 1 })), ...manualZones(k)];
  const inZone = all.filter(z => z.low != null && s.price != null && s.price >= z.low && s.price <= z.high);
  return `<div class="card"><h2>V Areas zones <span class="r">${inZone.length ? `<span class="badge b-amb">price in ${esc(inZone[0].label)}</span>` : '<span class="badge b-mut">price not in a zone</span>'}</span></h2>
   <div class="reqs">${all.map((z, i) => `<div class="req"><span class="ic" style="background:var(--acc)">${z.auto ? 'A' : 'M'}</span><span>${esc(z.label)}<div class="tiny muted">${z.auto ? esc(z.candle_local + ' · ' + (z.method || z.missing_reason || '') + ' · ' + z.source) : 'manual · ' + esc(z.note || '')}</div></span><span class="num">${z.low != null ? fmtPx(k, z.low) + ' – ' + fmtPx(k, z.high) : '<span class="muted">' + esc(z.missing_reason || '—') + '</span>'} ${z.auto ? '' : `<button class="btn" data-zdel="${i - (s.eq_zones || []).length}" aria-label="Remove zone">×</button>`}</span></div>`).join('')}</div>
   <form class="sz-row" data-zadd style="margin-top:10px"><label>Zone<select name="t"><option>EV line (volume pocket)</option><option>Open wick</option><option>EQ LD (manual)</option><option>EQ NY (manual)</option><option>Other</option></select></label><label>Low<input name="lo" inputmode="decimal" required></label><label>High<input name="hi" inputmode="decimal" required></label><button class="btn pri" type="submit">Add zone</button></form>
   <div class="src"><span>Rejection: closed hanging candle in the zone (A+ = no wicks) · confirmation candle after it · invalidation: not defined in your note — set your own</span><span>Manual zones are stored on this device only</span></div></div>`;
}
function bindZones(k) {
  const f = $('[data-zadd]'); if (f) f.onsubmit = e => { e.preventDefault(); const lo = +f.lo.value, hi = +f.hi.value; if (!lo || !hi) return; const z = manualZones(k); z.push({ label: f.t.value, low: Math.min(lo, hi), high: Math.max(lo, hi), note: 'added ' + new Date().toISOString().slice(0, 16) + 'Z' }); localStorage.setItem('zones-' + k, JSON.stringify(z)); route(); };
  $$('[data-zdel]').forEach(b => b.onclick = () => { const z = manualZones(k); z.splice(+b.dataset.zdel, 1); localStorage.setItem('zones-' + k, JSON.stringify(z)); route(); });
}

/* ---------- volume profile + session RVOL ---------- */
function vpHTML(k) {
  const s = ((S.data.snapshot || {}).assets || {})[k] || {}, vp = s.volume_profile_prev;
  if (!vp) return '<div class="card"><h2>Volume profile</h2><div class="unavail">Unavailable — not enough 5m bars</div></div>';
  const mx = Math.max(...vp.rows.map(r => r.volume)), rows = [...vp.rows].reverse();
  return `<div class="card"><h2>Volume profile · previous session <span class="r">POC ${fmtPx(k, vp.poc)} · VA ${fmtPx(k, vp.val)}–${fmtPx(k, vp.vah)}</span></h2>
   <div class="vp">${rows.map(r => { const inVA = r.price >= vp.val && r.price < vp.vah, poc = Math.abs(r.price + vp.row_size / 2 - vp.poc) < vp.row_size; return `<div class="vprow"><span class="num tiny muted">${fmtPx(k, r.price)}</span><i style="width:${(r.volume / mx * 100).toFixed(1)}%;background:${poc ? 'var(--acc)' : inVA ? 'var(--info)' : 'var(--rule2)'}"></i></div>`; }).join('')}</div>
   <div class="src"><span>${esc(vp.method)}</span><span>${utc(vp.from_utc)}–${utc(vp.to_utc)} UTC · rows ${vp.row_size}</span><span>Approximate — not exchange tick data</span></div></div>`;
}
function rvolHTML(k) {
  const s = ((S.data.snapshot || {}).assets || {})[k] || {}, R = s.session_rvol || [];
  return `<div class="card"><h2>Session participation (RVOL)</h2><table><thead><tr><th>Session</th><th>UTC</th><th class="n">Volume</th><th class="n">Usual</th><th class="n">RVOL</th></tr></thead><tbody>${R.map(x => `<tr><td><b>${({ asia: 'Asia', london: 'London', newyork: 'New York' })[x.session]}</b><div class="tiny muted">${x.state.replace('_', ' ')}</div></td><td class="small">${x.window_utc}</td><td class="n">${x.volume?.toLocaleString() ?? '—'}</td><td class="n">${x.usual?.toLocaleString() ?? '—'}</td><td class="n"><b class="${x.rvol >= 1.2 ? 'up' : x.rvol != null && x.rvol < .8 ? 'amb' : ''}">${x.rvol != null ? x.rvol + '×' : '—'}</b><div class="tiny muted">${x.sessions_compared != null ? 'vs ' + x.sessions_compared + ' days' : ''}</div></td></tr>`).join('')}</tbody></table>
   <div class="src"><span>Same elapsed window on prior days · small sample (free 5m history) · below 0.8× low, above 1.2× high</span></div></div>`;
}

/* ---------- Macro ---------- */
function viewMacro() {
  const A = S.data.analyst, R = S.data.research, Sn = S.data.snapshot;
  let h = topBar('Macro', '') + `<div class="lsub">Every instrument side by side · ${A ? 'Head Analyst ' + stamp(A.generated_at) : 'no analyst read'}</div>`;
  h += `<div class="card" style="padding:0;overflow-x:auto"><table><thead><tr><th>Instrument</th><th class="n">Price</th><th class="n">Change</th><th>Bias</th><th class="n">Agreement</th><th>News</th><th>Structure 4H / 30M</th><th>Invalidation</th></tr></thead><tbody>${ASSETS.map(k => { const s = Sn.assets[k] || {}, a = (A && A.assets[k]) || {}, nb = (R && R.news_bias[k]) || {}; return `<tr><td><a href="#/asset/${k}"><b>${ALABEL[k]}</b></a><div class="tiny muted">${esc((s.source || {}).symbol || '')}${s.provider_delay_min ? ' · ~' + s.provider_delay_min + 'm delay' : ''}</div></td><td class="n">${s.price != null ? fmtPx(k, s.price) : '—'}</td><td class="n ${s.change_pct >= 0 ? 'up' : 'dn'}">${s.change_pct != null ? (s.change_pct >= 0 ? '+' : '') + s.change_pct.toFixed(2) + '%' : '—'}</td><td><span class="badge ${dirBadge(a.direction)}">${esc(a.direction || '—')}</span>${a.conflict ? ' <span class="badge b-amb">conflict</span>' : ''}</td><td class="n">${a.agreement ?? '—'}</td><td class="small">${esc(nb.bias || '—')}${nb.strength != null ? ' · ' + nb.strength : ''}</td><td class="small">${esc((s.structure || {}).h4 || '—')} / ${esc((s.structure || {}).m30 || '—')}</td><td class="small ink2" style="max-width:320px">${esc(a.invalidation || '—')}</td></tr>`; }).join('')}</tbody></table></div>`;
  h += sec('', 'Gauges') + `<div class="grid kpis">${Object.values(Sn.gauges || {}).map(g => `<div class="card"><h2>${g.key}</h2><div class="big">${g.value ?? '—'}${g.unit || ''}</div><div class="small ${g.change >= 0 ? 'up' : 'dn'}">${g.change != null ? (g.change >= 0 ? '+' : '') + g.change : ''}</div><div class="src"><span>${esc((g.source || {}).symbol || '')} · ${utc(g.observed_at)} UTC</span></div></div>`).join('')}<div class="card"><h2>Mood</h2><div class="small ink2">${esc(((R || {}).breaking || []).map(b => b.why_it_matters).join(' ') || '—')}</div></div></div>`;
  h += sec('', 'All headlines', R ? (R.headlines || []).length + ' sourced · newest first' : '') + `<div class="card"><div class="hl">${(R ? R.headlines : []).map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener"><span class="tm">${utc(x.time_utc)}<br>${x.time_et || ''} ET</span><span><span class="tt">${esc(x.title_verbatim)}</span><div class="meta">${esc(x.source)} · ${(x.assets || []).join(' ')} · ${x.impact} · ${x.kind}</div></span></a>`).join('')}</div></div>`;
  return h;
}
/* ---------- Calendar ---------- */
function viewCalendar() {
  const R = S.data.research; let h = topBar('Calendar', '') + `<div class="lsub">UTC with ET for US releases · high-impact events carry a ±15 min no-entry window</div>`;
  if (!R) return h + '<div class="card unavail">Calendar unavailable — Market Researcher has not run</div>';
  const by = {}; for (const e of R.calendar || []) (by[e.date || (e.time_utc || '').slice(0, 10)] ||= []).push(e);
  for (const [d, list] of Object.entries(by).sort()) h += sec('', new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'))) + `<div class="card">${list.map(e => `<div class="ev ${e.impact}"><div class="t">${e.time_utc ? utc(e.time_utc) + ' UTC<small>' + (e.time_et || et(e.time_utc)) + ' ET</small>' : '<span class="muted">untimed</span>'}</div><div class="e">${esc(e.event)}${e.no_entry_window_utc ? `<div class="tiny dn">No entries ${utc(e.no_entry_window_utc.start)}–${utc(e.no_entry_window_utc.end)} UTC</div>` : ''}<div class="tiny muted">${esc(e.source || '')}${e.forecast ? ' · forecast ' + esc(e.forecast) : ''}${e.previous ? ' · previous ' + esc(e.previous) : ''}${e.actual ? ' · actual ' + esc(e.actual) : ''}${e.time_missing_reason ? ' · ' + esc(e.time_missing_reason) : ''}</div></div><div class="x"><span class="badge ${e.impact === 'high' ? 'b-dn' : e.impact === 'medium' ? 'b-amb' : 'b-mut'}">${e.impact}</span></div></div>`).join('')}</div>`;
  if ((R.gaps || []).length) h += sec('', 'Not verified') + `<div class="card small ink2">${R.gaps.map(g => `<div class="chk">• ${esc(g)}</div>`).join('')}</div>`;
  return h;
}

/* ---------- Journal / Performance / Psychology (Grok journal data.json contract) ---------- */
function J() { return S.data.journal; }
function trades() { const j = J(); return j ? (j.trades || []).filter(t => t.pnl != null) : []; }
function perfStats(ts) {
  const w = ts.filter(t => t.pnl > 0), l = ts.filter(t => t.pnl < 0), gw = w.reduce((s, t) => s + t.pnl, 0), gl = -l.reduce((s, t) => s + t.pnl, 0);
  return { n: ts.length, net: r2(gw - gl), gw: r2(gw), gl: r2(gl), pf: gl ? r2(gw / gl) : null, wr: ts.length ? r2(w.length / ts.length * 100, 1) : null, aw: w.length ? r2(gw / w.length) : null, al: l.length ? r2(gl / l.length) : null, w: w.length, l: l.length };
}
function journalMissing(title) { return topBar(title, '') + `<div class="card"><h3>Journal not connected</h3><div class="ink2">This page reads the Trading Journal file (<code class="mono">v2/data/journal/private/data.json</code>, same format as the Grok journal-dash <code class="mono">data.json</code>). Ask Trading Journal to export it, or copy it from the Grok box. Until then: <a href="${LEGACY}#/${title.toLowerCase()}" target="_blank" rel="noopener">open the current Desk ↗</a></div></div>`; }
function viewJournal() {
  if (!J()) return journalMissing('Journal');
  const ts = [...(J().trades || [])].sort((a, b) => (b.date + b.time) < (a.date + a.time) ? -1 : 1);
  let h = topBar('Journal', '') + `<div class="lsub">${ts.length} trades · written only by Trading Journal · ${esc((J().meta || {}).asOf || '')}</div>`;
  h += `<div class="card" style="padding:0;overflow-x:auto"><table><thead><tr><th>Date (UTC)</th><th>Account</th><th>Ticker</th><th>Side</th><th class="n">Qty</th><th class="n">Entry</th><th class="n">Exit</th><th class="n">P&L</th><th>Setup</th><th>Grade</th><th>Emotion</th><th>Rules</th></tr></thead><tbody>${ts.map(t => `<tr><td class="small">${esc(t.date)} ${esc(t.time || '')}${t.approx ? ' ≈' : ''}</td><td class="small">${esc(t.account || '—')}</td><td><b>${esc(t.ticker)}</b></td><td>${esc(t.side)}</td><td class="n">${t.qty ?? '—'}</td><td class="n">${t.entry ?? '—'}</td><td class="n">${t.exit ?? '—'}</td><td class="n ${t.pnl > 0 ? 'up' : t.pnl < 0 ? 'dn' : ''}">${t.pnl != null ? usd(t.pnl) : '<span class="muted">unknown</span>'}</td><td class="small">${esc(t.setup || '—')}</td><td>${t.grade ? `<span class="badge b-info">${esc(t.grade)}</span>` : '—'}</td><td class="small">${esc(t.emotional || '—')}</td><td class="small">${(t.rules || []).length ? `<span class="badge b-amb">${(t.rules || []).length} broken</span>` : '<span class="badge b-up">ok</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  return h;
}
function viewPerformance() {
  if (!J()) return journalMissing('Performance');
  const ts = trades(), P = perfStats(ts);
  let h = topBar('Performance', '') + `<div class="lsub">${P.n} trades with known P&L · unknown P&L excluded, not estimated</div>`;
  h += `<div class="grid kpis"><div class="card"><h2>Net P&L</h2><div class="big ${P.net >= 0 ? 'up' : 'dn'}">${usd(P.net)}</div></div><div class="card"><h2>Profit factor</h2><div class="big">${P.pf ?? '—'}</div><div class="tiny muted">${usd(P.gw)} ÷ ${usd(P.gl)}</div></div><div class="card"><h2>Win rate</h2><div class="big">${P.wr ?? '—'}%</div><div class="tiny muted">${P.w} wins · ${P.l} losses</div></div><div class="card"><h2>Avg win / loss</h2><div class="big">${P.aw && P.al ? r2(P.aw / P.al) : '—'}</div><div class="tiny muted">${usd(P.aw)} / ${usd(P.al)}</div></div></div>`;
  // equity curve
  let eq = 0; const pts = [...ts].sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1).map(t => (eq += t.pnl)); const mn = Math.min(0, ...pts), mx = Math.max(0, ...pts), W = 900, H = 200;
  h += sec('', 'Equity curve') + `<div class="card"><svg viewBox="0 0 ${W} ${H}" class="chart"><line x1="0" x2="${W}" y1="${H - (0 - mn) / ((mx - mn) || 1) * H}" y2="${H - (0 - mn) / ((mx - mn) || 1) * H}" stroke="var(--rule2)"/><polyline fill="none" stroke="var(--acc)" stroke-width="2" points="${pts.map((p, i) => `${(i / Math.max(1, pts.length - 1) * W).toFixed(1)},${(H - (p - mn) / ((mx - mn) || 1) * (H - 10) - 5).toFixed(1)}`).join(' ')}"/></svg></div>`;
  const grp = (f, label) => { const m = {}; ts.forEach(t => (m[f(t) || '—'] ||= []).push(t)); return `<div class="card"><h2>${label}</h2><table><thead><tr><th></th><th class="n">Trades</th><th class="n">Net</th><th class="n">Win %</th><th class="n">PF</th></tr></thead><tbody>${Object.entries(m).map(([k, v]) => { const p = perfStats(v); return `<tr><td>${esc(k)}</td><td class="n">${p.n}</td><td class="n ${p.net >= 0 ? 'up' : 'dn'}">${usd(p.net)}</td><td class="n">${p.wr}</td><td class="n">${p.pf ?? '—'}</td></tr>`; }).join('')}</tbody></table>${ts.length < 30 ? '<div class="src"><span>small sample</span></div>' : ''}</div>`; };
  h += sec('', 'Breakdown') + `<div class="grid g3">${grp(t => t.session, 'By session')}${grp(t => t.ticker, 'By instrument')}${grp(t => t.setup, 'By setup')}</div>`;
  return h;
}
function viewPsychology() {
  if (!J()) return journalMissing('Psychology');
  const ts = trades(), C = S.data.coach || {};
  const grp = f => { const m = {}; ts.forEach(t => (m[f(t) || 'not recorded'] ||= []).push(t)); return Object.entries(m).map(([k, v]) => [k, perfStats(v)]); };
  const broke = ts.filter(t => (t.rules || []).length), kept = ts.filter(t => !(t.rules || []).length), B = perfStats(broke), K = perfStats(kept);
  let h = topBar('Psychology', '') + `<div class="lsub">From journal emotions and rule checks · Trading Coach ${C.generated_at ? stamp(C.generated_at) : 'not run'}</div>`;
  h += `<div class="grid g2"><div class="card"><h2>Rules kept vs broken</h2><table><tbody><tr><td>Rules kept</td><td class="n">${K.n} trades</td><td class="n ${K.net >= 0 ? 'up' : 'dn'}">${usd(K.net)}</td></tr><tr><td>Rules broken</td><td class="n">${B.n} trades</td><td class="n ${B.net >= 0 ? 'up' : 'dn'}">${usd(B.net)}</td></tr></tbody></table><div class="src"><span>Winning rule-breaks are listed, not netted away</span></div></div>
   <div class="card"><h2>Coach focus</h2><h3>${esc(C.focus || '—')}</h3><div class="ink2">${esc(C.mindset || '')}</div></div></div>`;
  h += sec('', 'Results by emotion') + `<div class="card"><table><thead><tr><th>Emotion</th><th class="n">Trades</th><th class="n">Net</th><th class="n">Win %</th></tr></thead><tbody>${grp(t => t.emotional).map(([k, p]) => `<tr><td>${esc(k)}</td><td class="n">${p.n}</td><td class="n ${p.net >= 0 ? 'up' : 'dn'}">${usd(p.net)}</td><td class="n">${p.wr}</td></tr>`).join('')}</tbody></table>${ts.length < 30 ? '<div class="src"><span>small sample — patterns are hints, not conclusions</span></div>' : ''}</div>`;
  return h;
}
