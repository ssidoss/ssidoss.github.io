/* Sidoss prop math — pure functions, browser + Node.
 * Port of the Grok-era Desk `prop.py` (consistency_plan, payout tracker) with the same outputs, plus:
 *  - every result carries `steps[]`: the formula with numbers substituted, so the Prop page can show its work;
 *  - rule checks against the account's firm rules (`checkAccount`).
 * Parity with prop.py is tested in v2/eval/prop_parity.mjs. Planning aid, not a rule change.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PropMath = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Python round() is banker's rounding on binary floats; match it closely enough for cents.
  // Same as Python round(x, n): correctly rounded from the exact binary value, ties to even.
  const r2 = (x, n = 2) => {
    if (x == null || !isFinite(x)) return null;
    const exact = Math.abs(x).toFixed(Math.min(100, n + 60)); // exact decimal expansion of the double
    const [ip, fp] = exact.split('.');
    const keep = fp.slice(0, n), rest = fp.slice(n);
    let digits = BigInt(ip + keep);
    const half = '5' + '0'.repeat(rest.length - 1);
    if (rest > half || (rest === half && (digits % 2n === 1n))) digits += 1n;
    const v = Number(digits) / Math.pow(10, n);
    return x < 0 ? -v : v;
  };
  const num = v => (typeof v === 'number' && isFinite(v)) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(+v) ? +v : null);
  const usd = v => v == null ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: (Math.abs(v % 1) > 1e-9 ? 2 : 0), maximumFractionDigits: 2 });

  function consFrac(v) { // 0.5 or 50 -> 0.5
    if (v == null || v === '' || v === 'none') return null;
    let x = num(v); if (x == null) return null;
    if (x > 1) x = x / 100;
    return (x > 0 && x <= 1) ? x : null;
  }
  function consCurrentRatio(v) { // 200.03 -> 2.0003
    if (v == null || v === '') return null;
    let x = num(v); if (x == null) return null;
    if (x > 1) x = x / 100;
    return x > 0 ? x : null;
  }
  function dailyNet(row) {
    if (!row || typeof row !== 'object') return null;
    for (const k of ['net', 'pnl', 'profit']) { const v = row[k]; if (v == null || v === '') continue; const n = num(v); if (n != null) return n; }
    if (row.end != null && row.start != null) { const e = num(row.end), s = num(row.start); if (e != null && s != null) return e - s; }
    return null;
  }
  function journalRule(ja, key) { const rs = (ja && ja.rules) || {}; const v = rs[key]; return (v && typeof v === 'object') ? v : {}; }
  const isoDate = d => d.toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; };
  const wd = d => (d.getUTCDay() + 6) % 7; // Mon=0 like Python
  function weekdaysAfter(today, target, holidays) {
    const out = []; let d = addDays(today, 1);
    while (d <= target) { const s = isoDate(d); if (wd(d) < 5 && !holidays.has(s)) out.push(s); d = addDays(d, 1); }
    return out;
  }
  function bdaysAfter(d, n) { let x = new Date(d.getTime()); while (n > 0) { x = addDays(x, 1); if (wd(x) < 5) n--; } return x; }
  function ids(o) { const s = new Set(); for (const k of ['id', 'accountNumber', 'account', 'shortLabel', 'title', 'journalId']) if (o && o[k]) s.add(String(o[k]).trim()); return s; }

  /** consistency_plan(row, daily, trades, today, cfg, holidays, ja) — same semantics as prop.py. */
  function consistencyPlan(row, daily, trades, today, cfg, holidays, ja) {
    ja = ja || {}; cfg = cfg || {}; holidays = new Set(holidays || []);
    today = typeof today === 'string' ? new Date(today + 'T00:00:00Z') : today;
    const steps = [];
    let start = num(row.size);
    if (start == null) start = (typeof row.start === 'number') ? row.start : null;
    if (start == null) { if (typeof ja.start === 'number') start = ja.start; else if (typeof ja.size === 'number') start = ja.size; }
    let bal = row.balance; if (bal == null) bal = ja.balance;
    let P = null, pMissing = null;
    if (bal == null || start == null) pMissing = bal == null ? 'balance' : 'start';
    else { const b = num(bal); P = b == null ? null : r2(b - start); if (P == null) pMissing = 'balance or start'; }
    if (P != null) steps.push({ k: 'P', label: 'Profit to date', formula: 'balance − start', calc: `${usd(num(bal))} − ${usd(start)}`, value: P });

    let pt = row.profitTargetUsd; if (pt == null) pt = (row.criteria || {}).profit_target_usd; if (pt == null) pt = ja.profitTarget;
    const tgtBal = row.targetBalance || ja.targetBalance;
    if (pt == null && start != null && tgtBal != null) { const t = num(tgtBal); pt = t == null ? null : t - start; }
    pt = pt == null ? null : num(pt);

    let c = consFrac(row.consistencyTargetPct);
    if (c == null) c = consFrac((row.criteria || {}).consistency);
    if (c == null) c = consFrac(ja.consistency);
    if (c == null) { const cr = journalRule(ja, 'consistency'); c = Object.keys(cr).length ? consFrac(cr.target) : null; }

    let consCur = row.consistencyPct; if (consCur == null) consCur = ja.consistencyCurrent;
    if (consCur == null) { const cr = journalRule(ja, 'consistency'); consCur = Object.keys(cr).length ? cr.current : null; }
    const consRatio = consCurrentRatio(consCur);
    let consPct = null; { const x = num(consCur); consPct = (x != null && x > 1) ? x : (consRatio != null ? consRatio * 100 : null); }

    const toks = new Set([...ids(row), ...ids(ja)]); if (row.id) toks.add(row.id);
    const on = rec => { const s = new Set(['account', 'accountNumber', 'id'].map(k => rec[k]).filter(Boolean).map(v => String(v).trim())); for (const v of s) if (toks.has(v)) return true; return false; };
    const dayNets = {};
    for (const d of daily || []) { if (!on(d)) continue; const n = dailyNet(d); if (n == null) continue; const k = String(d.date || '').slice(0, 10); if (k) dayNets[k] = (dayNets[k] || 0) + n; }
    if (!Object.keys(dayNets).length) for (const t of trades || []) {
      if (!t || typeof t !== 'object' || !on(t) || t.pnl == null) continue; const k = String(t.date || '').slice(0, 10); const v = num(t.pnl); if (k && v != null) dayNets[k] = (dayNets[k] || 0) + v;
    }
    let loggedBest = null, loggedDate = null;
    for (const [d, v] of Object.entries(dayNets)) if (v > 0 && (loggedBest == null || v > loggedBest)) { loggedBest = v; loggedDate = d; }
    if (loggedBest != null) loggedBest = r2(loggedBest);
    const derived = (P != null && consRatio != null) ? r2(P * consRatio) : null;
    const agrees = (logged, deriv, profit) => {
      if (logged == null || deriv == null || consRatio == null || profit == null) return false;
      let lo = r2((profit - 0.5) * consRatio), hi = r2((profit + 0.5) * consRatio); if (lo > hi) [lo, hi] = [hi, lo];
      return (lo - 0.01) <= logged && logged <= (hi + 0.01);
    };
    let B = null, bSrc = null;
    if (loggedBest != null && (derived == null || agrees(loggedBest, derived, P))) { B = loggedBest; bSrc = 'logged'; }
    else if (derived != null) { B = derived; bSrc = 'derived'; }
    else if (loggedBest != null) { B = loggedBest; bSrc = 'logged'; }
    if (B != null) steps.push({ k: 'B', label: 'Best day', formula: bSrc === 'logged' ? 'largest positive journal day' : 'profit × Lucid current consistency %',
      calc: bSrc === 'logged' ? `${loggedDate}: ${usd(B)}` + (derived != null ? ` (check: ${usd(P)} × ${r2(consPct)}% = ${usd(derived)})` : '') : `${usd(P)} × ${r2(consPct)}%`, value: B,
      warn: (bSrc === 'logged' && derived != null && !agrees(loggedBest, derived, P)) ? `Journal best day ${usd(loggedBest)} disagrees with Lucid consistency (${usd(derived)}) — check the journal` : null });

    let adjusted = row.adjustedTargetUsd; if (adjusted == null) adjusted = ja.adjustedTargetUsd; adjusted = adjusted == null ? null : num(adjusted);
    let T = null, tSrc = null;
    if (adjusted != null && adjusted > 0) { T = r2(adjusted); tSrc = 'lucid-adjusted'; steps.push({ k: 'T', label: 'Required total', formula: "Lucid's adjusted target (already includes the consistency rule)", calc: usd(T), value: T }); }
    else if (pt != null || B != null) {
      const floor = (B != null && c) ? r2(B / c) : null;
      const cands = [pt, floor].filter(v => v != null);
      if (cands.length) { T = r2(Math.max(...cands)); tSrc = 'computed'; steps.push({ k: 'T', label: 'Required total', formula: 'max(profit target, best day ÷ consistency limit)', calc: `max(${usd(pt)}, ${floor != null ? usd(B) + ' ÷ ' + r2(c * 100) + '% = ' + usd(floor) : '—'})`, value: T }); }
    }
    const missing = [];
    if (T == null || T <= 0) missing.push('required total');
    if (c == null) missing.push('consistency limit');
    if (missing.length) return { available: false, reason: missing.join(' and ') + ' not in the journal or prop config', note: 'Planning aid, not a rule change.',
      P, PSource: P != null ? 'balance − start' : null, PMissing: pMissing, B, BSource: bSrc, BDerived: derived,
      consistencyCurrentPct: consPct != null ? r2(consPct) : null, loggedBest, loggedBestDate: loggedDate,
      profitTargetUsd: pt != null ? r2(pt) : null, adjustedTargetUsd: adjusted != null ? r2(adjusted) : null, steps };

    const cap = r2(c * T);
    steps.push({ k: 'cap', label: 'Max any single day may add', formula: 'consistency limit × required total', calc: `${r2(c * 100)}% × ${usd(T)}`, value: cap });
    const minForB = (B != null && c) ? r2(B / c) : null;
    const remaining = P != null ? r2(T - P) : null;
    if (remaining != null) steps.push({ k: 'rem', label: 'Remaining profit needed', formula: 'required total − profit to date', calc: `${usd(T)} − ${usd(P)}`, value: remaining });
    let minDays = null;
    if (remaining != null && remaining > 0 && cap && cap > 0) minDays = Math.ceil(remaining / cap - 1e-12);
    else if (remaining != null && remaining <= 0) minDays = 0;
    if (minDays != null) steps.push({ k: 'days', label: 'Fewest more profit days', formula: 'ceil(remaining ÷ cap)', calc: remaining > 0 ? `ceil(${usd(remaining)} ÷ ${usd(cap)} = ${(remaining / cap).toFixed(2)})` : 'target reached', value: minDays });
    const raw = row.consistencyPlanTargetDay || cfg.targetDay;
    let target = null, targetSrc = null;
    if (raw) { const d = new Date(String(raw).slice(0, 10) + 'T00:00:00Z'); if (!isNaN(d)) { target = d; targetSrc = 'prop config'; } }
    let daysLeft = [], perDay = null, pathOk = null, hols = [];
    if (target) {
      daysLeft = weekdaysAfter(today, target, holidays);
      const n = daysLeft.length; perDay = (n && remaining != null) ? r2(remaining / n) : null;
      if (perDay != null && cap != null) pathOk = perDay <= cap + 1e-9;
      hols = [...holidays].filter(h => isoDate(today) < h && h <= isoDate(target)).sort();
    }
    return { available: true, T: r2(T), TSource: tSrc, profitTargetUsd: pt != null ? r2(pt) : null, adjustedTargetUsd: adjusted != null ? r2(adjusted) : null,
      P, PSource: P != null ? 'balance − start' : null, PMissing: pMissing, B, BSource: bSrc, BDerived: derived,
      consistencyCurrentPct: consPct != null ? r2(consPct) : null, loggedBest, loggedBestDate: loggedDate, c,
      capAtTarget: cap, minTotalForB: minForB, remaining, minProfitDaysLeft: minDays,
      targetDay: target ? isoDate(target) : null, targetDaySource: targetSrc, daysLeft, perDayToTarget: perDay, pathOk, holidaysSkipped: hols,
      note: 'Planning aid, not a rule change.', steps };
  }

  /** Funded payout tracker (prop.py build(): trackers). now = Date (UTC). */
  function payoutTracker(a, firm, pnl, live, now) {
    const C = a.criteria || {}, R0 = a.payoutRules || {};
    const need = C.qualifying_days_required || R0.profitDaysNeeded || (live || {}).pneed || null;
    const minDay = C.qualifying_day_min_usd || R0.minProfitDay || (live || {}).minDay || null;
    const cap = C.payout_cap_usd || R0.cap || (live || {}).cap || null;
    const split = C.payout_split || R0.split || (firm || {}).split || null;
    const dates = (live && live.pdayDates) || [];
    let done = live && live.pdays != null ? live.pdays : dates.length;
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const rem = Math.max(0, (need || 0) - done);
    let earliest;
    if (dates.includes(isoDate(today)) || now.getUTCHours() >= 21 || wd(today) >= 5) earliest = bdaysAfter(today, rem);
    else earliest = rem > 0 ? bdaysAfter(today, rem - 1) : today;
    const gross = (cap && pnl != null) ? r2(Math.min(cap, Math.max(0, pnl)), 0) : null;
    const steps = [
      { k: 'days', label: 'Qualifying days', formula: `days with ≥ ${usd(minDay)} profit`, calc: `${done} of ${need ?? '—'}`, value: done },
      { k: 'rem', label: 'Days still needed', formula: 'max(0, required − done)', calc: `max(0, ${need ?? 0} − ${done})`, value: rem },
      { k: 'gross', label: 'Payout now (gross)', formula: 'min(payout cap, max(0, profit))', calc: `min(${usd(cap)}, ${usd(Math.max(0, pnl || 0))})`, value: gross },
      { k: 'share', label: 'Your share', formula: 'gross × split', calc: `${usd(gross)} × ${split != null ? r2(split * 100) + '%' : '—'}`, value: (gross != null && split) ? r2(gross * split) : null },
    ];
    return { id: a.id, need, minDay, cap, split, done, remaining: rem, eligible: !!(need && done >= need),
      earliest: rem === 0 ? null : isoDate(earliest), pct: need ? r2(Math.min(1, done / need) * 100, 1) : null,
      gross, share: (gross != null && split) ? r2(gross * split) : null, steps };
  }

  /** Rule checks for one account against its firm rules (LucidFlex eval / funded). Returns [{rule, state, detail}]. */
  function checkAccount(acct, plan) {
    const out = [], C = acct.criteria || {};
    const bal = num(acct.balance), mll = num(C.min_balance_usd ?? acct.mll);
    if (bal != null && mll != null) {
      const cushion = r2(bal - mll);
      out.push({ rule: 'Max-loss level (MLL)', state: cushion <= 0 ? 'breach' : cushion < (num(C.daily_loss_limit_usd) || 0) ? 'warn' : 'ok',
        detail: `cushion ${usd(cushion)} = ${usd(bal)} − ${usd(mll)}` + (C.daily_loss_limit_usd ? `; one full DLL (${usd(C.daily_loss_limit_usd)}) ${cushion < C.daily_loss_limit_usd ? 'would breach' : 'fits'}` : '') });
    } else out.push({ rule: 'Max-loss level (MLL)', state: 'unknown', detail: 'balance or MLL not in config' });
    if (C.max_loss_usd != null && C.size != null && mll != null && acct.type !== 'funded') {
      const lockAt = C.size + (C.mll_lock_offset_usd ?? 100);
      out.push({ rule: 'Trailing max loss', state: 'info', detail: `EOD trailing ${usd(C.max_loss_usd)}; MLL locks at ${usd(lockAt)} (start + lock offset, firm rule)` });
    }
    if (plan && plan.available) {
      const B = plan.B, cap = plan.capAtTarget;
      if (B != null && cap != null) out.push({ rule: 'Consistency', state: B > cap + 0.005 ? 'warn' : (cap - B) < 1 ? 'warn' : 'ok',
        detail: B > cap ? `best day ${usd(B)} is above the cap ${usd(cap)}: the required total rises to ${usd(r2(B / plan.c))}` : `best day ${usd(B)} vs cap ${usd(cap)} at the finish — margin ${usd(r2(cap - B))}` });
    }
    const req = (C.required_non_null || []).filter(k => C[k] == null);
    if (req.length) out.push({ rule: 'Config completeness', state: 'warn', detail: 'not set: ' + req.join(', ') });
    return out;
  }

  return { consistencyPlan, payoutTracker, checkAccount, r2, usd, consFrac, consCurrentRatio };
});
