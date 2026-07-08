---
name: keyframe-write-scope
description: "Don't apply a 'manual keyframe only' request uniformly to both canvas drag and Inspector typing -- drag has no other way to be visible once animated"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f401780d-99c8-4189-bd05-dc3a80368f65
---

When asked to change how property edits interact with keyframes (auto-create
vs. manual-only vs. debounced), the fix must be scoped per interaction type,
not applied as one uniform rule to `InspectorEditorService.buildWriteCommand`
(used by both `setLayerProperty`/`setLayerTransform`, which both Canvas drag
and the Inspector's number fields funnel through).

**Why:** the user asked to "remove auto save frame, must save manually" and
I made ALL writes (drag included) fall back to a static write when animated
but no keyframe exists at the current tick. A static write is invisible once
any keyframe exists on that property (Frame State evaluation always prefers
the evaluated/keyframed value). For an Inspector number field this is
survivable (you can add a keyframe first, then type). For a Canvas drag it
isn't: a drag gesture has no "manual add keyframe" step it can insert
mid-motion, so the layer appeared completely frozen the instant any keyframe
existed anywhere on it. The user's frustrated correction: "i can moov where
ever i want the image but... now i can't even move by item if i dont save it
as frame after 1st one."

**How to apply:** direct-manipulation gestures (canvas drag/resize, anything
that only commits once per gesture on release) should always auto-create-or-
update a keyframe when the property is animated — there's no other way for
the gesture to have a visible effect. Debouncing (already shipped: 1s on
Inspector fields, gesture-based on drag) is what prevents keyframe spam from
rapid intermediate values — that alone was sufficient; going further to
"manual-only" broke direct manipulation. If a future request asks to make
keyframe creation manual-only again, push back specifically on the drag case
before implementing broadly, or scope the change to Inspector-only writes.
