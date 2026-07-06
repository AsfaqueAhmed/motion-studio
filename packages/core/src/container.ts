/**
 * Lightweight DI container. Constructor injection via factories that pull
 * their own dependencies from the container — no decorators, no reflection.
 * See PLAN.md Phase 2.1.
 */
export type Token<T> = symbol & { readonly __type?: T };

export function createToken<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

export type Factory<T> = (container: IContainer) => T;

export interface IContainer {
  register<T>(token: Token<T>, factory: Factory<T>): void;
  resolve<T>(token: Token<T>): T;
  has(token: Token<unknown>): boolean;
}

export class Container implements IContainer {
  private readonly factories = new Map<symbol, Factory<unknown>>();
  private readonly instances = new Map<symbol, unknown>();

  register<T>(token: Token<T>, factory: Factory<T>): void {
    this.factories.set(token, factory as Factory<unknown>);
    this.instances.delete(token);
  }

  resolve<T>(token: Token<T>): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }
    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`No registration found for token "${token.toString()}".`);
    }
    const instance = factory(this);
    this.instances.set(token, instance);
    return instance as T;
  }

  has(token: Token<unknown>): boolean {
    return this.factories.has(token);
  }
}
