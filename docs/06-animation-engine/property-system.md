# Property System

`AnimatablePropertyRegistry` (`packages/animation/src/property-registry.ts`)
— renamed from generic "Property Registry", see `../DECISIONS.md` ADR-008;
not to be confused with the Inspector's `PropertySchemaRegistry`
(`17-ui/inspector.md`).

Keyed by `(LayerType, propertyKey)`. Each entry (`IPropertyDefinition`,
`property-definition.ts`) carries `valueType`, `defaultValue`,
`interpolate(a, b, t)`, and `validate(value)`. `interpolate`/`validate`
are behavior, not serializable project data, which is why
`IPropertyDefinition` lives in `@motion-studio/animation` rather than
`@motion-studio/shared` — unlike `IKeyframe`/`IPropertyTrack`/
`IAnimationClip`, which other engines reference by id and so do live in
shared.

`registry.register(...)` throws on a duplicate `(layerType, propertyKey)`
pair — this is also the plugin extension point: a plugin registers a new
`IPropertyDefinition` for its own effect/property without touching this
engine's code.

## Builtin registrations (`builtin-properties.ts`)

Every `LayerType` gets the `ILayerBase` baseline: `transform.x`,
`transform.y`, `transform.scaleX`, `transform.scaleY`,
`transform.rotation`, `opacity` (all `Number`). Layer-type-specific
additions: Text (`fontSize` Number, `color` Color), Shape (`fillColor`/
`strokeColor` Color, `strokeWidth`/`cornerRadius` Number), Audio
(`volume` Number). This matches `IAnimatableLayer` (`@motion-studio/shared`
`layer.ts`) currently being an alias for `ILayerBase` — every Layer type
qualifies, so the base set is registered against all of `LayerType`
rather than a subset.

## Evaluation-order problem — see overview.md

The open evaluation-order question for multi-clip blending / Constraints /
Expressions is documented once, in `overview.md`, rather than repeated
here — see that file's "Multi-clip blending" and "Constraints and
Expressions" sections.
