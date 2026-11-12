---
name: pre-session
description: Run the Sidoss pre-session pipeline (Market Researcher → Head Analyst → Trading Coach → Head of CICM QA) for one or all instruments (NQ, GOLD, BTC, ETH, SOL) before the London or New York session, and route each output to its Desk page. Use for "pre-session", "London briefing", "NY briefing", or "refresh bias for <instrument>".
---
# Pre-session pipeline

Arguments: `session` = london | newyork (default: whichever opens next), `assets` = NQ | GOLD | BTC | ETH | SOL | all (default all; NQ first).

## Steps (stop at the first failed gate; a failure is a blocker, never "partial success")
1. **Snapshot** — `python3 v2/tools/fetch_snapshot.py --save-raw v2/data/market/raw/$(date -u +%Y%m%dT%H%M)`.
   Gate: each requested asset has `price` or a `missing_reason`. Saving raw inputs makes the run reproducible.
2. **Researcher** — run subagent `market-researcher` with: session, assets, snapshot path, and the per-instrument
   source list below. Output `v2/data/research/latest.json`. Gate: `python3 v2/tools/validate.py v2/data/research/latest.json`.
3. **Analyst** — run subagent `head-analyst` with snapshot + research. Output `v2/data/analyst/latest.json`.
   Gate: validator (score arithmetic re-computed, no probability words, no buy/sell orders, every level sourced).
4. **Coach** — run subagent `trading-coach` with analyst output + `v2/data/rules/rules.json` + journal summary.
   Output `v2/data/coach/gameplan.json`. Gate: validator (news windows copied from research, rules cited by id).
5. **QA** — `head-of-cicm` reads `python3 v2/tools/validate.py --all --report` and writes the one-message briefing.
6. Each agent appends to the run log via `python3 v2/tools/office_status.py ... --output <file>` so the Office shows
   the latest output per agent.

## Per-instrument sources and rules
| Asset | Price feed | Market hours | Key drivers / calendar | Notes |
|---|---|---|---|---|
| NQ (NQ/MNQ) | Yahoo NQ=F, ~10 min delayed | CME Globex Sun 18:00–Fri 17:00 ET, daily halt 17–18 ET | CPI, PPI, NFP, FOMC, PCE, ISM, big-tech earnings, US10Y, VIX | Cash open 09:30 ET is session context, NOT a news window unless the rules say so |
| GOLD (GC/MGC) | Yahoo GC=F, ~10 min delayed | CME Globex as NQ | US10Y / real yields, DXY, Fed speakers, geopolitics, CPI/NFP | Futures ≠ XAUUSD spot; label which one any quote is |
| BTC | Coinbase BTC-USD spot | 24/7 (day anchor 00:00 UTC) | ETF flows, US risk appetite (NQ), macro prints, regulation | No CME BTC futures unless stated |
| ETH | Coinbase ETH-USD spot | 24/7 | ETF flows, protocol events (All Core Devs, upgrades), BTC beta | |
| SOL | Coinbase SOL-USD spot | 24/7 | ETF/listing news, network outages, BTC beta | |
High-impact US events: no entries ±15 min (owner rule set may override — always read `rules.json`).
