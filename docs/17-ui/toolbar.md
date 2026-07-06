# Tool System (canonical)

**Canonical Tool System** — see `../DECISIONS.md` ADR-001. An earlier
draft also defined this inside Editor Core; that version is superseded
by this one. `../17-ui/panels.md` should reference this file, not
redefine tools.

## Tool interface (every tool implements this)

```typescript
interface Tool {
  activate(context);
  deactivate();
  pointerDown(event);
  pointerMove(event);
  pointerUp(event);
  wheel(event);
  keyDown(event);
  keyUp(event);
  cancel();
  renderOverlay();
}
```

## Tool Registry + Tool Manager

Tools register at startup or via plugins (`ToolDefinition`: id, name,
icon, category, shortcut, cursor, factory). Only one primary tool is
active at a time. Built-ins: Select, Move, Hand, Zoom, Blade, Crop,
Text, Shape, Mask, Pen, Audio, Keyframe, Comment, Color Picker.

## Tool Session (per-activation, not a singleton)

Every activation creates a fresh session owning: temporary interaction
state, pointer capture, preview overlays, snap state, gesture
recognition context, undo transaction scope. Destroyed on commit or
cancel. This avoids stale state leaking between tool switches and gives
multi-step tools (Pen: click-click-click-finish) a clean place to hold
in-progress state.

## Capability-based availability

A tool declares what it _provides_ and _requires_, rather than being
identified only by name:

```
Crop Tool     — Provides: Cropping — Requires: Selection, Canvas
Magic Eraser  — Provides: AI Editing — Requires: Image Selection, AI Runtime
```

Reuses the same Capability Registry pattern as the AI Engine
(`../11-ai/overview.md`) — intentional reuse, see `../GLOSSARY.md`.
Unavailable tools appear disabled when prerequisites aren't met.

## Interaction Pipeline

```
Pointer Event → Pointer Normalizer → Gesture Recognizer → Hit Testing
→ Active Tool → Interaction Context → Command Bus → Core Engines
```

`InteractionContext` (pointer, camera, viewport, selection, snapping,
guides, modifiers, activeTool) is the one object every tool receives —
this is what gives every tool consistent snapping/guide/modifier-key
behavior for free. **This is the same pipeline used by the Canvas
System and Timeline UI** (`timeline-ui.md`) — they should consume this
one pipeline, not each define their own pointer-handling path.

## Hit testing — reuse, don't reimplement

Hit testing (spatial index → candidate objects → geometry test →
selected) is owned by the Selection Engine
(`../../07-timeline-engine/` sibling docs reference this, but the
canonical spatial index lives with Selection). The Canvas/Toolbar layer
converts screen↔world coordinates and calls into that existing index —
it does not maintain a second QuadTree over the same objects. Getting
this wrong risks Canvas and the Renderer disagreeing about what's
selectable vs. what's visible.

## Shortcuts

Tool activation shortcuts (e.g. `V → Select`, `H → Hand`) are declared
per-tool but dispatched through the canonical Command System — see
`shortcuts.md`. Don't build a second shortcut-handling path here.
