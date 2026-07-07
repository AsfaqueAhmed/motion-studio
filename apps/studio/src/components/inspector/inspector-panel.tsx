"use client";

import { useEffect, useState } from "react";
import type { Tick } from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import { useTimelineStore } from "../../state/use-timeline-store";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import { getLayerPropertyValue } from "../../editor-kernel/layer-property-path";
import type { IPropertySchemaRow } from "../../editor-kernel/property-schema-registry";

/**
 * Schema-driven Property System (PLAN.md 15.4). Displayed values are the
 * live-evaluated value at the current playhead tick when a keyframe track
 * exists, falling back to the Layer's static value otherwise — editing
 * always writes the static value via `SetLayerPropertyIntent`
 * (`InspectorEditorService`), never the evaluated one. Inline validation
 * here is a UX convenience only; real enforcement lives in the Command
 * handlers (`UpdateLayerCommand`/`AddKeyframeCommand`), per CLAUDE.md.
 */
export function InspectorPanel(): JSX.Element {
  const kernel = useEditorKernel();
  useEngineRevisionStore((state) => state.revision);
  const selection = useTimelineStore((state) => state.selection);
  const [currentTick, setCurrentTick] = useState<Tick>(kernel.playback.currentTick);

  useEffect(() => kernel.playback.onTick(setCurrentTick), [kernel]);

  const layerId = selection.layerIds[0];
  const layer = layerId ? kernel.layerEngine.registry.get(layerId) : undefined;

  if (!layer) {
    return (
      <aside className="flex items-center justify-center border-l border-editor-border bg-editor-surface p-4 text-xs text-editor-text-muted">
        No selection
      </aside>
    );
  }

  const schema = kernel.propertySchemaRegistry.getSchema(layer.type);

  const displayValue = (row: IPropertySchemaRow): unknown => {
    if (!row.animatable) {
      return getLayerPropertyValue(layer, row.key);
    }
    const evaluated = kernel.animationEngine.evaluateAt(layer.id, row.key, currentTick);
    return evaluated !== undefined ? evaluated : getLayerPropertyValue(layer, row.key);
  };

  const setProperty = (row: IPropertySchemaRow, value: unknown): void => {
    kernel.inspectorEditor.setLayerProperty({
      type: "SetLayerProperty",
      payload: { layerId: layer.id, propertyKey: row.key, value },
    });
  };

  const addKeyframe = (row: IPropertySchemaRow): void => {
    kernel.inspectorEditor.addKeyframe({
      type: "AddKeyframe",
      payload: {
        layerId: layer.id,
        layerType: layer.type,
        propertyKey: row.key,
        tick: currentTick,
        value: displayValue(row),
      },
    });
  };

  return (
    <aside className="flex flex-col gap-2 overflow-y-auto border-l border-editor-border bg-editor-surface p-3 text-xs">
      <h2 className="text-sm font-semibold">{layer.name}</h2>
      <span className="text-editor-text-muted">{layer.type}</span>

      {schema.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <label className="w-24 shrink-0 text-editor-text-muted">{row.label}</label>
          <PropertyEditor
            row={row}
            value={displayValue(row)}
            onChange={(value) => setProperty(row, value)}
          />
          {row.animatable && (
            <button
              type="button"
              title="Add keyframe"
              onClick={() => addKeyframe(row)}
              className="ml-auto shrink-0 text-editor-accent"
            >
              ◆
            </button>
          )}
        </div>
      ))}
    </aside>
  );
}

function PropertyEditor({
  row,
  value,
  onChange,
}: {
  row: IPropertySchemaRow;
  value: unknown;
  onChange: (value: unknown) => void;
}): JSX.Element {
  switch (row.editor) {
    case "toggle":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full rounded border border-editor-border bg-editor-bg px-1 py-0.5"
        />
      );
    case "color":
      return (
        <input
          type="color"
          value={typeof value === "string" ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-full"
        />
      );
    default:
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-editor-border bg-editor-bg px-1 py-0.5"
        />
      );
  }
}
