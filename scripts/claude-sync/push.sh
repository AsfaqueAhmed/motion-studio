#!/usr/bin/env bash
# Copies this machine's Claude Code session transcripts + auto-memory for this
# project into .claude-sync/ so they can be committed and pulled on another machine.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
ENCODED="$(printf '%s' "$REPO_ROOT" | sed 's#/#-#g')"
CLAUDE_PROJECT_DIR="$HOME/.claude/projects/$ENCODED"
SYNC_DIR="$REPO_ROOT/.claude-sync"

if [ ! -d "$CLAUDE_PROJECT_DIR" ]; then
  echo "No Claude Code session data found at $CLAUDE_PROJECT_DIR" >&2
  exit 1
fi

mkdir -p "$SYNC_DIR/sessions" "$SYNC_DIR/memory"

shopt -s nullglob
jsonl_files=("$CLAUDE_PROJECT_DIR"/*.jsonl)
if [ ${#jsonl_files[@]} -eq 0 ]; then
  echo "No session transcripts (*.jsonl) found to sync." >&2
else
  cp "${jsonl_files[@]}" "$SYNC_DIR/sessions/"
fi

if [ -d "$CLAUDE_PROJECT_DIR/memory" ]; then
  rsync -a --delete "$CLAUDE_PROJECT_DIR/memory/" "$SYNC_DIR/memory/"
fi

echo "Synced ${#jsonl_files[@]} session(s) and memory into $SYNC_DIR"
echo "Next: git add .claude-sync && git commit -m 'chore: sync claude session' && git push"
