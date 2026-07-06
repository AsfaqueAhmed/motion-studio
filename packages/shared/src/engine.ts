/**
 * Shared lifecycle every engine follows: initialize() -> ready() -> dispose().
 * See CLAUDE.md "Engine ownership" and docs/04-core/overview.md 2.1.
 */
export interface IEngine {
  readonly name: string;
  initialize(): Promise<void> | void;
  ready(): Promise<void> | void;
  dispose(): Promise<void> | void;
}

export type ICoreEngine = IEngine;
export type IStorageEngine = IEngine;
export type IAssetsEngine = IEngine;
export type ILayerEngine = IEngine;
export type ITimelineEngine = IEngine;
export type IAnimationEngine = IEngine;
export type IRenderingEngine = IEngine;
export type IEffectsEngine = IEngine;
export type IAudioEngine = IEngine;
export type IExportEngine = IEngine;
export type IAIEngine = IEngine;
export type IHistoryEngine = IEngine;
export type IPluginEngine = IEngine;
