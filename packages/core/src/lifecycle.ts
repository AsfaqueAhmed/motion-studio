/**
 * Canonical engine lifecycle, see docs/04-core/core-overview.md "Engine
 * lifecycle". Paused/Stopped are reserved for when an engine's public
 * interface grows pause()/stop() capabilities (none does yet) — the
 * registry never transitions an engine into those states today.
 */
export enum EngineLifecycleState {
  Unregistered = "Unregistered",
  Registered = "Registered",
  Initializing = "Initializing",
  Ready = "Ready",
  Paused = "Paused",
  Stopped = "Stopped",
  Disposed = "Disposed",
}
