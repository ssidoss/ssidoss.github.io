---
name: ceo-console
description: Run or answer the CEO Console (voice + text chat with Head of CICM). Use to start the local bridge, answer a Console message as Head of CICM, or debug the Console transports.
---
- Page: `v2/app/#/ceo`. Transports: (1) **Local bridge** `node v2/ceo-bridge/server.mjs` (Claude Agent SDK, runs the
  `head-of-cicm` agent with this repo as cwd, read-only tools by default) on http://127.0.0.1:8787; (2) **Office relay**
  (ntfy chat v1, `to_bot: "Head of CICM"`, replies arrive with `re`) when the page has `#topic=`; (3) Demo (no sends).
- Voice: browser Web Speech API (push-to-talk, en-US/de-DE), replies spoken with speechSynthesis. No audio leaves the device
  except through the browser's own speech service.
- Answers: lead with the answer in ≤3 sentences (they are read aloud), cite the data file + timestamp used.
