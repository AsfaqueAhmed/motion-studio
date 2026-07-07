# Thumbnails

> Status: Implemented, minimal (Phase 12, 2026-07-07). See `packages/assets/src/thumbnail-generator.ts`.

## What's implemented

`IThumbnailGenerator.generate(data, type)` — a pure DI interface, no real
decoder wired in — produces at most **one** representative thumbnail per
asset (Image/Video only; returns `undefined` for Audio/Font/LUT). The
import pipeline stores it via `IThumbnailStore.put(assetId, atTick, data)`
at `toTick(0)`, mirroring `@motion-studio/storage`'s real `ThumbnailCache`
(Phase 3), which is already keyed by `(assetId, atTick)` specifically to
support more than one thumbnail per asset later.

## What's not implemented

**LOD by zoom level** — the original stub's stated scope — is not built.
`ThumbnailCache.listTicks(assetId)`/multi-tick storage already exists at
the storage layer (Phase 3) and needs no changes to support it; what's
missing is (a) an `IThumbnailGenerator` call site that requests more than
one tick, and (b) whatever Timeline UI logic (`../17-ui/timeline-ui.md`)
decides which ticks it needs at a given zoom level. Neither is in PLAN.md
Phase 12's checklist.

## Open questions

- **Thumbnail size/format.** Not specified — `IThumbnailGenerator`'s
  return type is a raw `Uint8Array`, format left to whatever real decoder
  implementation is eventually wired in (likely a JPEG/WebP encode off an
  `OffscreenCanvas` frame, matching Rendering's Canvas2D backend
  precedent, but unconfirmed).
- **Which tick to thumbnail for video.** Currently hardcoded to tick 0
  (the first frame). A production implementation likely wants a frame a
  few seconds in (title cards/black frames at t=0 are common) — not
  addressed this phase.
