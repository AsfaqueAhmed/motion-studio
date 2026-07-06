import type { IEngine } from "@motion-studio/shared";
import { Container, type IContainer } from "./container";
import { EventBus } from "./event-bus";
import { EngineLifecycleState } from "./lifecycle";
import { ServiceLocator } from "./service-locator";
import { WorkerManager } from "./worker-manager";

export interface IAppEngineDependencies {
  container?: IContainer;
  services?: ServiceLocator;
  events?: EventBus;
  workers?: WorkerManager;
}

/**
 * Top-level bootstrap. Owns engine lifecycle: register engines, then
 * initialize() every engine, then ready() every engine, in registration
 * order; shutdown disposes in reverse order. Plugin loading and project
 * opening (see docs/04-core/core-overview.md "Application lifecycle") land
 * in Phase 14 and Phase 3 respectively — this is the seam those phases
 * hook into, not reimplemented here speculatively.
 */
export class AppEngine {
  readonly container: IContainer;
  readonly services: ServiceLocator;
  readonly events: EventBus;
  readonly workers: WorkerManager;

  private readonly registrationOrder: string[] = [];
  private started = false;

  constructor(dependencies: IAppEngineDependencies = {}) {
    this.container = dependencies.container ?? new Container();
    this.services = dependencies.services ?? new ServiceLocator();
    this.events = dependencies.events ?? new EventBus();
    this.workers = dependencies.workers ?? new WorkerManager();
  }

  registerEngine(engine: IEngine): void {
    if (this.started) {
      throw new Error(`Cannot register engine "${engine.name}" after AppEngine has started.`);
    }
    this.services.register(engine);
    this.registrationOrder.push(engine.name);
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    for (const name of this.registrationOrder) {
      this.services.setState(name, EngineLifecycleState.Initializing);
      await this.services.get(name).initialize();
    }
    for (const name of this.registrationOrder) {
      await this.services.get(name).ready();
      this.services.setState(name, EngineLifecycleState.Ready);
    }
  }

  async shutdown(): Promise<void> {
    for (const name of [...this.registrationOrder].reverse()) {
      await this.services.get(name).dispose();
      this.services.setState(name, EngineLifecycleState.Disposed);
    }
    this.workers.terminateAll();
    this.started = false;
  }
}
