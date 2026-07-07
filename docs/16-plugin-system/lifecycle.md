# Lifecycle

> Status: Implemented (Phase 14, `packages/plugin/src/plugin-registry.ts`).

## State machine

```
Validating -> RequestingPermissions -> Registered -> Initializing -> Ready
                                            ^              |
                                            |              v
                                        Deactivated <-- Suspended
                                            ^              ^
                                            |______________|
                                                  (from Ready too)
```

Backed by `PluginLifecycleState`
(`packages/shared/src/enums.ts`) — five of its seven values
(`Validating`/`RequestingPermissions`/`Registered`/`Initializing`/`Ready`)
were scaffolded speculatively back in Phase 1, before this phase existed
to implement against them; `Suspended`/`Deactivated` were added in Phase
14 to cover PLAN.md's "register → activate → suspend → deactivate", which
the original five-state enum didn't model at all.

`PluginRegistry` (`packages/plugin/src/plugin-registry.ts`) implements
the transitions:

- **`register(plugin, manifest)`**: `Validating` (id match check) →
  `RequestingPermissions` (every requested permission must be one of the
  five known `PluginPermission` values) → `Registered`. Does **not** call
  `plugin.activate()`.
- **`activate(pluginId, hostApi)`**: only valid from `Registered`. Moves
  to `Initializing`, builds a permission-scoped `IPluginAPI` via
  `buildScopedPluginAPI`, calls `plugin.activate(scopedApi)`, then moves
  to `Ready`. On a thrown error, reverts to `Registered` (so a failed
  activation can be retried) and emits `PluginActivationFailed` instead of
  `PluginActivated`.
- **`suspend(pluginId)`** / **`resume(pluginId)`**: `Ready ⇄ Suspended`.
  **Neither calls a plugin method.** `IPlugin` declares no
  `suspend`/`resume` hooks (PLAN.md's `IPlugin` shape is only
  `activate`/`deactivate`) — suspending is pure registry bookkeeping that
  marks a plugin ineligible for whatever a future dispatcher does with
  `Ready` plugins, while keeping the activated instance alive so `resume()`
  is cheap (no re-`activate()`). This is a design decision this phase
  made explicitly, resolving what was previously an open question,
  the same way Phase 11's `CompositeCommand` picked the simpler of two
  options for macro-recording granularity.
- **`deactivate(pluginId)`**: valid from `Ready` or `Suspended`. Calls
  `plugin.deactivate()`, moves to `Deactivated` — **terminal**. A
  deactivated plugin cannot be re-activated; a caller wanting to run it
  again needs a fresh `register()` call (and, in practice, a fresh
  `IPlugin` instance, since `deactivate()` may have torn down internal
  state the way the built-in plugins in `built-ins/` null out their
  captured sub-API references).

Every transition emits an event through the injected `IPluginEventSink`
(same DI shape as History's `IHistoryEventSink`/AI's `IAIEventSink`):
`PluginRegistered`, `PluginActivated`, `PluginActivationFailed`,
`PluginSuspended`, `PluginDeactivated` — all added to
`AppEventMap` this phase.

## Sandboxing — what's real vs. what isn't

**Real:** `buildScopedPluginAPI` (`permissions.ts`) returns a fresh
`IPluginAPI` object where every field not in `manifest.permissions` is
`undefined` — even if the host's real `hostApi` had that field populated.
A plugin literally cannot obtain a reference to `IExportAPI` unless its
manifest declared `"export"`. Verified in
`permissions.test.ts` ("cannot expose a sub-API the host itself never
provided, even if granted" and "passes through only granted sub-APIs").

**Not real (not implemented, no cross-engine consumer exists to wire it
to yet):**

- **Process/thread isolation.** A plugin runs as a plain JS object on
  whatever thread calls `PluginRegistry.activate()` — no
  iframe/worker/Realm sandbox. `Core`'s `WorkerManager` (Phase 2) has no
  `plugin` worker slot reserved (unlike `rendering`/`export`/`ai-inference`/
  `thumbnail-gen`), so even a future worker-based plugin host is an open
  design question, not a half-built path.
- **Resource quotas.** No CPU/memory/time budget enforcement on
  `plugin.activate()`/`deactivate()` calls.
- **Trust/signing model.** Nothing verifies a plugin's origin or code
  integrity before `register()`/`activate()` run it.

## Open questions

- Should `Suspended` plugins still receive registered-but-inert entries
  in `IEffectsAPI`/`IExportAPI`/etc. (i.e. do their registered effect
  nodes/presets stay live while suspended), or does suspension imply
  "pull everything this plugin registered"? Not decided — today,
  suspension is purely a `PluginRegistry` state flag; it doesn't call
  back into any sub-API to unregister anything.
- Crash recovery: if the host process is interrupted mid-`activate()`
  (after some sub-API calls succeeded but before the promise resolved),
  is the plugin's partial registration cleaned up on restart? Same class
  of question as `CLAUDE.md`'s open "crash recovery consistency" ADR —
  not addressed here either.
