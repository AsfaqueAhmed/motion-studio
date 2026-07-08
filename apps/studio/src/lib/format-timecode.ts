import { ticksToSeconds, type Tick } from "@motion-studio/shared";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** `MM:SS:FF` timecode readout for the playback bar / timeline ruler. */
export function formatTimecode(tick: Tick, fps: number): string {
  const totalSeconds = ticksToSeconds(tick, fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds - Math.floor(totalSeconds)) * fps);
  return `${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}
