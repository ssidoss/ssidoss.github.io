#!/usr/bin/env python3
"""Generate prop parity cases by running Grok's original prop.py (baseline) on synthetic inputs.
Usage: python3 -I v2/eval/gen_prop_cases.py /path/to/grok-export/dashboards/desk/src/build  > v2/eval/fixtures/prop_cases.json
prop.py is NOT committed (it contains a real account id); only synthetic inputs + its outputs are."""
import sys, json, random, datetime as dt, importlib.util
spec = importlib.util.spec_from_file_location("grok_prop", sys.argv[1] + "/prop.py"); P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)
rnd = random.Random(20261112); cases = []
for i in range(400):
    size = rnd.choice([25000, 50000, 100000, 150000])
    pt = rnd.choice([None, size * 0.06])
    prof = round(rnd.uniform(-0.03, 0.08) * size, 2)
    row = {"id": f"DEMO-{i}", "size": size, "balance": round(size + prof, 2) if rnd.random() > 0.05 else None,
           "profitTargetUsd": pt, "consistencyTargetPct": rnd.choice([50, 0.5, 40, None, 30]),
           "consistencyPct": rnd.choice([None, round(rnd.uniform(20, 900), 2)]),
           "adjustedTargetUsd": rnd.choice([None, None, round(size * rnd.uniform(0.06, 0.09), 2)])}
    if rnd.random() < 0.3: row["targetBalance"] = size * 1.06; row["profitTargetUsd"] = None
    if rnd.random() < 0.15: row["consistencyPlanTargetDay"] = "2026-11-" + str(rnd.randint(13, 30))
    daily = []
    for d in range(rnd.randint(0, 6)):
        daily.append({"account": row["id"], "date": f"2026-11-{2 + d:02d}", "net": round(rnd.uniform(-0.01, 0.03) * size, 2)})
    if row["consistencyPct"] and row["balance"] and rnd.random() < 0.4 and prof > 0:   # make a logged best day that agrees with Lucid
        daily.append({"account": row["id"], "date": "2026-11-10", "net": round(prof * row["consistencyPct"] / 100, 2)})
    trades = [{"account": row["id"], "date": f"2026-11-{3 + k:02d}", "pnl": round(rnd.uniform(-500, 1500), 2)} for k in range(rnd.randint(0, 4))]
    hol = ["2026-11-26"] if rnd.random() < 0.5 else []
    today = dt.date(2026, 11, 12)
    out = P.consistency_plan(row, daily, trades, today, {}, set(hol), {})
    cases.append({"row": row, "daily": daily, "trades": trades, "today": today.isoformat(), "holidays": hol, "grok": out})
json.dump(cases, sys.stdout, indent=0, default=str)
