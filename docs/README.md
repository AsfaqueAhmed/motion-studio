# Motion Studio — Project Documentation

A 100% frontend, offline-capable, browser-based motion graphics and video
editing engine. Internally the reusable core is called **MSE** (Motion
Studio Engine); the shipped application is **Motion Studio**.

This repository is the **planning and architecture corpus**, organized so
that it can be used directly as project context for Claude Code (or any
coding agent) when implementation begins.

## How to use this repo with Claude Code

1. **Read `ARCHITECTURE.md` first.** It is the single-page map of the whole
   system — every engine, every layer, and the rules that govern how they
   talk to each other. Everything else in this repo is detail underneath it.
2. **Read `DECISIONS.md` before touching anything that looks ambiguous.**
   This project went through many rounds of design iteration, and several
   subsystems were independently specified more than once. `DECISIONS.md`
   is the log of which version won and why — treat it as authoritative
   over any single folder's stub content if they ever conflict.
3. **Read `GLOSSARY.md` before naming anything.** A handful of terms
   (`Layer`, `Scene Graph`, `Camera`, `Property Registry`) were used
   ambiguously across earlier drafts. The glossary defines the one
   canonical meaning of each — use these names in code, not the old ones.
4. **`24-roadmap/mvp.md` is the recommended starting point for actual
   implementation** — it front-loads two small technical spikes (export
   pipeline, in-browser TTS) that de-risk the two biggest unknowns in the
   whole project before any further engine code is written. Read this
   before writing a line of engine code.
5. Every other numbered folder (`01` through `25`) corresponds to one
   subsystem. Most files are currently **stubs** — a title, a one-line
   scope description, and a pointer back to the constraints in
   `ARCHITECTURE.md`/`DECISIONS.md`. They are intentionally left this way
   so that detailed design happens close to implementation, informed by
   what's actually learned building it, rather than being fully speculated
   up front.

## Repository map

```
01-product/              Vision, requirements, personas, browser support
02-system-architecture/  Cross-cutting architecture rules (layering, events, dependency rules)
03-folder-structure/     Repo/package conventions
04-core/                 Core Engine (kernel, scheduler, DI, event bus, workers)
05-rendering-engine/     WebGPU/WebGL/Canvas compositor, Render Graph
06-animation-engine/     Keyframes, interpolation, animation clips
07-timeline-engine/      Composition/Track/TrackItem temporal model
08-layer-engine/         Canonical "what" model (image/video/text/shape/group layers)
09-effects-engine/       Blur/glow/shadow/blend-mode/filter effect nodes
10-audio-engine/         Web Audio graph, mixer, sync
11-ai/                   Inference platform, TTS, capability registry
12-storage/              IndexedDB + OPFS persistence, VFS abstraction
13-export/               WebCodecs encode, muxing, presets
14-assets/               Canonical asset management (import/catalog/search)
15-history/              Undo/redo, command pattern
16-plugin-system/        Plugin lifecycle and extension points
17-ui/                   Editor framework: panels, toolbar, inspector, timeline UI, shortcuts
18-state-management/     Zustand conventions for UI-only state
19-testing/              Test strategy per layer
20-performance/          Cross-cutting performance budget and rules
21-security/             Sandboxing, file access, permissions
22-pwa/                  Offline/installable app concerns
23-devops/               CI, linting, release process
24-roadmap/              MVP, v1, v2, v3 scope — START HERE for implementation order
25-reference/            Master indexes (shortcuts, interfaces, schemas, enums, diagrams)
```

## Status of this corpus

This documentation represents an extensive architecture-first planning
process. It is thorough, but **it has not yet been validated against any
real implementation** — see `DECISIONS.md` §"Open Risks" and
`24-roadmap/mvp.md` for what to prototype first and why. Treat everything
in the numbered folders as a strong starting hypothesis, not settled fact,
until it survives contact with actual code.
