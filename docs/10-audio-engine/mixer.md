# Mixer

> Status: Implemented (Phase 9). `packages/audio/src/mixer.ts`.

Per-track buses, master bus, limiter.

## Scope

One `Mixer` instance owns exactly one master bus:
`masterGain -> DynamicsCompressor (limiter, -1dB threshold, 20:1 ratio) ->
context.destination`. `AudioEngine` (`audio-engine.ts`) builds one `Mixer`
per session — the realtime one via `attachRealtimeContext`, and an
independent one per export render via `buildOfflineMixer`, since Web
Audio nodes are bound to the context that created them and can't be
shared across a realtime/offline pair.

Each Timeline `TrackId` (Audio track type) gets its own bus via
`addTrack(trackId)`: `Gain (volume/mute) -> StereoPanner (pan) ->
masterGain`. `addTrack` returns the `GainNode` clip chains and effect
chains should `.connect()` into (`getTrackInput` returns the same node
later).

- `setTrackVolume(trackId, volume)` — sets the fader; throws on negative
  volume.
- `setTrackMuted(trackId, muted)` — layered on top of volume rather than
  overwriting it: mute sets gain to 0, unmute restores the last
  `setTrackVolume` value, so toggling mute never loses the fader position.
- `setTrackPan(trackId, pan)` — -1..1, throws outside that range.
- `removeTrack(trackId)` — disconnects both bus nodes and forgets the
  track.

## Ducking

`duckTrack(trackId, targetVolume, atTime, rampSeconds)` schedules
`cancelScheduledValues(atTime)` → `setValueAtTime(currentValue, atTime)`
→ `linearRampToValueAtTime(targetVolume, atTime + rampSeconds)` on the
track's existing gain param. This is the carried-forward design-review
recommendation from `overview.md` ("ducking is a headline feature for
this category of app, design it into the bus/routing model now") —
implemented as a scheduled automation on the bus that already exists,
not a separate ducking subsystem. Restoring after a duck is just calling
`duckTrack` again toward the original volume; this package doesn't track
"pre-duck volume" automatically, since the caller (whoever decided to
duck — e.g. an Editor Service reacting to a narration clip's tick range)
already knows what to restore to.

## Open questions

None outstanding for the bus topology itself. A "Mixer Panel" UI (Phase 17) consuming `setTrackVolume`/`setTrackMuted`/`setTrackPan` through the
Intent/Command layer (never calling `Mixer` directly from a component,
per CLAUDE.md's one rule) isn't built yet.
