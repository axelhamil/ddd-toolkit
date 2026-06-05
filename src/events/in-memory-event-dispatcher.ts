import type { IDomainEvent } from '../domain/domain-event.js';
import { Result } from '../primitives/result.js';
import type { EventHandlerFn, IEventDispatcher } from './event-dispatcher.js';

/** Optional error sink so the dispatcher never swallows handler failures silently. */
export interface EventDispatcherLogger {
  error(message: string, error?: unknown): void;
}

/**
 * Synchronous in-process `IEventDispatcher`. A failing or throwing handler never
 * aborts the others — it is reported through the injected logger. Suitable for
 * tests and single-process apps; swap it for a real bus in distributed setups.
 */
export class InMemoryEventDispatcher implements IEventDispatcher {
  private handlers: Map<string, EventHandlerFn[]> = new Map();
  private logger: EventDispatcherLogger | null = null;

  setLogger(logger: EventDispatcherLogger | null): void {
    this.logger = logger;
  }

  private log(message: string, error?: unknown): void {
    if (error !== undefined) this.logger?.error(message, error);
    else this.logger?.error(message);
  }

  subscribe<T extends IDomainEvent>(eventType: string, handler: EventHandlerFn<T>): Result<void> {
    try {
      const existing = this.handlers.get(eventType) ?? [];
      this.handlers.set(eventType, [...existing, handler as EventHandlerFn]);
      return Result.ok();
    } catch (_error) {
      return Result.fail('SUBSCRIPTION_FAILED');
    }
  }

  unsubscribe(eventType: string, handler: EventHandlerFn): Result<void> {
    try {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
          this.handlers.set(eventType, handlers);
        }
      }
      return Result.ok();
    } catch (_error) {
      return Result.fail('UNSUBSCRIPTION_FAILED');
    }
  }

  async dispatch(event: IDomainEvent): Promise<Result<void>> {
    try {
      const handlers = this.handlers.get(event.eventType) ?? [];

      for (const handler of handlers) {
        try {
          const result = handler(event);

          if (result instanceof Promise) {
            const awaitedResult = await result;
            if (awaitedResult.isFailure) {
              this.log(`Event handler failed: ${awaitedResult.getError()}`);
            }
          } else if (result.isFailure) {
            this.log(`Event handler failed: ${result.getError()}`);
          }
        } catch (error) {
          this.log('Event handler threw exception:', error);
        }
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`DISPATCH_FAILED: ${error}`);
    }
  }

  async dispatchAll(events: IDomainEvent[]): Promise<Result<void>> {
    try {
      for (const event of events) {
        await this.dispatch(event);
      }
      return Result.ok();
    } catch (error) {
      return Result.fail(`DISPATCH_FAILED: ${error}`);
    }
  }

  isSubscribed(eventType: string): boolean {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.length > 0 : false;
  }

  getHandlerCount(eventType: string): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.length : 0;
  }

  clearHandlers(): void {
    this.handlers.clear();
  }
}
