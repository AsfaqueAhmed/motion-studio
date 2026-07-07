import type { IPlugin } from "../plugin";
import type { IPluginAPI } from "../plugin-api";
import type { PluginPermission } from "../permissions";

const PLUGIN_ID = "builtin.select-tool";

/**
 * "Built-in tools as first-class plugins" (PLAN.md Phase 14) — the Select
 * tool from `docs/17-ui/toolbar.md`'s built-ins list (Select, Move, Hand,
 * Zoom, Blade, Crop, Text, Shape, Mask, Pen, Audio, Keyframe, Comment,
 * Color Picker), registered through the exact same `IToolAPI` a third-party
 * plugin would use — proving the plugin mechanism itself works end-to-end
 * without any special-cased "built-in" registration path.
 *
 * Deliberately data-only: it holds no pointer-handling logic of its own
 * (the Interaction Pipeline it would drive doesn't exist yet — see
 * `tool-api.ts`), just the registration shape and a no-op `IPluginTool`.
 */
export function createSelectToolPlugin(): IPlugin {
  let toolApi: IPluginAPI["tools"];

  return {
    id: PLUGIN_ID,
    name: "Select Tool",
    version: "0.1.0",
    activate(api: IPluginAPI): void {
      toolApi = api.tools;
      toolApi?.registerTool(
        {
          id: "select",
          name: "Select",
          icon: "cursor",
          category: "selection",
          shortcut: "V",
        },
        () => ({
          activate: () => {},
          deactivate: () => {},
          cancel: () => {},
        }),
      );
    },
    deactivate(): void {
      toolApi?.unregisterTool("select");
      toolApi = undefined;
    },
  };
}

export const SELECT_TOOL_PLUGIN_MANIFEST = {
  id: PLUGIN_ID,
  name: "Select Tool",
  version: "0.1.0",
  permissions: ["tools"] as readonly PluginPermission[],
};
