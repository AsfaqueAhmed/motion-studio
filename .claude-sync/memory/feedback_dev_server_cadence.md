---
name: feedback-dev-server-cadence
description: "Always run the apps/studio dev server on port 3000, and restart it after every commit"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: dbf48dfd-f612-4a16-8dd8-8c12d46aa112
---

Run the `apps/studio` Next.js dev server on port 3000 always (not a random/fallback port), and restart it after every commit made during a session.

**Why:** User explicitly requested this so the browser tab they have pointed at `localhost:3000` always reflects the latest committed code without them having to ask for a restart each time — avoids the "stale bundle" confusion that came up earlier in this session (user reported "Loading Motion Studio…" stuck, which turned out to be worth ruling out via a fresh server/hard refresh).

**How to apply:** When starting the dev server for apps/studio, use `pnpm --filter @motion-studio/studio dev` and confirm it bound to port 3000 (kill/free the port first if something else is already listening on it, or restart the existing instance if it's already this dev server). After every `git commit` that touches apps/studio (or its workspace deps like packages/*), kill and restart the dev server in the background so the running instance picks up the new code — Next.js dev mode usually hot-reloads on file changes already, but restart explicitly per this instruction rather than relying on HMR. Relates to [[feedback_commit_cadence]] (commit after every message) and [[feedback_manual_verification]] (don't self-verify with Playwright — this just keeps the server fresh for when the user checks).
