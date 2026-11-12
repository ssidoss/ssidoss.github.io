---
name: office-status
description: Post an agent status line to the CICM Office (working/waiting/stuck/finished/resting) with the latest output path and, when blocked on the owner, a needs-owner question. Use at the start and end of every agent task.
---
`python3 v2/tools/office_status.py "<exact agent name>" <state> "<task ≤60 chars>" [--output <path>] [--needs-owner "<question>"] [--publish]`
- Always appends to `v2/data/office/runs.jsonl` (the Office reads it).
- `--publish` also posts the v1 status JSON to the ntfy topic from env `OFFICE_NTFY_TOPIC` (only when the owner has enabled live
  posting). Never put the topic on the command line.
- No secrets, amounts, P&L, wallet addresses or trade details in the task text.
