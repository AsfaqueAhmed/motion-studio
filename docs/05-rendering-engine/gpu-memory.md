# GPU Memory

GPU memory budget and eviction rules. OPEN: needs a concrete ceiling, see DECISIONS.md.

## Implementation (`packages/rendering/src/texture-cache.ts`)

`TextureCache implements ITextureCache` — a plain `Map<string,
ITextureHandle>` with `get`/`set`/`has`/`delete`/`clear`/`size`.
**Deliberately no eviction policy.** CLAUDE.md "Known hard risks" #6 and
this doc both flag that no concrete GPU memory budget number exists yet;
implementing LRU eviction against a made-up ceiling would be worse than an
unbounded-but-correct cache, per explicit project instruction ("Don't
design the GPU memory LRU until you have a real memory budget number").

Compare with `frame-cache.ts`'s `DecodedFrameCache`, which **does** evict
(LRU, count-based) — that cache lives in regular JS heap, where an
entry-count cap is a real, safe bound today with no GPU-specific number
required.

## Open questions (unchanged from before this phase)

- **The actual ceiling.** Needs a real number (device-tier-dependent?
  fixed? percentage of `navigator.deviceMemory`/`GPUAdapter` limits?) before
  `TextureCache` can safely evict. Until then, callers are responsible for
  not leaking texture handles they no longer need (`delete`/`clear`).
- Once a budget exists, `TextureCache` is the natural place to add LRU
  eviction — the interface (`ITextureCache`) is already the seam a
  budget-aware implementation would slot behind, so no call site needs to
  change.
