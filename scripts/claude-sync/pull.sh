#!/usr/bin/env bash
# Restores Claude Code session transcripts + auto-memory from .claude-sync/
# (committed in git) into this machine's ~/.claude/projects/ so `claude --resume`
# and memory recall pick up where the last machine left off.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
ENCODED="$(printf '%s' "$REPO_ROOT" | sed 's#/#-#g')"
CLAUDE_PROJECT_DIR="$HOME/.claude/projects/$ENCODED"
SYNC_DIR="$REPO_ROOT/.claude-sync"

if [ ! -d "$SYNC_DIR" ]; then
  echo "No $SYNC_DIR found in this repo — nothing to restore." >&2
  exit 1
fi

mkdir -p "$CLAUDE_PROJECT_DIR/memory"

shopt -s nullglob
jsonl_files=("$SYNC_DIR"/sessions/*.jsonl)
if [ ${#jsonl_files[@]} -gt 0 ]; then
  cp -n "${jsonl_files[@]}" "$CLAUDE_PROJECT_DIR/"
fi

if [ -d "$SYNC_DIR/memory" ]; then
  rsync -a "$SYNC_DIR/memory/" "$CLAUDE_PROJECT_DIR/memory/"
fi

echo "Restored ${#jsonl_files[@]} session(s) and memory into $CLAUDE_PROJECT_DIR"
echo "Run 'claude --resume' inside $REPO_ROOT to continue a past conversation."
