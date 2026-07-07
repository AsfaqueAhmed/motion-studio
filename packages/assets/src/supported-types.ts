import { AssetType } from "@motion-studio/shared";

/**
 * Extension is the primary signal, not MIME type: drag-and-drop and OPFS
 * file handles frequently hand back an empty or generic `File.type` for
 * less common formats (fonts, `.cube` LUTs almost always report `""`), so
 * MIME is only consulted as a fallback. See PLAN.md Phase 12 "Supported
 * types" and `docs/14-assets/overview.md`.
 */
const EXTENSION_TYPE_MAP: Readonly<Record<string, AssetType>> = {
  mp4: AssetType.Video,
  mov: AssetType.Video,
  webm: AssetType.Video,
  mp3: AssetType.Audio,
  wav: AssetType.Audio,
  ogg: AssetType.Audio,
  png: AssetType.Image,
  jpg: AssetType.Image,
  jpeg: AssetType.Image,
  webp: AssetType.Image,
  svg: AssetType.Image,
  gif: AssetType.Image,
  ttf: AssetType.Font,
  otf: AssetType.Font,
  woff: AssetType.Font,
  woff2: AssetType.Font,
  cube: AssetType.LUT,
};

const MIME_TYPE_MAP: Readonly<Record<string, AssetType>> = {
  "video/mp4": AssetType.Video,
  "video/quicktime": AssetType.Video,
  "video/webm": AssetType.Video,
  "audio/mpeg": AssetType.Audio,
  "audio/wav": AssetType.Audio,
  "audio/x-wav": AssetType.Audio,
  "audio/ogg": AssetType.Audio,
  "image/png": AssetType.Image,
  "image/jpeg": AssetType.Image,
  "image/webp": AssetType.Image,
  "image/svg+xml": AssetType.Image,
  "image/gif": AssetType.Image,
  "font/ttf": AssetType.Font,
  "font/otf": AssetType.Font,
  "font/woff": AssetType.Font,
  "font/woff2": AssetType.Font,
};

/** Returns `undefined` for anything outside PLAN.md Phase 12's supported-type list. */
export function detectAssetType(fileName: string, mimeType: string): AssetType | undefined {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension && extension in EXTENSION_TYPE_MAP) {
    return EXTENSION_TYPE_MAP[extension];
  }
  return MIME_TYPE_MAP[mimeType.toLowerCase()];
}
