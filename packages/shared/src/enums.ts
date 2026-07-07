/** See docs/08-layer-engine/overview.md */
export enum LayerType {
  Video = "Video",
  Image = "Image",
  Audio = "Audio",
  Text = "Text",
  Sticker = "Sticker",
  Shape = "Shape",
  Group = "Group",
}

/** See docs/07-timeline-engine/tracks.md */
export enum TrackType {
  Video = "Video",
  Audio = "Audio",
  Text = "Text",
  Shape = "Shape",
  Sticker = "Sticker",
  Camera = "Camera",
  Guide = "Guide",
  Adjustment = "Adjustment",
  Effect = "Effect",
}

export enum PlaybackState {
  Idle = "Idle",
  Playing = "Playing",
  Paused = "Paused",
  Seeking = "Seeking",
}

/** See docs/06-animation-engine/interpolation.md */
export enum InterpolationType {
  Linear = "Linear",
  Bezier = "Bezier",
  Step = "Step",
}

/** See docs/06-animation-engine/property-system.md */
export enum PropertyValueType {
  Number = "Number",
  Vector2 = "Vector2",
  Vector3 = "Vector3",
  Color = "Color",
  Boolean = "Boolean",
  Text = "Text",
  Gradient = "Gradient",
  Matrix = "Matrix",
}

/** See docs/05-rendering-engine/overview.md (ADR-004) */
export enum RenderBackend {
  WebGPU = "WebGPU",
  WebGL2 = "WebGL2",
  Canvas2D = "Canvas2D",
  Software = "Software",
}

/** Single MVP preset per docs/24-roadmap/mvp.md Step 1. Extend as new presets ship. */
export enum ExportPreset {
  Preset1080p30H264Opus = "1080p30-h264-opus",
}

/** See docs/13-export/overview.md job state machine */
export enum ExportJobStatus {
  Queued = "Queued",
  Preparing = "Preparing",
  Rendering = "Rendering",
  Encoding = "Encoding",
  Muxing = "Muxing",
  Finished = "Finished",
  Cancelled = "Cancelled",
  Failed = "Failed",
}

/** See docs/11-ai/overview.md Capability Registry */
export enum AICapability {
  TextToSpeech = "TextToSpeech",
  BackgroundRemoval = "BackgroundRemoval",
  UpscaleImage = "UpscaleImage",
  SegmentPerson = "SegmentPerson",
  RemoveNoise = "RemoveNoise",
  EnhanceVoice = "EnhanceVoice",
}

/** See docs/16-plugin-system/overview.md lifecycle */
export enum PluginLifecycleState {
  Validating = "Validating",
  RequestingPermissions = "RequestingPermissions",
  Registered = "Registered",
  Initializing = "Initializing",
  Ready = "Ready",
}

/** See docs/09-effects-engine/overview.md */
export enum EffectType {
  GaussianBlur = "GaussianBlur",
  Glow = "Glow",
  DropShadow = "DropShadow",
  BlendMode = "BlendMode",
  ColorAdjustment = "ColorAdjustment",
  Transition = "Transition",
}

/** See docs/09-effects-engine/blend-modes.md — matches CSS `mix-blend-mode` names 1:1 where one exists. */
export enum BlendMode {
  Normal = "Normal",
  Multiply = "Multiply",
  Screen = "Screen",
  Overlay = "Overlay",
  SoftLight = "SoftLight",
  HardLight = "HardLight",
  Difference = "Difference",
  Darken = "Darken",
  Lighten = "Lighten",
  ColorDodge = "ColorDodge",
  ColorBurn = "ColorBurn",
}

/** See docs/09-effects-engine/transitions.md */
export enum TransitionType {
  CrossDissolve = "CrossDissolve",
  WipeLeft = "WipeLeft",
  WipeRight = "WipeRight",
  WipeUp = "WipeUp",
  WipeDown = "WipeDown",
}
