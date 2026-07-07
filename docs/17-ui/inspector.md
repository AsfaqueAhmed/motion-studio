# Inspector

> Status: Implemented (Phase 15) — see `PLAN.md` Phase 15.4.

`PropertySchemaRegistry` (`apps/studio/src/editor-kernel/property-schema-registry.ts`)
maps a `LayerType` to an ordered list of inspector rows. It is **not** a
second source of truth for what properties exist — it reuses
`AnimatablePropertyRegistry` (`@motion-studio/animation`)'s `getAll(layerType)`
as the source of which properties exist and their `PropertyValueType`, and
only adds UI-specific concerns on top: a human label, an editor widget kind
(`"text" | "number" | "color" | "toggle"`), and three static
(non-animatable) rows — `name`, `visible`, `locked` — that
`AnimatablePropertyRegistry` doesn't know about because they're not
keyframeable.

This is the distinction the file's original stub was pointing at:
`AnimatablePropertyRegistry` (Animation Engine, ADR-008) owns _can this be
keyframed and how do you interpolate it_; `PropertySchemaRegistry`
(Inspector, this file) owns _how do you render and edit it_. Two registries,
deliberately not merged — see GLOSSARY.md.

## Editing flow

`InspectorPanel` (`apps/studio/src/components/inspector/inspector-panel.tsx`)
displays, for each row, the live-evaluated value at the current playhead
tick (`AnimationEngine.evaluateAt`) when a keyframe track exists, falling
back to the Layer's static value otherwise. Editing always writes the
**static** value via `InspectorEditorService.setLayerProperty` →
`UpdateLayerCommand` (new this phase — `@motion-studio/layer` had no
`ICommand`s before Phase 15) — never the evaluated one. Clicking the
diamond icon next to an animatable row calls
`InspectorEditorService.addKeyframe`, which creates the
`AnimationClip`/`PropertyTrack` on demand (if this is the property's first
keyframe) and bundles that creation with the keyframe add into one
`CompositeCommand`, so undoing the first keyframe on a property also
removes the now-empty clip/track it created.

Inline validation is a UX convenience only, per CLAUDE.md — none is
implemented this phase. Real enforcement already lives in
`UpdateLayerCommand`/`AddKeyframeCommand` (the latter delegates to
`AnimationEngine.addKeyframe`, which validates against the property
definition).

## Open scope — not built this phase

- Dropdown editor widget (nothing in the current property set needs one —
  `textAlign`/`fitMode` render as plain text inputs)
- Per-keyframe removal UI (only reachable via Undo right now)
- Multi-selection editing with mixed values
