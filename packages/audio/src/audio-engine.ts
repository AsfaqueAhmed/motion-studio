import type { IAudioEngine, Tick, TrackId } from "@motion-studio/shared";
import type { IAudioClockSyncOptions } from "./synchronization";
import type { IAudioContext, IOfflineAudioContext } from "./audio-context";
import { Mixer } from "./mixer";
import { AudioTransport } from "./playback";

interface IRealtimeSession {
  readonly context: IAudioContext;
  readonly mixer: Mixer;
  readonly transport: AudioTransport;
}

/**
 * Lifecycle facade matching every other engine's `initialize/ready/
 * dispose` shape (CLAUDE.md "Engine ownership", `IEngine`). Owns the
 * `Mixer` (bus routing) and `AudioTransport` (tick sync) for the one
 * realtime session attached via `attachRealtimeContext` — the host app
 * hands in the real `AudioContext` because only it has the actual output
 * device/user-gesture-unlocked context (same host-owns-the-device split
 * as Rendering's `selectBackend`, `packages/rendering/src/backend-detection.ts`).
 *
 * Export renders (`buildOfflineMixer`) build an independent `Mixer`
 * against a caller-supplied `OfflineAudioContext` instead of reusing the
 * realtime one — Web Audio graphs are bound to the context that created
 * their nodes, so preview and export never share node instances, only the
 * same graph-construction code (`overview.md` "Preview vs. export").
 */
export class AudioEngine implements IAudioEngine {
  readonly name = "Audio";

  private readonly clockOptions: IAudioClockSyncOptions;
  private realtime: IRealtimeSession | null = null;

  constructor(clockOptions: IAudioClockSyncOptions) {
    this.clockOptions = clockOptions;
  }

  initialize(): void {}

  ready(): void {}

  dispose(): void {
    this.realtime = null;
  }

  attachRealtimeContext(context: IAudioContext): void {
    this.realtime = {
      context,
      mixer: new Mixer(context),
      transport: new AudioTransport(context, this.clockOptions),
    };
  }

  detachRealtimeContext(): void {
    this.realtime = null;
  }

  get mixer(): Mixer {
    return this.requireRealtime().mixer;
  }

  get transport(): AudioTransport {
    return this.requireRealtime().transport;
  }

  addTrack(trackId: TrackId): void {
    this.requireRealtime().mixer.addTrack(trackId);
  }

  /** Wired to Core's `Scheduler.onAudioSync(tick)` handler (`packages/core/src/scheduler.ts`). */
  onAudioSync(tick: Tick): boolean {
    return this.requireRealtime().transport.onAudioSync(tick);
  }

  /** Builds a fresh `Mixer` against an `OfflineAudioContext` for export rendering (9.2). */
  buildOfflineMixer(context: IOfflineAudioContext): Mixer {
    return new Mixer(context);
  }

  private requireRealtime(): IRealtimeSession {
    if (!this.realtime) {
      throw new Error(
        "AudioEngine: no realtime AudioContext attached — call attachRealtimeContext first",
      );
    }
    return this.realtime;
  }
}
