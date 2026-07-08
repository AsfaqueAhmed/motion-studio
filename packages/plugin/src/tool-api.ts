import type { IToolInteractionAPI } from "./interaction-api";

/**
 * Matches `ToolDefinition` from `docs/17-ui/toolbar.md` ("Tools register at
 * startup or via plugins"): id, name, icon, category, shortcut, cursor,
 * factory. Consumed by `apps/studio/src/editor-kernel/tool-registry.ts`'s
 * `ToolRegistry`, the first real implementation of the Tool Registry this
 * doc comment used to say didn't exist.
 */
export interface IPluginToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly category: string;
  readonly shortcut?: string;
  readonly cursor?: string;
}

/** Per-pointer-event data the Interaction Pipeline hands a tool — `toolbar.md`'s `InteractionContext`'s pointer/modifiers slice. Camera/selection/mutation access is `IToolInteractionAPI`, given once at `activate()`, not re-sent per event. */
export interface IInteractionEvent {
  readonly worldX: number;
  readonly worldY: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly modifiers: {
    readonly shift: boolean;
    readonly alt: boolean;
    readonly ctrl: boolean;
    readonly meta: boolean;
  };
}

export interface IWheelInteractionEvent extends IInteractionEvent {
  readonly deltaY: number;
}

/** Minimal drawing surface a tool's `renderOverlay` gets — never the raw `CanvasRenderingContext2D` (sandbox boundary, same reasoning as every other `IPluginAPI` sub-surface). Coordinates are world-space; the host converts to screen pixels. */
export interface IOverlayDrawApi {
  rect(x: number, y: number, width: number, height: number, style?: string): void;
  polygon(points: ReadonlyArray<readonly [number, number]>, style?: string): void;
  circle(x: number, y: number, radius: number, style?: string): void;
  line(x1: number, y1: number, x2: number, y2: number, style?: string): void;
}

/**
 * `toolbar.md`'s `Tool` interface. `activate` receives the `"interaction"`
 * permission's scoped `IToolInteractionAPI` — a fresh session per
 * activation, not a singleton (`toolbar.md`: "Tool Session ... owns temp
 * interaction state ... destroyed on commit/cancel"). Pointer/keyboard/
 * wheel/`renderOverlay` are optional: a tool that only needs
 * activate/deactivate (e.g. Scissors, whose real behavior lives in the
 * Timeline panel, not the Canvas pointer pipeline) can omit them.
 */
export interface IPluginTool {
  activate(api: IToolInteractionAPI): void;
  deactivate(): void;
  cancel(): void;
  pointerDown?(event: IInteractionEvent): void;
  pointerMove?(event: IInteractionEvent): void;
  pointerUp?(event: IInteractionEvent): void;
  wheel?(event: IWheelInteractionEvent): void;
  keyDown?(event: KeyboardEvent): void;
  renderOverlay?(draw: IOverlayDrawApi): void;
}

export type IPluginToolFactory = () => IPluginTool;

/** Public surface a plugin sees for the Tool Registry (`apps/studio/src/editor-kernel/tool-registry.ts`) — see docs/16-plugin-system/overview.md. */
export interface IToolAPI {
  registerTool(definition: IPluginToolDefinition, factory: IPluginToolFactory): void;
  unregisterTool(id: string): void;
}
