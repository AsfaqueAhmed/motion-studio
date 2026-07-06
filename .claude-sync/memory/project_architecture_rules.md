---
name: Motion Studio architecture non-negotiables
description: Hard rules that govern all implementation — UI/engine separation, naming, time representation
type: project
---

UI never calls an engine directly. Every user action → Intent → Editor Service → Typed Command(s) → Command Bus → Engine → Event Bus → React. No exceptions.

Engines communicate only through I-prefixed interfaces, events, and commands — never by importing each other's concrete classes.

Only the Storage engine touches IndexedDB/OPFS. Everything else goes through the VFS.

Internal time is always integer Ticks (branded type), never float seconds. 1s @ 30fps = 900 ticks.

Frame State is immutable. Preview and export both consume the same Frame State — this guarantees what-you-see == what-you-export. Protect this invariant above all else.

Validation lives in command handlers (domain layer), not UI components.

Shaders are NOT portable: WGSL (WebGPU) ≠ GLSL (WebGL2). Every effect authored twice.

**Why:** Prevents 15+ engines from becoming a tangled mesh as the app grows.

**How to apply:** Flag immediately if a component imports a concrete engine class, or if a float is used for timeline time, or if an engine accesses storage directly.
