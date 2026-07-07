# Frame Cache

Decoded video frame cache with LRU eviction, plus pre-decode lookahead.
(This doc originally conflated itself with the GPU texture cache — see
`gpu-memory.md` for that; this file is specifically about **decoded video
frames**, a different cache with a different, already-resolvable eviction
policy.)

## Implementation (`packages/rendering/src/frame-cache.ts`)

`DecodedFrameCache<TFrame>` — keyed by `` `${assetId}:${tick}` ``, generic
over the frame payload type (a real `VideoFrame` in the browser). Backed by
a `Map`, which preserves insertion order: `get()` "touches" a hit by
delete-then-reinsert so it becomes most-recently-used; `set()` evicts the
oldest (first) key once `size > capacity` (default 30 per instance).

Unlike `TextureCache` (GPU memory, no budget number — deliberately
unbounded, see `gpu-memory.md`), this cache lives in plain JS heap, so a
simple entry-count cap is a real, safe bound today — no invented byte
budget required.

`computeLookaheadTicks(currentTick, ticksPerFrame, lookaheadFrames = 5)`
returns the next N frame-boundary ticks after the playhead, so a decode
pipeline can pre-decode ahead of playback and avoid stalling on
`VideoDecoder` output. `ticksPerFrame` comes from the Composition's
fps/tick-resolution (divide `ticksPerSecond()` from `@motion-studio/shared`
by fps).

## Open questions

- **Not wired to a real decode pipeline yet.** There's no `VideoDecoder` →
  `DecodedFrameCache` integration in this repo yet — Assets (Phase 12) and
  Export (Phase 10, Spike A's `Mediabunny` findings) own that wiring. This
  cache is ready to receive it.
- **Per-asset vs. global capacity.** `capacity` is per `DecodedFrameCache`
  instance; whether the Rendering Engine keeps one cache per asset or one
  shared cache with a larger capacity is undecided — depends on how many
  videos a typical composition has playing/decoding concurrently, which
  isn't known yet.
