# Head of CICM on Telegram — everything is ready except the bot

You only need to create the bot. Two ways to run it; both talk to the same `head-of-cicm` agent with the same rules (CLAUDE.md).

## 1. Create the bot (2 minutes, on your phone)
1. Open **@BotFather** in Telegram → send `/newbot`.
2. Name: `Sidoss CEO` · username: something ending in `bot` (e.g. `sidoss_ceo_bot`).
3. Copy the token BotFather gives you. **Do not paste it in any chat** (including this one).
4. Optional: `/setprivacy` → Enable, `/setjoingroups` → Disable (DM-only bot).

## 2a. Recommended: official Claude Code channel (Anthropic plugin)
Source: https://code.claude.com/docs/en/channels · plugin: anthropics/claude-plugins-official/external_plugins/telegram
```bash
brew install tmux && curl -fsSL https://bun.sh/install | bash   # once
cd ~/path/to/ssidoss.github.io && claude                          # once, then inside Claude Code:
#   /plugin install telegram@claude-plugins-official   (choose "user" scope)
#   /telegram:configure <token>                         (saved to ~/.claude/channels/telegram/.env)
#   exit
./v2/telegram/start-ceo-telegram.sh
```
Then DM your bot → it replies with a pairing code → in the Claude session: `/telegram:access pair <code>` and
`/telegram:access policy allowlist` (only your account can talk to it).
- Runs as **Head of CICM** (`--agent head-of-cicm`), read-only tools + the validator and snapshot fetcher.
- Research preview; Team/Enterprise orgs must enable channels. Messages arrive only while the session runs (tmux keeps it alive).

## 2b. Fallback: self-hosted bridge (same server as the CEO Console)
```bash
mkdir -p ~/.config/sidoss && printf 'TELEGRAM_BOT_TOKEN=%s\nTELEGRAM_ALLOWED_CHAT_IDS=\n' 'PASTE_TOKEN' > ~/.config/sidoss/telegram.env && chmod 600 ~/.config/sidoss/telegram.env
./v2/telegram/start-ceo-telegram.sh --bridge
```
DM the bot `/start` → it answers with your chat id → put it in `TELEGRAM_ALLOWED_CHAT_IDS` → restart. Everyone else is refused.
Optional always-on: `com.sidoss.ceo-telegram.plist` (launchd).

## What it can and can't do
- Answers: briefing, bias per instrument, prop requirements, who needs you, next events — with file + timestamp sources.
- Cannot: publish, trade, send email, change rules (needs your OK in a working session). Voice notes: use Telegram's voice-to-text for now.
- Note: the Grok export says Telegram was discontinued on 26 Oct (routine R06). This setup is your new decision (12 Nov) and replaces R06;
  it sends nothing on a schedule — it only answers you.
