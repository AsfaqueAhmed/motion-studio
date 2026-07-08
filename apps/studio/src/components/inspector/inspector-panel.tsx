"use client";

import { useEffect, useRef, useState } from "react";
import type { Tick } from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import { useTimelineStore } from "../../state/use-timeline-store";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import { getLayerPropertyValue } from "../../editor-kernel/layer-property-path";
import type { IPropertySchemaRow } from "../../editor-kernel/property-schema-registry";

/** How long to wait after the last change to a field before it actually commits (and creates/updates a keyframe, if animated) — see `setProperty`'s doc comment. */
const COMMIT_DEBOUNCE_MS = 1000;

/**
 * Schema-driven Property System (PLAN.md 15.4). Displayed values are the
 * live-evaluated value at the current playhead tick when a keyframe track
 * exists, falling back to the Layer's static value otherwise — editing
 * writes through `SetLayerPropertyIntent` (`InspectorEditorService`),
 * which itself decides whether that lands on the static field or a
 * keyframe. Inline validation here is a UX convenience only; real
 * enforcement lives in the Command handlers (`UpdateLayerCommand`/
 * `AddKeyframeCommand`/`ModifyKeyframeCommand`), per CLAUDE.md.
 *
 * Renders as a floating overlay rather than docked chrome — `EditorShell`
 * only mounts this when there's a selection, matching the CapCut-style
 * reskin's reference screenshot (no persistent right panel).
 */
export function InspectorPanel(): JSX.Element {
  const kernel = useEditorKernel();
  useEngineRevisionStore((state) => state.revision);
  const selection = useTimelineStore((state) => state.selection);
  const [currentTick, setCurrentTick] = useState<Tick>(kernel.playback.currentTick);
  // Keyed by `${layerId}:${propertyKey}` so two layers sharing a property
  // key (e.g. both have "transform.x") never bleed pending values into
  // each other. Values here are what the field shows *right now*; commits
  // (and therefore keyframe creation) only happen once the debounce timer
  // below actually fires.
  const [pendingValues, setPendingValues] = useState<Map<string, unknown>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => kernel.playback.onTick(setCurrentTick), [kernel]);

  const layerId = selection.layerIds[0];
  const layer = layerId ? kernel.layerEngine.registry.get(layerId) : undefined;

  if (!layer) {
    return <></>;
  }

  const schema = kernel.propertySchemaRegistry.getSchema(layer.type);

  const displayValue = (row: IPropertySchemaRow): unknown => {
    const pendingKey = `${layer.id}:${row.key}`;
    if (pendingValues.has(pendingKey)) {
      return pendingValues.get(pendingKey);
    }
    if (!row.animatable) {
      return getLayerPropertyValue(layer, row.key);
    }
    const evaluated = kernel.animationEngine.evaluateAt(layer.id, row.key, currentTick);
    return evaluated !== undefined ? evaluated : getLayerPropertyValue(layer, row.key);
  };

  /**
   * Debounced commit: every change updates the field's own display
   * immediately (so typing/dragging feels instant), but the actual write —
   * and, for an animated property, the keyframe add/update this now
   * implies (`InspectorEditorService.setLayerProperty`) — only happens
   * once a full second passes with no further change to this field.
   * Without this, every keystroke/spinner click on an animated property
   * created or moved a keyframe by itself, cluttering the timeline with
   * one per intermediate value instead of one for the value the user
   * actually settled on.
   */
  const setProperty = (row: IPropertySchemaRow, value: unknown): void => {
    const pendingKey = `${layer.id}:${row.key}`;
    setPendingValues((previous) => new Map(previous).set(pendingKey, value));

    const existingTimer = timersRef.current.get(pendingKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      timersRef.current.delete(pendingKey);
      kernel.inspectorEditor.setLayerProperty({
        type: "SetLayerProperty",
        payload: { layerId: layer.id, propertyKey: row.key, value, tick: currentTick },
      });
      setPendingValues((previous) => {
        const next = new Map(previous);
        next.delete(pendingKey);
        return next;
      });
    }, COMMIT_DEBOUNCE_MS);
    timersRef.current.set(pendingKey, timer);
  };

  return (
    <aside className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-64 flex-col gap-2 overflow-y-auto rounded-xl border border-editor-border bg-editor-surface p-3 text-xs shadow-2xl shadow-black/50">
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
        </div>
      ))}
    </aside>
  );
}

/**
 * Display-only rounding — the stored value keeps full precision (contain-fit
 * centering, e.g. `compositionWidth / 2` or `assetWidth / 2`, genuinely
 * lands on a fraction for an odd dimension; that's correct math, not a bug),
 * this just keeps the Inspector's number fields from showing long floating
 * point noise.
 */
function roundForDisplay(value: number): number {
  return Math.round(value * 100) / 100;
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
          value={typeof value === "number" ? roundForDisplay(value) : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full rounded border border-editor-border bg-editor-bg px-1 py-0.5"
        />
      );
    case "angle":
      // Stored/evaluated in radians (every render backend takes
      // `transform.rotation` as-is), but degrees is what anyone typing a
      // number into this field actually means.
      return (
        <input
          type="number"
          value={typeof value === "number" ? roundForDisplay((value * 180) / Math.PI) : 0}
          onChange={(event) => onChange((Number(event.target.value) * Math.PI) / 180)}
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
