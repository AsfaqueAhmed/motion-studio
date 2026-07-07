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

/**
 * `Preset1080p30H264Opus` is the MVP preset per docs/24-roadmap/mvp.md Step
 * 1. The rest ship in Phase 10 alongside it — see docs/13-export/export-presets.md.
 * GIF is intentionally not a variant here: it isn't a WebCodecs/Mediabunny
 * target format at all (no video codec, needs palette quantization), so it
 * stays an open item rather than a fake enum value.
 */
export enum ExportPreset {
  Preset720p30H264Opus = "720p30-h264-opus",
  Preset1080p30H264Opus = "1080p30-h264-opus",
  Preset4K30H264Opus = "4k30-h264-opus",
  Preset1080p30VP9Opus = "1080p30-vp9-opus",
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

/**
 * See docs/16-plugin-system/lifecycle.md. `Validating` -> `RequestingPermissions`
 * -> `Registered` is `PluginRegistry.register()`; `Initializing` -> `Ready` is
 * `activate()`. `Suspended`/`Deactivated` were added in Phase 14 to cover
 * PLAN.md's "register -> activate -> suspend -> deactivate" — this enum
 * predates that phase (scaffolded in Phase 1) and only modeled the
 * register/activate half, so it's extended rather than replaced.
 */
export enum PluginLifecycleState {
  Validating = "Validating",
  RequestingPermissions = "RequestingPermissions",
  Registered = "Registered",
  Initializing = "Initializing",
  Ready = "Ready",
  Suspended = "Suspended",
  Deactivated = "Deactivated",
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

/**
 * The five media categories the Asset Manager catalogs (PLAN.md Phase 12
 * "Supported types"). One category can span several containers/codecs
 * (e.g. `Video` covers MP4/MOV/WebM) — see `docs/14-assets/overview.md`.
 */
export enum AssetType {
  Video = "Video",
  Image = "Image",
  Audio = "Audio",
  Font = "Font",
  LUT = "LUT",
}
