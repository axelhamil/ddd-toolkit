import type { IDomainEvent } from '../domain/domain-event.js';
import type { Result } from '../primitives/result.js';

export type EventHandlerFn<T extends IDomainEvent = IDomainEvent> = (
  event: T,
) => Promise<Result<void>> | Result<void>;

/** Port for subscribing handlers to event types and dispatching events to them. */
export interface IEventDispatcher {
  subscribe<T extends IDomainEvent>(eventType: string, handler: EventHandlerFn<T>): Result<void>;

  unsubscribe(eventType: string, handler: EventHandlerFn): Result<void>;

  dispatch(event: IDomainEvent): Promise<Result<void>>;

  dispatchAll(events: IDomainEvent[]): Promise<Result<void>>;

  isSubscribed(eventType: string): boolean;

  getHandlerCount(eventType: string): number;

  clearHandlers(): void;
}
