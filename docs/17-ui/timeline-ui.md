# Timeline UI

> Status: Implemented (Phase 15) — see `PLAN.md` Phase 15.3.

`TimelinePanel` (`apps/studio/src/components/timeline/timeline-panel.tsx`)
renders track headers (label/muted/locked — no solo, since `ITrack` has no
solo field and no engine implements soloing) and clip bars positioned by
`startTick`/`ticksPerPixel` (`useTimelineStore`'s zoom). Clips render as a
colored bar with the Layer's name only — no thumbnail strip or waveform,
since no decoder pipeline exists anywhere in the project yet (the gap
flagged since Phase 12).

**Virtualization is not implemented.** This confirms the "reuse
`IRenderBackend`, don't build a fourth GPU renderer" decision (ADR-004) is
moot for now: the panel is plain DOM (React-rendered `<div>`/`<button>`
elements via CSS transforms), not a canvas-backed view at all, so it never
needed to consume `IRenderBackend` in the first place. Track/item counts in
this vertical slice are small enough that windowing has no observable
benefit yet — real virtualization (reusing the generic `DirtyTrackedGraph`
primitive per ADR-005 #1, same as the Rendering Engine's Scene Graph) is
deferred until a project actually has enough clips to need it.

## Drag/drop

One shared `dnd-kit` `DndContext` at the `EditorShell` level, not a
Timeline-owned pipeline — both the Asset Browser (asset → new clip) and
Timeline (existing clip → new position/track) participate as drag
sources/drop targets through the same `onDragEnd` handler. `PointerSensor`
is configured with a `4px` activation distance, and `handleDragEnd` has a
same-position/same-track guard for clip moves — both exist because a plain
click on a clip was found (via manual Playwright testing, not
speculatively) to register with dnd-kit as a completed zero-distance drag,
which without these guards silently pushed a no-op `MoveTrackItemCommand`
onto the undo stack on every click and ate the click event `ClipBar` needed
for selection.

## Playhead

Click-to-seek on a track lane's background calls `PlaybackService.seek`
directly — playback position is Editor State, not project data (per
`panels.md`), so it never touches the Command Bus/History.

## Open scope — not built this phase

- Thumbnail/waveform clip rendering (needs a decoder pipeline)
- Snapping indicators
- True virtualization
