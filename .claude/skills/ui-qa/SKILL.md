---
name: ui-qa
description: QA the Sidoss pages (v2/app) in a real browser — 1440 desktop and 390 phone, night/day, UTC/Dubai/Berlin, no JS errors, no NaN/undefined, task step counts — and produce before/after screenshots. Use before handing any page change to HC or Head of CICM.
---
1. Serve: `python3 -m http.server 8765 -d v2` then open `http://localhost:8765/app/`.
2. Run `node v2/eval/ui_qa.mjs` (Playwright): screenshots per route × viewport × theme, console-error check, text scan for
   `NaN|undefined|null|[object`, timezone cross-check, and the task step-count scenarios in `v2/eval/tasks.json`.
3. Compare with the baseline in `v2/qa/before/` (layout-only; real-data screenshots stay private).
4. Attach screenshots + report to the pack. A failure goes back to the coder.
