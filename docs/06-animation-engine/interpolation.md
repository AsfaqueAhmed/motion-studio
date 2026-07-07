# Interpolation

Two independent concerns, both implemented in `packages/animation`:

1. **Segment easing** (`InterpolationType`: `Linear` | `Bezier` | `Step`)
   — how the raw time fraction through a keyframe segment is turned into
   an eased progress `t` in [0, 1]. See `easing.md`/`bezier.md`.
2. **Per-value-type lerp** (`interpolators.ts`) — how two values of a
   given `PropertyValueType` are combined once `t` is known.

## Implemented (`interpolators.ts`)

- `numberLerp` — `PropertyValueType.Number`.
- `vector2Lerp` / `vector3Lerp` — component-wise `numberLerp`. Not
  currently wired to any registered property (no Vector2/3-typed property
  exists yet — `transform.x`/`transform.y` are registered as independent
  `Number` properties, not a single `Vector2`), but exported for a future
  property that needs it.
- `colorLerp` — `#rrggbb` hex, channel-wise.
- `discreteLerp` — fallback for `Boolean`/`Text`/`Gradient`/`Matrix`: holds
  `a` until `t` reaches 1, then snaps to `b`.

## Open questions (explicitly deferred, not oversights)

- **Color:** only opaque 6-digit hex is supported. Alpha channels, `hsl()`,
  named colors (e.g. Shape Layer's actual default `strokeColor:
"transparent"`), and perceptual (LCH/OKLab) interpolation are not
  implemented — `colorLerp` throws on anything but `#rrggbb`.
- **Boolean/Text/Gradient/Matrix:** no continuous interpolation exists;
  `discreteLerp` is a hard snap, not a designed feature. A Matrix property
  in particular would need decomposition (translate/rotate/scale) to
  interpolate meaningfully — not attempted here.
- **Vector2/Vector3 as a first-class registered property type:** every
  current animatable property is scalar (`Number` or `Color`); no Layer
  property is registered as `PropertyValueType.Vector2`/`Vector3` yet, so
  `vector2Lerp`/`vector3Lerp` are unexercised by the registry today.
