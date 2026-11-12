---
name: desk-publish
description: Head of CICM only. Encrypt a QA-passed Desk/Office build with StatiCrypt 3.5.4 and publish only the allow-listed paths to ssidoss/ssidoss.github.io main. Use for "publish", "DESK PUSH tNN", or the 15-minute auto-refresh.
---
1. Require env `JOURNAL_DASH_PASSWORD` (never print it). If missing → stop, alert owner, pause the routine.
2. `node v2/eval/run.mjs` and `python3 v2/tools/validate.py --all` must pass; no plaintext personal data outside `private/`.
3. Encrypt: `STATICRYPT_PASSWORD="$JOURNAL_DASH_PASSWORD" npx staticrypt@3.5.4 <file> --short --remember 30 --config .staticrypt.json -d <out>`
   (password via env, never argv; keep the existing salt so "Keep me signed in" survives).
4. Verify: output contains `staticrypt`, does not contain `"notionId"` or any account number from the private config.
5. Stage only the allow-listed paths, commit `Desk auto-update <YYYY-MM-DD HH:MM> UTC`, push to main. Report the SHA.
6. Skip when the sha256 of inputs equals the last published hash and code is unchanged.
