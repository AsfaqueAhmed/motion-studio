import type { AppEvent, AppEventMap, AppEventType } from "@motion-studio/shared";

export type EventListener<T extends AppEventType> = (event: AppEvent<T>) => void;
export type AsyncEventListener<T extends AppEventType> = (
  event: AppEvent<T>,
) => void | Promise<void>;

/**
 * Typed publish/subscribe bus for coarse notifications (selection changed,
 * export finished, etc). Not the per-frame hot path — see Scheduler for
 * that direct call chain. Every listener declares its exact event type;
 * there is no wildcard subscription mechanism. See
 * docs/04-core/core-overview.md and CLAUDE.md "Canonical names".
 */
export class EventBus {
  private readonly listeners = new Map<AppEventType, Set<AsyncEventListener<AppEventType>>>();

  on<T extends AppEventType>(
    type: T,
    listener: EventListener<T> | AsyncEventListener<T>,
  ): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as AsyncEventListener<AppEventType>);
    return () => this.off(type, listener);
  }

  off<T extends AppEventType>(type: T, listener: EventListener<T> | AsyncEventListener<T>): void {
    this.listeners.get(type)?.delete(listener as AsyncEventListener<AppEventType>);
  }

  /** Synchronous dispatch. Async listeners run, but their promises are not awaited. */
  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void {
    const event = { type, payload, timestamp: Date.now() } as AppEvent<T>;
    for (const listener of this.listenersFor(type)) {
      try {
        void listener(event);
      } catch (error) {
        this.reportListenerError(type, error);
      }
    }
  }

  /** Dispatch and await every listener, so callers can wait for async side effects. */
  async emitAsync<T extends AppEventType>(type: T, payload: AppEventMap[T]): Promise<void> {
    const event = { type, payload, timestamp: Date.now() } as AppEvent<T>;
    const results = await Promise.allSettled(
      this.listenersFor(type).map((listener) => listener(event)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        this.reportListenerError(type, result.reason);
      }
    }
  }

  private listenersFor<T extends AppEventType>(type: T): AsyncEventListener<T>[] {
    const set = this.listeners.get(type);
    return set ? (Array.from(set) as AsyncEventListener<T>[]) : [];
  }

  private reportListenerError(type: AppEventType, error: unknown): void {
    // A single failing listener must not break the bus or other listeners.
    // Centralized error reporting policy is an open item in
    // docs/04-core/core-overview.md; console.error is the placeholder sink.
    console.error(`[EventBus] listener for "${type}" threw:`, error);
  }
}
