# Transitions

`TransitionType` (`@motion-studio/shared`): `CrossDissolve`, `WipeLeft`,
`WipeRight`, `WipeUp`, `WipeDown`.

`transitions.ts`'s `createTransitionNode(id, fromId, toId, type, progress)`
is a **two-input** node — `dependencyIds: [fromId, toId]` — driven by
`progress` (`0` = fully `from`, `1` = fully `to`), validated to `[0, 1]`.

## Ownership boundary

Effects only owns _how_ to blend two frames given a `progress` value; it
never reads Timeline state. **Timeline owns _when_ a transition is active**
— the overlap region between two adjacent `TrackItem`s — and is responsible
for computing `progress` for the current tick and calling
`createTransitionNode` with it. This mirrors the Animation Engine boundary
(`evaluateAt` takes a tick, never reads the Timeline itself).

## Shader shape

- `CrossDissolve`: `mix(fromColor, toColor, kProgress)` — literally a
  linear alpha blend, identical in WGSL and GLSL.
- Wipes: a spatial step function per direction — e.g. `WipeLeft` reveals
  `toColor` where `uv.x > 1.0 - kProgress`. WGSL uses `select(fromColor,
toColor, condition)`; GLSL uses a ternary (`condition ? toColor :
fromColor`) — the one place in this package where WGSL/GLSL need
  genuinely different control-flow syntax for the same logic, not just
  different type names.

## CSS/Canvas2D fallback

None as a single node — compositing two source images isn't expressible as
a single-input CSS filter chain. `CrossDissolve` still has a simple,
real fallback path: draw `to` over `from` with `ctx.globalAlpha =
progress` — but that's two draw calls a caller makes directly, not
something `composeCssFilterChain` can express, so it's documented here
rather than modeled as a node field.

## Open questions

- Only axis-aligned wipes (left/right/up/down) — diagonal or shaped wipes
  (e.g. iris, clock) are not in the Phase 8 checklist ("cross-dissolve,
  wipe, etc.") and are not implemented.
