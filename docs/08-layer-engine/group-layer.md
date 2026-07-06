# Group Layer

> Status: Implemented (Phase 4, `packages/layer/src/composition-graph.ts`).

Group/Composition layer: the persistent Composition Graph (parent/child,
nesting) -- distinct from Rendering Engine's ephemeral per-frame Scene
Graph. See GLOSSARY.md.

## Shape

```ts
interface IGroupLayer extends ILayerBase {
  type: LayerType.Group;
  childIds: LayerId[]; // render order, ordered
}
```

`ILayerBase.parentId: LayerId | null` (shared by every layer type) is the
other half of the edge. Only a `Group` layer may appear as someone's
`parentId` — every other layer type is a leaf; `CompositionGraph` enforces
this and throws `"... is not a Group layer and cannot have children"` if
violated.

## Why no separate hierarchy store

ADR-005 calls for one generic "persistent hierarchy" primitive reused by
the Composition Graph here and the future Asset Dependency Graph
(Phase 12). The implementation is `Hierarchy<TId>` in
`@motion-studio/shared/src/hierarchy.ts` — it is **storage-free**: it reads
`parentId`/`childIds` through an accessor the caller provides instead of
keeping its own copy of the tree. `CompositionGraph` binds that accessor to
`LayerRegistry`, so `parentId`/`childIds` on the actual `ILayer` objects
remain the only copy of the tree — nothing to go out of sync. When
Phase 12 builds the Asset Dependency Graph, it should bind its own
accessor over whatever node shape it needs rather than inventing a fourth
graph type or duplicating this one.

## Operations (`CompositionGraph`)

- `addLayer(layer)` — registers the layer; if it has a `parentId`,
  validates the parent is a Group and appends to its `childIds`.
- `reparent(id, newParentId)` — validates the new parent is a Group and
  that the move would not create a cycle (via `Hierarchy.assertNoCycle`)
  before mutating anything; updates old and new parents' `childIds`.
- `removeLayer(id)` — throws if `id` still has children (see
  `overview.md` "Interaction with Timeline" for why cascade-on-delete is
  intentionally left undecided).
- `getParent` / `getChildren` / `getAncestors` / `getDescendants`.
- `isEffectivelyVisible(id)` — `false` if this layer or any ancestor is
  hidden.
- `isEffectivelyLocked(id)` — `true` if this layer or any ancestor is
  locked.

## Open questions

- Delete cascade policy (Composition Graph children vs. Timeline-linked
  items) — see `overview.md`. Needs a decision alongside ADR-010 before a
  `DeleteLayerCommand` is implemented.
- Sibling ordering within `childIds` beyond simple push/filter (e.g.
  explicit reorder-within-parent) is not yet exposed — no consumer needs
  it yet (Layers Panel drag-reorder is Phase 15).
