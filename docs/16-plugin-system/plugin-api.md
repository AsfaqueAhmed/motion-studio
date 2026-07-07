# Plugin Api

> Status: Implemented (Phase 14, `packages/plugin/src/plugin.ts`).

## `IPlugin`

```typescript
interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  activate(api: IPluginAPI): void | Promise<void>;
  deactivate(): void | Promise<void>;
}
```

This matches PLAN.md Phase 14's checklist literally: "id, name, version,
`activate(api)`/`deactivate()`". This doc's original stub instead said
"initialize(), destroy(), serialize(), deserialize()" — that was
pre-Phase-14 planning-history wording. PLAN.md (this repo's authoritative
checklist, per its own header) won; `activate`/`deactivate` is the real
naming, and `serialize`/`deserialize` (plugin settings persistence) isn't
implemented — see "Open questions" below.

## `IPluginManifest`

```typescript
interface IPluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly permissions: readonly PluginPermission[];
}
```

Declared separately from `IPlugin` so `PluginRegistry.register()` can
catch an id mismatch (`PluginIdMismatchError`) before ever calling into
plugin code. `permissions` drives the sandbox — see `lifecycle.md`.

## `IPluginAPI` — the five sub-APIs

```typescript
interface IPluginAPI {
  readonly effects: IEffectsAPI | undefined;
  readonly export: IExportAPI | undefined;
  readonly ai: IAICapabilityAPI | undefined;
  readonly tools: IToolAPI | undefined;
  readonly panels: IPanelAPI | undefined;
}
```

Fields are typed `X | undefined` rather than `X?` because
`tsconfig.base.json` sets `exactOptionalPropertyTypes`, which forbids
explicitly assigning `undefined` to a bare optional property —
`permissions.ts`'s `buildScopedPluginAPI` needs to do exactly that for
every sub-API a plugin didn't request. Same pattern
`packages/assets/src/asset-catalog.ts`'s `durationTicks` field already
uses.

See `effects-api.md`, `export-api.md`, `ai-api.md`, and this repo's
`docs/17-ui/toolbar.md`/`panels.md` for what each sub-API mirrors.

## Registration id vs. tool/panel/preset/provider ids

`IPlugin.id` (e.g. `"builtin.select-tool"`) is a different namespace from
the ids a plugin registers _through_ its sub-APIs (e.g. tool id
`"select"`, preset id `"1080p30-h264-opus"`). `PluginRegistry` only ever
tracks the former; collision-checking within a sub-API's own id namespace
(e.g. two plugins both registering a tool called `"select"`) is each
sub-API implementation's job once a real one exists — not implemented
here, since `IEffectsAPI`/`IExportAPI`/etc. are interfaces only, with no
concrete backing registry in this package.

## Open questions

- Settings persistence (`serialize()`/`deserialize()`): would a plugin's
  saved settings live in the Project (making plugin state part of
  project data, and therefore part of History/undo) or in some
  plugin-local store outside the project entirely? Not decided, not
  implemented.
- Plugin-to-plugin dependencies (e.g. plugin B requires plugin A to be
  `Ready` first) — no ordering or dependency-graph concept exists in
  `PluginRegistry` today; `register()`/`activate()` calls are independent
  of each other.
