/** The shape of every domain event: what happened, to which aggregate, when. */
export interface IDomainEvent<T = unknown> {
  readonly eventType: string;
  readonly dateOccurred: Date;
  readonly aggregateId: string;
  readonly payload: T;
}

/** Convenience base that stamps `dateOccurred` for you; subclasses set the rest. */
export abstract class BaseDomainEvent<T = unknown> implements IDomainEvent<T> {
  readonly dateOccurred: Date;
  abstract readonly eventType: string;
  abstract readonly aggregateId: string;
  abstract readonly payload: T;

  constructor() {
    this.dateOccurred = new Date();
  }
}
