# Overview

> Status: Implemented (Phase 14, `packages/plugin`) — this doc replaces the
> earlier "Status: Stub" placeholder.

Consolidated plugin architecture: every extension point (effects, tools,
panels, exporters, AI capabilities) uses the same lifecycle:
`Validating -> RequestingPermissions -> Registered -> Initializing -> Ready`,
with `Suspended`/`Deactivated` added this phase to cover the rest of a
plugin's life. See `lifecycle.md` for the full state machine.

## The one hard rule this phase enforces

`packages/plugin/package.json` depends on `@motion-studio/shared` only —
same as every other engine package in this repo. **Plugin never imports
`@motion-studio/effects`/`export`/`ai`/anything else.** This is what makes
"plugins only ever see public APIs, never engine internals"
(ARCHITECTURE.md §3) true at the type level, not just by convention: a
plugin's `activate(api: IPluginAPI)` call can _only_ reach the five
Plugin-package-local interfaces in `plugin-api.ts`
(`IEffectsAPI`/`IExportAPI`/`IAICapabilityAPI`/`IToolAPI`/`IPanelAPI`) —
there is no import path from plugin code to a real `EffectsEngine` or
`CapabilityRegistry` instance, because this package never references
those classes at all.

Each sub-API is a hand-rolled DI interface structurally matching the real
engine's public register surface (same pattern Effects used for
Rendering's `IRenderGraphNode` in Phase 8, Export used for Mediabunny in
Phase 10, AI used for `onnxruntime-web` in Phase 13):

- `IEffectsAPI` mirrors Effects' `IEffectNode` (`effects-api.md`)
- `IExportAPI` mirrors Export's `IExportPreset`, except codec/container
  fields are plain strings — `VideoCodec`/`AudioCodec`/`ContainerFormat`
  are deliberately package-local to `@motion-studio/export`, not shared,
  so Plugin can't import them (`export-api.md`)
- `IAICapabilityAPI` mirrors AI's `ICapabilityDescriptor`/`ICapabilityProvider`,
  same reasoning for `preferredBackend` being a string, not AI's
  `InferenceBackend` enum (`ai-api.md`)
- `IToolAPI`/`IPanelAPI` mirror `docs/17-ui/toolbar.md`'s `ToolDefinition`
  and `docs/17-ui/panels.md`'s panel-as-plugin-module concept — **there is
  no real Tool Registry or Workspace Engine yet** (Phase 15/17-ui,
  `apps/studio`, not built), so these two are registration shapes with no
  live consumer, the inverse of the usual "engine exists, integration is
  later" gap every prior phase flagged

## What's actually wired up vs. what isn't

Implemented and tested (`packages/plugin/src`):

- `IPlugin` (id, name, version, `activate(api)`/`deactivate()`)
- `IPluginManifest` (id, name, version, `permissions: PluginPermission[]`)
- `PluginRegistry`: `register → activate → suspend/resume → deactivate`
  state machine, backed by `PluginLifecycleState` (extended this phase —
  see `lifecycle.md`)
- Permission-scoped `IPluginAPI`: `buildScopedPluginAPI` (`permissions.ts`)
  returns `undefined` for every sub-API a plugin's manifest didn't request,
  even if the host provided it — this is the actual sandbox enforcement
  mechanism, not just documentation
- `PluginEngine implements IPluginEngine` — thin facade over
  `PluginRegistry`, matching `AIManager`/`ExportEngine`/`HistoryEngine`'s
  split; takes a caller-assembled `hostApi: IPluginAPI` in its
  constructor (this package never assembles that itself)
- Two built-in plugins proving the mechanism end-to-end without any
  special-cased "built-in" registration path: `createSelectToolPlugin()`
  and `createDefaultExportPresetPlugin()` (`built-ins/`) — both go through
  the exact same `register`/`activate` path a third-party plugin would

**Not implemented** (explicitly out of scope for Phase 14, same gap
pattern as every prior phase):

- No real integration layer exists that holds both a real `EffectsEngine`/
  `ExportEngine`/`AIManager` _and_ a real `PluginRegistry` to assemble the
  `hostApi: IPluginAPI` this phase's `PluginEngine` expects to be handed.
  Building that adapter is Editor Framework work (`docs/02-system-architecture/panels.md`'s
  "Plugin" service), not Plugin Engine work.
- Tool/Panel registration has no consumer yet — Phase 15/17-ui doesn't
  exist. `IToolAPI`/`IPanelAPI` are forward-declared against
  `toolbar.md`/`panels.md`'s existing spec text, unverified against a real
  Tool Registry/Workspace Engine because neither exists to verify against.
- Plugin settings persistence (`serialize()`/`deserialize()`, from this
  doc's original stub wording) — not in PLAN.md's Phase 14 checklist, not
  implemented. See `plugin-api.md`.
- Sandboxing beyond "the API object has fewer fields": no iframe/worker
  isolation, no CPU/memory quotas, no code-signing/trust model. A plugin
  is still an arbitrary `IPlugin` object running on the host's own thread
  with the host's own object references (whatever it's handed through
  its granted sub-APIs) — see `lifecycle.md` "Open questions."

## Scope

Covered: registration/permission/activation/suspend/deactivate lifecycle,
the five API surfaces, built-in-plugin proof of concept.

Not covered (left to later phases): actual cross-engine wiring, Editor UI
consumption of Tool/Panel registrations, plugin distribution/marketplace,
plugin-to-plugin dependencies.
