import type { UUID } from '../primitives/uuid.js';
import type { IDomainEvent } from './domain-event.js';
import { Entity } from './entity.js';

export interface IAggregate {
  readonly domainEvents: IDomainEvent[];
  clearEvents(): void;
}

/**
 * An aggregate root: the entity that owns a consistency boundary and records
 * domain events. Mutating methods append events via `addEvent`; infrastructure
 * later drains them with `pullDomainEvents()`.
 */
export abstract class Aggregate<T> extends Entity<T> implements IAggregate {
  private _domainEvents: IDomainEvent[] = [];

  protected constructor(props: T, id?: UUID<string | number>) {
    super(props, id);
  }

  /** A defensive copy of the pending events. */
  public get domainEvents(): IDomainEvent[] {
    return [...this._domainEvents];
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }

  /** Return the pending events and clear them atomically. */
  public pullDomainEvents(): IDomainEvent[] {
    const drained = [...this._domainEvents];
    this._domainEvents = [];
    return drained;
  }

  protected addEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }

  public hasEvents(): boolean {
    return this._domainEvents.length > 0;
  }

  public getEventCount(): number {
    return this._domainEvents.length;
  }

  protected addEvents(events: IDomainEvent[]): void {
    for (const event of events) {
      this.addEvent(event);
    }
  }
}
