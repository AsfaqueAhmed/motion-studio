# Effects Api

> Status: Implemented (Phase 14, `packages/plugin/src/effects-api.ts`).

## Shape

```typescript
interface IPluginEffectNode {
  readonly id: string;
  readonly type: EffectType; // from @motion-studio/shared — common ground
  readonly dependencyIds: readonly string[];
  readonly wgsl: string;
  readonly glsl: string;
  readonly cssFilter?: string;
}

interface IEffectsAPI {
  registerEffectNode(node: IPluginEffectNode): void;
  unregisterEffectNode(id: string): void;
}
```

This structurally mirrors Effects' real `IEffectNode`
(`packages/effects/src/effect-node.ts`) field-for-field. `EffectType` is
imported from `@motion-studio/shared` (fine — every package already
depends on shared), but `EffectNodeId` (a branded string, also in shared)
is intentionally **not** used here: a plugin author doesn't have access to
`createEffectNodeId`'s brand-minting semantics tied to a real
`EffectsEngine` instance, so `id`/`dependencyIds` are plain `string`.

## What's not wired up

Nothing in this package calls into a real `EffectsEngine` or its
`EffectChain`. `registerEffectNode`/`unregisterEffectNode` are interface
methods only — there is no concrete class implementing `IEffectsAPI`
anywhere in `packages/plugin`. A real implementation would need to live
in whatever integration layer holds a real `EffectsEngine` instance and
adapts calls into it (converting the plugin's WGSL/GLSL strings and
string ids into real `EffectNodeId`s, wiring the node into a `RenderGraph`)
— this is the same "not wired into any backend's `drawFrame`" gap Phase 8
itself flagged, just one layer further removed.

Consequently, **no built-in-effects plugin was written this phase** (only
a built-in tool plugin and a built-in export-preset plugin exist in
`built-ins/`) — a real one would need actual WGSL/GLSL shader source
matching one of Effects' real nodes (Blur/Glow/Shadow/etc.), and without
a live `IEffectsAPI` implementation to register against, there's nothing
to verify it against.

## Open questions

- Should a plugin-registered effect node participate in the same
  `Dag`/`DirtyTrackedGraph` primitives (ADR-005) Effects' own nodes use,
  or does it need its own validation pass (e.g. rejecting a `dependencyIds`
  cycle) before being handed to a real `RenderGraph`? Not decided.
- Versioning: if a plugin re-registers an effect node with the same `id`
  but different shader source (e.g. after a plugin update), does that
  invalidate cached render output for every layer using it? Not addressed.
