---
name: project-phase14-plugin-system
description: "Phase 14 Plugin System decisions — PluginRegistry/PluginEngine lifecycle, permission-scoped IPluginAPI sandbox, five DI sub-APIs mirroring other engines without importing them, built-in Select-tool/export-preset plugins, no integration layer wiring real engines in yet"
metadata: 
  node_type: memory
  type: project
  originSessionId: 53b7d675-6612-4da4-be30-d4fd276dae9b
---

Phase 14 (Plugin System, `packages/plugin`) is complete on branch
`phase-14-plugin-system` (2026-07-07). Implements PLAN.md's checklist:
`IPlugin` (id/name/version/activate/deactivate), five sub-APIs
(`IEffectsAPI`/`IExportAPI`/`IAICapabilityAPI`/`IToolAPI`/`IPanelAPI`),
permission-scoped sandboxing, `register → activate → suspend/resume →
deactivate` lifecycle, and two built-in plugins.

**Why:** `packages/plugin/package.json` depends on `@motion-studio/shared`
only — same one-dependency rule every other engine package in this repo
follows ([[project_architecture_rules]]). This means Plugin can never
import `@motion-studio/effects`/`export`/`ai` directly, so each sub-API
(`effects-api.ts`/`export-api.ts`/`ai-capability-api.ts`) is a hand-rolled
DI interface structurally mirroring the real engine's public surface
(same pattern Phase 8 used for Effects/Rendering, Phase 10 for
Export/Mediabunny, Phase 13 for AI/onnxruntime-web) — never importing it.
Concretely: `IExportAPI`'s preset fields use plain strings for
container/codec (Export's `VideoCodec`/`AudioCodec`/`ContainerFormat` are
package-local, not shared); `IAICapabilityAPI.preferredBackend` is a
string for the same reason (AI's `InferenceBackend` is package-local).
This is also what makes "plugins only see public APIs, never engine
internals" true at the type level, not just convention.

`PluginLifecycleState` (in `@motion-studio/shared`, scaffolded in Phase 1
with only `Validating/RequestingPermissions/Registered/Initializing/Ready`)
was extended this phase with `Suspended`/`Deactivated` to cover PLAN.md's
"register → activate → suspend → deactivate" — the original enum only
modeled the register/activate half. `suspend()`/`resume()` on
`PluginRegistry` are registry-only bookkeeping; `IPlugin` has no
suspend/resume hooks, so no plugin method is called on suspend — an
explicit design decision, not an oversight.

Sandbox enforcement is real, not just documented: `buildScopedPluginAPI`
(`permissions.ts`) returns `undefined` for every `IPluginAPI` field a
plugin's manifest didn't request permission for, even if the host's real
API had it populated — tested in `permissions.test.ts`.

`ToolAPI`/`PanelAPI` mirror `docs/17-ui/toolbar.md`'s `ToolDefinition` and
`docs/17-ui/panels.md`'s panel-as-plugin-module concept, but have **no
real consumer** — Phase 15/17-ui (Editor UI) doesn't exist yet. This is
the inverse of every prior phase's gap (usually "engine exists,
integration is later"; here "plugin API exists, the thing it would
integrate with doesn't exist yet").

Two built-in plugins prove the mechanism works end-to-end through the
exact same `register`/`activate` path a third-party plugin would use:
`createSelectToolPlugin()` and `createDefaultExportPresetPlugin()`
(`built-ins/`). **No built-in-effects plugin** — would require either a
real `IEffectsAPI` implementation (none exists) or forking real WGSL/GLSL
shader source as plugin-side data, neither reasonable without the
integration layer.

**Biggest open gap:** no integration layer exists yet that holds real
`EffectsEngine`/`ExportEngine`/`AIManager`/Tool-Registry/Workspace-Engine
instances *and* a `PluginRegistry` to assemble the `hostApi: IPluginAPI`
that `PluginEngine`'s constructor expects. `PluginEngine` takes `hostApi`
as a DI parameter and never assembles it itself — same "engine exists,
integration is later" gap every phase 7-13 flagged for its own
cross-engine wiring, just concentrated here since Plugin's whole job is
bridging every other engine.

**How to apply:** Before Phase 15 (Editor UI) or any later phase that
wants to actually wire plugins in, expect to build that integration/
adapter layer — it's the natural place `IToolAPI`/`IPanelAPI` finally get
a real Tool Registry/Workspace Engine to talk to, and where
`IEffectsAPI`/`IExportAPI`/`IAICapabilityAPI` finally get real
implementations backed by `EffectsEngine`/`ExportEngine`/`AIManager`.
See [[project_phase13_ai_engine]] for the AI Engine side of that same gap.
