# Sidoss Capital — Claude rebuild report (12 Nov 2026)

Branch `claude/agents-redesign` · run on real market data 12 Nov 14:00–14:40 UTC · screenshots in `v2/qa/after/` use **fixture**
data (this repo is public); real-data before/after screenshots were sent to the owner privately.

## 1. What was built and tested, page by page
| Page | Built | Tested | Screens |
|---|---|---|---|
| **Brief** (`#/dashboard`) | Verdict GO/WAIT/STOP with reasons · binding limit = min(personal stop, firm DLL, MLL cushion) · coach plan + if→then · one 12-h timeline (sessions, events, no-entry windows) · 5 instrument tiles (price, delay badge, direction, agreement, conflict) · What changed (breaking + sourced headlines) · Data & pipeline (every source with observed time) | Playwright 1440/390, day/night, Asia/Dubai, 0 JS errors, no NaN/undefined | `desktop-night-dashboard.png`, `desktop-day-dashboard.png`, `phone-night-dashboard.png` |
| **Asset** (`#/asset/NQ·GOLD·BTC·ETH·SOL`) | one template for all 5 · vote summary in header · score breakdown with arithmetic · invalidation + session plan · levels ladder vs price · VWAP/RVOL/ATR/structure · news + calendar filtered by instrument · contract/delay labels (GC futures ≠ XAUUSD spot) | same + all 5 routes | `*-asset-NQ/GOLD/BTC.png` |
| **Prop** (`#/prop`) | totals (payouts, fees counted vs not counted, net) · side-by-side compare (risk today, progress, consistency, payout) · per-account requirement checklist · rule checks · ƒ(x) show-calculation steps · closed accounts | `prop-math.js` **0 mismatches vs Grok `prop.py` on 400 cases / 7,021 fields**; reproduces every planner number shown on the live Prop page for all active evals (checked privately) | `*-prop.png` |
| **Office** (`#/office`) | Needs-you queue (waiting/stuck/needs-owner) · pipeline diagram with latest run times · all 12 agents (incl. Strategy Developer) with state, task, age and **latest output link** (opens the file) · activity feed · usage · link to the 3D building | live topic read (GET only) + run log; chat states preserved for the CEO Console | `*-office.png` |
| **CEO Console** (`#/ceo`) | voice (push-to-talk / Space, EN/DE, replies read aloud) + text · routes: local Claude bridge → Office relay (ntfy chat v1) → offline answers from Desk data · secret guard · agent picker | real end-to-end: bridge → `head-of-cicm` agent answered from the data files in 16 s, citing files + timestamps; offline answers for prop/bias/news/needs-you | `*-ceo.png` |
| **Telegram** | official Claude Code channel (`telegram@claude-plugins-official`, `--agent head-of-cicm`) + fallback bridge, launchd plist, setup guide | bridge mock-tested: unknown chat refused + told its id, allow-listed chat answered | — |
| Macro · Journal · Performance · Psychology · Calendar | **linked** from the rail ("Current Desk") so nothing is lost | — | — |

## 2. Agents and the pre-session workflow
- 12 agents in `.claude/agents/` (Grok prompts + owner amendments, explicit input/output contracts), shared `CLAUDE.md`, skills in `.claude/skills/`.
- Pipeline (skill `pre-session`): `fetch_snapshot.py` → Market Researcher → Head Analyst → Trading Coach → Head of CICM QA (`validate.py`).
- **NQ pilot** passed (research 190 checks, analyst 42, coach 19 — 0 fails), then **rollout to NQ, GOLD, BTC, ETH, SOL**:

| Stage | Checks | Result |
|---|---|---|
| Snapshot (5 assets + VIX/DXY/US10Y, free feeds) | 72 | PASS |
| Market Researcher (29 headlines, 7 calendar items, per-asset drivers) | 342 | PASS |
| Head Analyst (5 assets) | 142 | PASS |
| Trading Coach (5-instrument plan) | 19 | PASS |

Validator checks: every headline's title/URL/time match the fetched feed exactly (no invented or restamped sources), DST-aware ET for
every US time, ±15 min windows for HIGH events only, agreement and direction re-computed from the votes, conflict flag re-derived,
levels traceable to the snapshot, stale-input detection (it caught the coach using an older analyst file), no probability or order language.

## 3. Measured: steps to answer (Playwright, live Grok build vs v2; `v2/eval/task_steps.json`)
| Task | Grok desktop | v2 desktop | Grok phone | v2 phone |
|---|---|---|---|---|
| Find remaining payout/pass requirements | 1 click + 1,867 px scroll | 1 click + 171 px | 2 taps + 3,508 px | 1 tap + 362 px |
| Open an agent's latest output | **not possible** (status line only) | 2 clicks | not possible | 2 taps |
| See who is waiting on me | 0 — **wrong answer** ("Nobody") | 1 click, correct | wrong answer | 1 tap, correct |
| NQ bias + evidence | 1 click | 1 click | 1 tap | 1 tap |
| Next no-entry window | 0 — **3 conflicting answers** | 0, one answer | 121 px, 3 answers | 0, one answer |

## 4. Where Claude did better than Grok (evidence from 12 Nov)
1. **Breaking news**: the Researcher had the Nvidia CEO resignation (CNBC + WSJ, ~14:00 UTC) before the cash open; the live Desk's latest
   item was still "board weighs Huang's fate".
2. **Calendar completeness**: Fed Barr speech (15:00 UTC), 30-year auction and released jobless claims were on the Claude calendar; the
   live Desk listed none of them.
3. **One no-entry truth**: the live Desk showed 14:10–14:50, 14:15–14:45 and "not a news window" for the same cash open.
4. **Account risk**: on one eval the live Desk said "OK to trade" with the personal daily stop as the room. Claude's math showed the room to
   the EOD max-loss level is smaller than both the personal stop and the firm DLL, and that the firm balance implies an **unlogged loss
   today beyond both limits** (cross-checked against the firm's own consistency %). Flagged in Office "Needs you". *Owner must confirm.*
   (Figures are in the private report, not in this public repo.)
5. **Consistency margins** made explicit: two evals have a best day within cents of their consistency cap.
6. **Office**: Strategy Developer (waiting on the owner since 09:57 UTC) was invisible because it was missing from the roster; Head Analyst
   posted no status for 12 h. v2 shows every agent and derives "needs you" from real states.
7. **Prop page defects fixed**: "Funded account" header on an eval; two contradictory consistency % values on the same account; stale plan text
   about closed #0002; account-specific exceptions hard-coded in `prop.py` moved to config.

## 5. Where Grok is still better (honest)
- **Depth on the old Desk**: position-size calculator, V Areas zone editor (EQ LD/NY auto + manual zones), volume profile, price chart,
  20-session RVOL on the exact contract (NQZ26 1-min VWAP) — v2 uses Yahoo continuous 5-min bars and ≤5 sessions (labelled "small sample").
- **Journal / Performance / Psychology / Calendar / Macro / Finance / Strategy Lab** are not redesigned yet (linked).
- **Always-on**: Grok runs its routines today; the Claude routines are written but not scheduled (needs your OK, one at a time).
- **Journal access**: Grok's Trading Journal/Coach read Notion and the box data; this session had neither, so the coach ran with low confidence.
- **3D Office**: the building view is richer visually; v2 links to it rather than rebuilding it.
- **Head-to-head on identical saved inputs**: not possible yet — the export contains no saved Grok outputs (GAPS #2). `v2/eval/promptfooconfig.yaml`
  is ready: drop Grok's research/analyst/coach JSON into `v2/eval/grok-outputs/<run>/` and both arms are scored by the same validator.

## 6. GitHub repos — verdicts
| Repo | Verdict | Why |
|---|---|---|
| anthropics/skills (Apache-2.0) | **Adopted** | frontend-design, webapp-testing, skill-creator, claude-api, pdf/xlsx/docx/pptx, mcp-builder active; all 19 in the library |
| microsoft/playwright (Apache-2.0) | **Adopted** | before/after screenshots, step counts, UI QA |
| anthropics/claude-agent-sdk-typescript | **Adopted** | CEO bridge + Telegram fallback run `head-of-cicm` directly |
| promptfoo/promptfoo (MIT) | **Adopted (config)** | Claude-vs-Grok harness with the validator as assertion; waiting on Grok outputs |
| homarr-labs/dashboard-icons (Apache-2.0) | **Adopted** | Claude, Notion, GitHub, ntfy, Telegram icons in Office |
| cathrynlavery/diagram-design (MIT) | **Adopted (skill)** | active skill for handoff/data-flow diagrams; Office pipeline diagram drawn in its spirit, inline |
| farion1231/cc-switch (MIT) | Not adopted | Desktop switcher for 12 coding CLIs/providers + MCP/skills sync. Useful only if you run several CLIs on the Mac; the Claude-only setup doesn't need it. README is heavy with paid relay promotions — don't route trading data through third-party relays |
| paperclipai/paperclip (MIT) | Evaluated, not now | Full Node server + React UI (org chart, budgets, governance, task handoffs). Overlaps the Office + run log; worth a pilot later for budgets and run history. Its skills are in the library |
| hoangsonww/Claude-Code-Agent-Monitor (MIT) | Recommended on your Mac | Observes **Claude Code, Cursor and Codex** sessions locally (hooks + transcripts) — not Grok bots. Good for watching the new agents' tool calls/subagents; Office keeps the owner-level view |
| ethanplusai/jarvis | Not reused | Personal **non-commercial** licence (excludes revenue-generating use), macOS AppleScript only, paid Fish Audio TTS. CEO Console is an original implementation (browser speech, no extra cost) |
| github/github-mcp-server | Not needed | git + the session's GitHub access covered branch/push |
| microsoft/playwright-mcp | Not needed | Playwright library directly was enough |
| anthropics/claude-agent-sdk-python | Not needed | tools are plain Python; no Python agent runtime required |
Skills: **133 skills** from 9 repos downloaded into `v2/skills-library/` (licences + commits in `skills.lock.json`), 23 active in `.claude/skills/`;
`v2/tools/install_skills.sh [--all]` installs them on your Mac.

## 7. Still needs access, data or your decision
1. **Confirm the unlogged balance change** flagged in Office on the firm dashboard (and have Trading Journal log it).
2. Real journal + prop data (Notion connector / Grok box `journal-dash/data.json`, `prop_accounts.json`, `rules_config.json`) — only fixtures and a transcription from the live page were used.
3. Saved Grok outputs for the promptfoo head-to-head.
4. Hosts: `www.dol.gov` (jobless claims from source); FXStreet RSS returns 403.
5. Publishing: `JOURNAL_DASH_PASSWORD` as a runtime secret + your OK → `desk-publish` encrypts v2 and replaces `/desk-preview/` only. v2 is **not live**.
6. Routines: enable one at a time (London/NY briefing first).
7. Telegram: create the bot (`v2/telegram/README.md`).
8. Repo hygiene: this repo is public. Move source/agents to a private repo and keep only encrypted pages here. **Rotate the Desk password** — it was shared in chat.
9. Not yet migrated: Macro, Journal, Performance, Psychology, Calendar, Finance, Strategy Lab.
