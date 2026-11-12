// Parity: v2/app/prop-math.js vs Grok prop.py outputs on 400 synthetic cases (v2/eval/fixtures/prop_cases.json).
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import url from 'url';
const require = createRequire(import.meta.url); const here = path.dirname(url.fileURLToPath(import.meta.url));
const PM = require(path.join(here, '../app/prop-math.js'));
const cases = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/prop_cases.json')));
const KEYS = ['available', 'T', 'TSource', 'P', 'B', 'BSource', 'BDerived', 'consistencyCurrentPct', 'loggedBest', 'loggedBestDate', 'c', 'capAtTarget',
  'minTotalForB', 'remaining', 'minProfitDaysLeft', 'targetDay', 'daysLeft', 'perDayToTarget', 'pathOk', 'holidaysSkipped', 'reason'];
let fails = 0, fields = 0;
for (const [i, cs] of cases.entries()) {
  const js = PM.consistencyPlan(cs.row, cs.daily, cs.trades, cs.today, {}, cs.holidays, {});
  for (const k of KEYS) {
    if (!(k in cs.grok) && !(k in js)) continue; fields++;
    const a = cs.grok[k] ?? null, b = js[k] ?? null;
    const eq = (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) < 0.006 : JSON.stringify(a) === JSON.stringify(b);
    if (!eq) { fails++; if (fails < 15) console.log(`case ${i} ${k}: grok=${JSON.stringify(a)} js=${JSON.stringify(b)}`); }
  }
}
console.log(`prop parity: ${cases.length} cases, ${fields} fields compared, ${fails} mismatches`);
process.exit(fails ? 1 : 0);
