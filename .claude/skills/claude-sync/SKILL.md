---
name: claude-sync
description: Sync Claude Code conversation transcripts and auto-memory for this project into git (.claude-sync/) so work can resume on another machine, or restore them back onto this machine. Use when the user wants to push/pull/check the status of their Claude conversation history, mentions syncing sessions across machines, or asks "where did I leave off" after a git pull.
user-invocable: true
allowed-tools:
  - Bash(bash scripts/claude-sync/*.sh)
  - Bash(git status *)
  - Bash(git rev-parse *)
  - Bash(ls *)
  - Bash(du *)
---

# /claude-sync — sync Claude Code sessions across machines

Wraps `scripts/claude-sync/push.sh` and `scripts/claude-sync/pull.sh`. These
copy this project's Claude Code session transcripts
(`~/.claude/projects/<encoded-repo-path>/*.jsonl`) and auto-memory
(`.../memory/`) into `.claude-sync/` inside the repo — a normal git-tracked
folder — and back out again on another machine.

Note: a pre-commit hook (`.husky/pre-commit`) already runs `push.sh`
automatically on every commit, so most of the time nothing needs to be done
manually. This skill is for explicit checks, first-time setup on a new
machine, or when the user asks directly.

Arguments passed: `$ARGUMENTS`

## Dispatch on arguments

### No args, or `status`

1. Run `git rev-parse --show-toplevel` to confirm we're in a git repo.
2. Run `ls .claude-sync/sessions .claude-sync/memory` (handle missing dir).
3. Compare against `~/.claude/projects/<encoded-path>/*.jsonl` (encode the
   repo's absolute path by replacing every `/` with `-`).
4. Report: how many sessions are synced into the repo vs. present locally,
   whether `.claude-sync` has uncommitted changes (`git status --porcelain
.claude-sync`), and the size (`du -sh .claude-sync`).

### `push`

1. Run `bash scripts/claude-sync/push.sh`.
2. If it succeeds, tell the user the sync folder is updated and, if there are
   uncommitted changes in `.claude-sync`, remind them to commit + push (or
   note that the next commit will pick it up automatically via the
   pre-commit hook).
3. If it fails (no local session data for this project yet), say so plainly
   — nothing to sync yet.

### `pull`

1. Run `bash scripts/claude-sync/pull.sh`.
2. On success, tell the user to run `claude --resume` in this repo to pick a
   past conversation back up.
3. If it fails (no `.claude-sync/` in the repo, e.g. fresh clone before any
   push happened elsewhere), say so plainly.

## Implementation notes

- Never invent or guess the encoded project path — always derive it from
  `git rev-parse --show-toplevel` piped through the same `/` → `-`
  replacement the scripts use, since it depends on the repo's absolute path
  on _this_ machine and will differ across machines/users.
- Don't `git add`/`git commit`/`git push` on the user's behalf — surface the
  next command for them to run, per this project's confirm-before-push
  convention.
- If `.claude-sync/` is large or growing fast, mention it — it's cumulative
  since old session transcripts are never pruned automatically.
