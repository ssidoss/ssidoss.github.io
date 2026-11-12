#!/usr/bin/env bash
# Start Head of CICM on Telegram (official Claude Code channel). Run on your Mac from anywhere:
#   ./v2/telegram/start-ceo-telegram.sh          -> official channel plugin, inside tmux (keeps running when the terminal closes)
#   ./v2/telegram/start-ceo-telegram.sh --bridge -> fallback: self-hosted bridge (v2/ceo-bridge/server.mjs), also serves the CEO Console
# The bot token is never passed on the command line: the plugin reads ~/.claude/channels/telegram/.env, the bridge reads
# TELEGRAM_BOT_TOKEN from ~/.config/sidoss/telegram.env (chmod 600).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [ "${1:-}" = "--bridge" ]; then
  ENVF="$HOME/.config/sidoss/telegram.env"; [ -f "$ENVF" ] || { echo "Create $ENVF with TELEGRAM_BOT_TOKEN=... and TELEGRAM_ALLOWED_CHAT_IDS=..."; exit 1; }
  set -a; . "$ENVF"; set +a
  cd "$ROOT/v2/ceo-bridge" && [ -d node_modules ] || npm install --silent
  exec tmux new-session -A -s sidoss-ceo "node $ROOT/v2/ceo-bridge/server.mjs"
fi
command -v bun >/dev/null || { echo "Install Bun first: curl -fsSL https://bun.sh/install | bash"; exit 1; }
command -v tmux >/dev/null || { echo "Install tmux first: brew install tmux"; exit 1; }
cd "$ROOT"
# --agent head-of-cicm: the session IS the CEO agent (.claude/agents/head-of-cicm.md + CLAUDE.md)
# read-only tools by default; widen only if you want it to run the pipeline from Telegram.
exec tmux new-session -A -s sidoss-ceo \
  "claude --agent head-of-cicm --channels plugin:telegram@claude-plugins-official --allowedTools Read Grep Glob 'Bash(python3 v2/tools/validate.py:*)' 'Bash(python3 v2/tools/fetch_snapshot.py:*)'"
