# Assets Engine — Overview

**The single canonical asset management engine.** Earlier design drafts
independently specified this twice — once as a "Media Engine," once
again as an "Assets Panel" with a near-identical registry, database,
categories, and public API. This folder is the merged, single source of
truth; the UI-facing browser is a thin view over it. See
`../DECISIONS.md` ADR-002.

## Owns

Import, validation, hashing/dedup, metadata extraction, thumbnail/
waveform/proxy generation, tagging, favorites, collections, search, and
the Asset Dependency Graph (which compositions/clips/templates reference
a given asset — enables safe-delete warnings and "unused assets"
cleanup as one mechanism, not two).

## Never does

Decode media itself (delegates to worker pipelines / the Layer Engine's
media handling), render, play audio, store project structure (Storage
Engine's job for the underlying bytes; this engine owns the catalog on
top).

## Import pipeline

```
Select/drop file → Validate → Hash → Detect type → Store (via VFS, OPFS)
→ Extract metadata → Thumbnail → Waveform (if audio) → Proxy (if large video)
→ Register in catalog → Ready
```

Everything after validation runs in workers.

## Proxy system

For large video: generate a lower-resolution proxy for editing, export
from the original full-resolution source. This is the single most
important thing for making the editor usable on real hardware with 4K+
footage.

## Confirmed technical gaps to verify during implementation

- **Container demuxing** (MP4/MOV/WEBM/AVI/MKV) isn't just "WebCodecs
  decode" — needs format-specific demuxer libraries, and some formats
  may have no clean native browser path at all (see `../TECH_STACK.md`).
- **Proxy generation needs `VideoEncoder`** (not just decode) — encoder
  codec/hardware support is generally narrower and less consistent than
  decode support across browsers. Validate during implementation, don't
  assume it "just works."
- **Hashing cost for large files** is asserted to run in a worker but
  never actually measured — same open item as in Storage Engine.

## UI layer

`../17-ui/asset-browser.md` renders this engine's data — it does not
maintain its own registry, database, or dedup logic.
