import type { IEngine } from "@motion-studio/shared";
import { EngineLifecycleState } from "./lifecycle";

/**
 * Global registry for resolved engine instances — the Engine Registry from
 * docs/04-core/core-overview.md. Engines resolve each other only through
 * this locator (by name/interface), never via a concrete import.
 */
export class ServiceLocator {
  private readonly engines = new Map<string, IEngine>();
  private readonly states = new Map<string, EngineLifecycleState>();

  register(engine: IEngine): void {
    if (this.engines.has(engine.name)) {
      throw new Error(`Engine "${engine.name}" is already registered.`);
    }
    this.engines.set(engine.name, engine);
    this.states.set(engine.name, EngineLifecycleState.Registered);
  }

  get<T extends IEngine>(name: string): T {
    const engine = this.engines.get(name);
    if (!engine) {
      throw new Error(`No engine registered under "${name}".`);
    }
    return engine as T;
  }

  has(name: string): boolean {
    return this.engines.has(name);
  }

  names(): readonly string[] {
    return Array.from(this.engines.keys());
  }

  getState(name: string): EngineLifecycleState {
    return this.states.get(name) ?? EngineLifecycleState.Unregistered;
  }

  setState(name: string, state: EngineLifecycleState): void {
    if (!this.engines.has(name)) {
      throw new Error(`Cannot set state for unregistered engine "${name}".`);
    }
    this.states.set(name, state);
  }
}
