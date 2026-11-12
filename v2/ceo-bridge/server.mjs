#!/usr/bin/env node
/* Head of CICM bridge — one agent, two front doors:
 *   1. CEO Console (v2/app/#/ceo) → POST http://127.0.0.1:8787/chat  (localhost only, CORS for the Desk origins)
 *   2. Telegram bot (optional)    → long-polls the Bot API when TELEGRAM_BOT_TOKEN is set; only allow-listed chat ids
 * Runs the `head-of-cicm` agent from .claude/agents via the Claude Agent SDK, cwd = repo root, so CLAUDE.md and the
 * data files are its context. Tools are read-only by default (Read, Grep, Glob). Nothing here can publish, trade or send email.
 *
 * Auth: uses your Claude Code login (run `claude` once) or ANTHROPIC_API_KEY from the environment. Never put keys in this file.
 * Env:  PORT=8787  CEO_TOOLS="Read,Grep,Glob"  TELEGRAM_BOT_TOKEN=…  TELEGRAM_ALLOWED_CHAT_IDS=123,456  CEO_MODEL (optional)
 * Test: node v2/ceo-bridge/server.mjs --selftest   (mock agent, no network, no model)
 */
import http from 'node:http';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const PORT = +(process.env.PORT || 8787);
const TOOLS = (process.env.CEO_TOOLS || 'Read,Grep,Glob').split(',').map(s => s.trim()).filter(Boolean);
const ORIGINS = new Set(['http://localhost:8765', 'http://127.0.0.1:8765', 'https://ssidoss.github.io', 'null']);
const SELFTEST = process.argv.includes('--selftest');
const sessions = new Map(); // conversation key → SDK session id (keeps context across turns)

const SYSTEM_APPEND = `You are answering the owner directly in the CEO Console or Telegram.
Lead with the answer in at most 3 short sentences (it may be read aloud), then offer details.
Answer from the files in v2/data/ (snapshot, research, analyst, coach/private, prop/private, rules/private, office/runs.jsonl).
Always name the file(s) and the timestamp you used. If something is missing or stale, say so. Never invent numbers.
You cannot publish, trade, send email or change rules from here: if the owner asks for that, say what you would do and that it needs their explicit OK in a working session.
If the owner writes German, answer in German.`;

async function askAgent(text, key, to = 'Head of CICM') {
  if (SELFTEST) return { reply: `(selftest) ${to} received: ${text.slice(0, 80)}`, sources: ['selftest'], agent: 'mock' };
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const agentName = to === 'Head of CICM' ? 'head-of-cicm' : to.toLowerCase().replace(/&/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  let reply = '', sid = null;
  const q = query({
    prompt: text,
    options: {
      cwd: ROOT, settingSources: ['project'], agent: agentName,
      allowedTools: TOOLS, permissionMode: 'dontAsk', maxTurns: 12,
      systemPrompt: { type: 'preset', preset: 'claude_code', append: SYSTEM_APPEND },
      ...(sessions.get(key) ? { resume: sessions.get(key) } : {}),
      ...(process.env.CEO_MODEL ? { model: process.env.CEO_MODEL } : {}),
    },
  });
  for await (const m of q) {
    if (m.type === 'system' && m.session_id) sid = m.session_id;
    if (m.type === 'result') { reply = m.result || reply; sid = m.session_id || sid; }
  }
  if (sid) sessions.set(key, sid);
  const sources = [...new Set((reply.match(/v2\/data\/[\w/.-]+/g) || []))];
  return { reply: reply.trim() || '(no answer)', sources, agent: agentName };
}

/* ---------- HTTP for the CEO Console ---------- */
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (ORIGINS.has(origin) || origin.startsWith('http://localhost:')) { res.setHeader('access-control-allow-origin', origin); res.setHeader('access-control-allow-headers', 'content-type'); res.setHeader('access-control-allow-private-network', 'true'); }
  if (req.method === 'OPTIONS') return res.end();
  if (req.url === '/health') return res.end(JSON.stringify({ ok: true, agent: 'head-of-cicm', tools: TOOLS, telegram: !!process.env.TELEGRAM_BOT_TOKEN }));
  if (req.url === '/chat' && req.method === 'POST') {
    let body = ''; for await (const c of req) { body += c; if (body.length > 20000) return res.writeHead(413).end(); }
    try {
      const { text, to } = JSON.parse(body);
      if (!text || typeof text !== 'string') return res.writeHead(400).end('{"error":"text required"}');
      const out = await askAgent(text.slice(0, 4000), 'console:' + (to || 'Head of CICM'), to || 'Head of CICM');
      res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(out));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: String(e.message || e) })); }
  }
  res.writeHead(404).end();
});
server.listen(PORT, '127.0.0.1', () => console.log(`Head of CICM bridge on http://127.0.0.1:${PORT}  tools=${TOOLS.join(',')}${SELFTEST ? '  [SELFTEST]' : ''}`));

/* ---------- Telegram (optional) ---------- */
const TG = process.env.TELEGRAM_BOT_TOKEN, API = TG ? `${process.env.TELEGRAM_API_BASE || "https://api.telegram.org"}/bot${TG}` : null;
const ALLOW = new Set((process.env.TELEGRAM_ALLOWED_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean));
async function tg(method, body) { const r = await fetch(`${API}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
async function telegramLoop() {
  if (!TG) return console.log('Telegram: off (set TELEGRAM_BOT_TOKEN to enable)');
  const me = await tg('getMe', {}); if (!me.ok) return console.error('Telegram: token rejected'); // never print the token
  console.log(`Telegram: @${me.result.username} polling; allowed chats: ${ALLOW.size ? [...ALLOW].join(',') : 'NONE (send /start to learn your chat id)'}`);
  let offset = 0;
  for (;;) {
    try {
      const up = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
      for (const u of up.result || []) {
        offset = u.update_id + 1; const m = u.message; if (!m) continue; const chat = String(m.chat.id);
        if (!ALLOW.has(chat)) { await tg('sendMessage', { chat_id: chat, text: `Not paired. Your chat id is ${chat}. Add it to TELEGRAM_ALLOWED_CHAT_IDS on the machine running the bridge, then restart.` }); continue; }
        if (m.voice || m.audio) { await tg('sendMessage', { chat_id: chat, text: 'Voice notes are not transcribed yet — please use Telegram\'s built-in voice-to-text or type the message.' }); continue; }
        if (!m.text) continue;
        await tg('sendChatAction', { chat_id: chat, action: 'typing' });
        const out = await askAgent(m.text, 'tg:' + chat);
        for (let i = 0; i < out.reply.length; i += 3900) await tg('sendMessage', { chat_id: chat, text: out.reply.slice(i, i + 3900) });
      }
    } catch (e) { console.error('Telegram poll error:', e.message); await new Promise(r => setTimeout(r, 5000)); }
  }
}
telegramLoop();
