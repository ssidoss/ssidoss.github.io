---
name: prop-math
description: Compute and explain prop-firm account math for LucidFlex evals and funded accounts — profit to date, max-loss cushion, consistency planner, payout eligibility and remaining requirements — using v2/app/prop-math.js (parity-tested against Grok's prop.py). Use when asked "how far to payout", "what's left on the eval", or to check a Prop page number.
---
# Prop math
- Library: `v2/app/prop-math.js` (pure functions, runs in browser and Node). Tests: `node v2/eval/prop_parity.mjs`.
- Rules come from `accounts.json` (`criteria` block per account, with `source` and `recorded`). Never assume limits.
- Always show the formula with the numbers substituted (the Prop page "Show calculation" does the same).
- Consistency (LucidFlex eval): no single day > c × total profit at the finish. Required total T = Lucid adjusted target if
  present, else max(profit target, best day / c). Cap = c × T. Remaining = T − profit. Min profit days = ceil(remaining / cap).
- Funded payout: done qualifying days (≥ min profit per day) vs required; eligible when done ≥ need; gross = min(cap, profit);
  owner share = gross × split. Earliest date counts business days only.
- Output is a planning aid, never a rule change.
