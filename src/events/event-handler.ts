import type { IDomainEvent } from '../domain/domain-event.js';
import type { Result } from '../primitives/result.js';

/** A class-style handler bound to a single event type. */
export interface IEventHandler<T extends IDomainEvent = IDomainEvent> {
  readonly eventType: string;
  handle(event: T): Promise<Result<void>>;
}
