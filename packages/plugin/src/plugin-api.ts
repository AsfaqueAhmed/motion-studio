import type { IAICapabilityAPI } from "./ai-capability-api";
import type { IEffectsAPI } from "./effects-api";
import type { IExportAPI } from "./export-api";
import type { IPanelAPI } from "./panel-api";
import type { IToolAPI } from "./tool-api";

/**
 * The full API surface passed to `IPlugin.activate()`. Fields are typed
 * `X | undefined` rather than `X?` (matching `packages/assets/src/asset-catalog.ts`'s
 * `durationTicks` pattern) because `tsconfig.base.json` sets
 * `exactOptionalPropertyTypes`, which forbids explicitly assigning
 * `undefined` to a bare optional property — and `permissions.ts`'s
 * `buildScopedAPI` needs to do exactly that for every sub-API a plugin
 * didn't request.
 *
 * This is also the sandbox boundary (PLAN.md "Plugin sandbox: plugins only
 * see public APIs, never engine internals"): every field here is a
 * Plugin-package-local interface structurally matching a real engine's
 * public surface, never the engine's own concrete class — see
 * `effects-api.ts`/`export-api.ts`/`ai-capability-api.ts` for why.
 */
export interface IPluginAPI {
  readonly effects: IEffectsAPI | undefined;
  readonly export: IExportAPI | undefined;
  readonly ai: IAICapabilityAPI | undefined;
  readonly tools: IToolAPI | undefined;
  readonly panels: IPanelAPI | undefined;
}
