import type { IDomainEvent } from '../domain/domain-event.js';

export const EVENT_HANDLER_SYMBOL: unique symbol = Symbol.for('aggregate-kit/event-handler');

/** A dependency-injected event handler tagged with a brand symbol for detection. */
export type EventHandler<T extends IDomainEvent = IDomainEvent> = {
  readonly [EVENT_HANDLER_SYMBOL]: true;
  readonly eventType: string;
  readonly handle: (event: T) => Promise<void>;
};

/**
 * Factory for DI-friendly event handlers: `onEvent(type, deps => event => ...)`
 * returns a function that, given `deps`, produces a branded `EventHandler`.
 */
export function onEvent<T extends IDomainEvent, TDeps>(
  eventType: string,
  factory: (deps: TDeps) => (event: T) => Promise<void>,
): (deps: TDeps) => EventHandler<T> {
  return (deps) => ({
    [EVENT_HANDLER_SYMBOL]: true as const,
    eventType,
    handle: factory(deps),
  });
}

/** Type guard recognizing handlers produced by `onEvent`. */
export function isEventHandler(value: unknown): value is EventHandler {
  return (
    typeof value === 'object' &&
    value !== null &&
    EVENT_HANDLER_SYMBOL in value &&
    (value as EventHandler)[EVENT_HANDLER_SYMBOL] === true
  );
}
