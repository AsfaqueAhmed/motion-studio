import { PropertyValueType, type LayerType } from "@motion-studio/shared";
import type { AnimatablePropertyRegistry } from "@motion-studio/animation";

export type PropertyEditorKind = "text" | "number" | "color" | "toggle";

export interface IPropertySchemaRow {
  readonly key: string;
  readonly label: string;
  readonly editor: PropertyEditorKind;
  /** Whether this key can carry keyframes (has an `AnimatablePropertyRegistry` entry) — drives the Inspector's diamond icon. */
  readonly animatable: boolean;
}

const LABELS: Readonly<Record<string, string>> = {
  name: "Name",
  visible: "Visible",
  locked: "Locked",
  "transform.x": "X Position",
  "transform.y": "Y Position",
  "transform.scaleX": "Scale X",
  "transform.scaleY": "Scale Y",
  "transform.rotation": "Rotation",
  opacity: "Opacity",
  fontSize: "Font Size",
  fontFamily: "Font",
  color: "Color",
  textAlign: "Text Align",
  content: "Text",
  fillColor: "Fill Color",
  strokeColor: "Stroke Color",
  strokeWidth: "Stroke Width",
  cornerRadius: "Corner Radius",
  volume: "Volume",
  playbackRate: "Playback Rate",
  fitMode: "Fit Mode",
};

function labelFor(key: string): string {
  return LABELS[key] ?? key.replace(/^transform\./, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function editorFor(valueType: PropertyValueType): PropertyEditorKind {
  switch (valueType) {
    case PropertyValueType.Number:
      return "number";
    case PropertyValueType.Color:
      return "color";
    case PropertyValueType.Boolean:
      return "toggle";
    default:
      return "text";
  }
}

const STATIC_ROWS: readonly IPropertySchemaRow[] = [
  { key: "name", label: labelFor("name"), editor: "text", animatable: false },
  { key: "visible", label: labelFor("visible"), editor: "toggle", animatable: false },
  { key: "locked", label: labelFor("locked"), editor: "toggle", animatable: false },
];

/**
 * Inspector's schema-driven Property System (PLAN.md 15.4,
 * `docs/17-ui/inspector.md`) — maps a `LayerType` to an ordered list of rows
 * to render. Reuses `AnimatablePropertyRegistry` (Animation Engine) as the
 * source of truth for which properties exist and their value type, rather
 * than re-declaring a second, possibly-drifting list; this registry only
 * adds UI concerns (label, editor widget, static/non-animatable fields)
 * on top. Distinct from `AnimatablePropertyRegistry` per GLOSSARY.md — see
 * that file for why the two aren't merged.
 */
export class PropertySchemaRegistry {
  constructor(private readonly animatableProperties: AnimatablePropertyRegistry) {}

  getSchema(layerType: LayerType): IPropertySchemaRow[] {
    const animatableRows = this.animatableProperties
      .getAll(layerType)
      .map((definition): IPropertySchemaRow => ({
        key: definition.propertyKey,
        label: labelFor(definition.propertyKey),
        editor: editorFor(definition.valueType),
        animatable: true,
      }));
    return [...STATIC_ROWS, ...animatableRows];
  }
}
