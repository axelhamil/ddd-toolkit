import { AsyncLocalStorage } from 'node:async_hooks';
import type { IDomainEvent } from '../domain/domain-event.js';

type CollectorContext = {
  events: IDomainEvent[];
};

/** Sink invoked when events are added outside an active collector context. */
export type OutOfContextLogger = (message: string, meta?: Record<string, unknown>) => void;

const storage = new AsyncLocalStorage<CollectorContext>();

let outOfContextLogger: OutOfContextLogger | null = null;

/**
 * Ambient, request-scoped buffer for domain events backed by `AsyncLocalStorage`.
 * Run work inside `runWithContext`; aggregates `add` events as they happen, and a
 * unit of work `drain`s them once before commit. Isolated per async context, so
 * concurrent requests never see each other's events.
 */
export const EventCollector = {
  runWithContext<T>(callback: () => Promise<T>): Promise<T> {
    return storage.run({ events: [] }, callback);
  },

  add(events: IDomainEvent | IDomainEvent[]): void {
    const ctx = storage.getStore();
    if (!ctx) {
      const list = Array.isArray(events) ? events : [events];
      if (list.length > 0) {
        outOfContextLogger?.('EventCollector.add called outside runWithContext — events lost', {
          eventTypes: list.map((e) => e.eventType),
          aggregateIds: list.map((e) => e.aggregateId),
        });
      }
      return;
    }
    if (Array.isArray(events)) ctx.events.push(...events);
    else ctx.events.push(events);
  },

  drain(): IDomainEvent[] {
    const ctx = storage.getStore();
    if (!ctx) return [];
    const drained = ctx.events.slice();
    ctx.events.length = 0;
    return drained;
  },

  hasContext(): boolean {
    return storage.getStore() !== undefined;
  },

  setOutOfContextLogger(fn: OutOfContextLogger | null): void {
    outOfContextLogger = fn;
  },
};
