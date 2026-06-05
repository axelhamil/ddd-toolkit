import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type EventDispatcherLogger,
  type IDomainEvent,
  InMemoryEventDispatcher,
  Result,
} from '../src/index.js';

class TestEvent implements IDomainEvent<{ value: number }> {
  readonly eventType: string;
  readonly dateOccurred = new Date();
  readonly aggregateId = 'agg-1';
  readonly payload: { value: number };

  constructor(eventType: string, value: number) {
    this.eventType = eventType;
    this.payload = { value };
  }
}

describe('InMemoryEventDispatcher', () => {
  let dispatcher: InMemoryEventDispatcher;

  beforeEach(() => {
    dispatcher = new InMemoryEventDispatcher();
  });

  describe('subscribe() / isSubscribed() / getHandlerCount()', () => {
    it('registers a handler', () => {
      const result = dispatcher.subscribe('user.created', async () => Result.ok());

      expect(result.isSuccess).toBe(true);
      expect(dispatcher.isSubscribed('user.created')).toBe(true);
      expect(dispatcher.getHandlerCount('user.created')).toBe(1);
    });

    it('accumulates multiple handlers for the same event', () => {
      dispatcher.subscribe('user.created', async () => Result.ok());
      dispatcher.subscribe('user.created', async () => Result.ok());

      expect(dispatcher.getHandlerCount('user.created')).toBe(2);
    });

    it('reports unknown events as not subscribed', () => {
      expect(dispatcher.isSubscribed('nope')).toBe(false);
      expect(dispatcher.getHandlerCount('nope')).toBe(0);
    });
  });

  describe('dispatch()', () => {
    it('invokes a synchronous handler', async () => {
      const handler = vi.fn(() => Result.ok<void>());
      dispatcher.subscribe('user.created', handler);

      const result = await dispatcher.dispatch(new TestEvent('user.created', 1));

      expect(result.isSuccess).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('invokes an asynchronous handler', async () => {
      const handler = vi.fn(async () => Result.ok<void>());
      dispatcher.subscribe('user.created', handler);

      await dispatcher.dispatch(new TestEvent('user.created', 1));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('succeeds with no registered handlers', async () => {
      const result = await dispatcher.dispatch(new TestEvent('user.created', 1));

      expect(result.isSuccess).toBe(true);
    });

    it('logs a failing synchronous handler without aborting others', async () => {
      const logger: EventDispatcherLogger = { error: vi.fn() };
      dispatcher.setLogger(logger);
      const second = vi.fn(() => Result.ok<void>());
      dispatcher.subscribe('user.created', () => Result.fail('SYNC_FAILED'));
      dispatcher.subscribe('user.created', second);

      const result = await dispatcher.dispatch(new TestEvent('user.created', 1));

      expect(result.isSuccess).toBe(true);
      expect(second).toHaveBeenCalledOnce();
      expect(logger.error).toHaveBeenCalledWith('Event handler failed: SYNC_FAILED');
    });

    it('logs a failing asynchronous handler', async () => {
      const logger: EventDispatcherLogger = { error: vi.fn() };
      dispatcher.setLogger(logger);
      dispatcher.subscribe('user.created', async () => Result.fail('ASYNC_FAILED'));

      await dispatcher.dispatch(new TestEvent('user.created', 1));

      expect(logger.error).toHaveBeenCalledWith('Event handler failed: ASYNC_FAILED');
    });

    it('logs a throwing handler', async () => {
      const logger: EventDispatcherLogger = { error: vi.fn() };
      dispatcher.setLogger(logger);
      const boom = new Error('boom');
      dispatcher.subscribe('user.created', () => {
        throw boom;
      });

      const result = await dispatcher.dispatch(new TestEvent('user.created', 1));

      expect(result.isSuccess).toBe(true);
      expect(logger.error).toHaveBeenCalledWith('Event handler threw exception:', boom);
    });

    it('does not throw when no logger is set and a handler fails', async () => {
      dispatcher.subscribe('user.created', () => Result.fail('SILENT'));

      const result = await dispatcher.dispatch(new TestEvent('user.created', 1));

      expect(result.isSuccess).toBe(true);
    });

    it('fails when reading the event type throws', async () => {
      const brokenEvent = {
        dateOccurred: new Date(),
        aggregateId: 'x',
        payload: undefined,
        get eventType(): string {
          throw new Error('no type');
        },
      } as unknown as IDomainEvent;

      const result = await dispatcher.dispatch(brokenEvent);

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toContain('DISPATCH_FAILED');
    });
  });

  describe('dispatchAll()', () => {
    it('dispatches every event in order', async () => {
      const seen: number[] = [];
      dispatcher.subscribe('user.created', (event) => {
        seen.push((event.payload as { value: number }).value);
        return Result.ok();
      });

      const result = await dispatcher.dispatchAll([
        new TestEvent('user.created', 1),
        new TestEvent('user.created', 2),
      ]);

      expect(result.isSuccess).toBe(true);
      expect(seen).toEqual([1, 2]);
    });
  });

  describe('unsubscribe()', () => {
    it('removes a registered handler', () => {
      const handler = async () => Result.ok<void>();
      dispatcher.subscribe('user.created', handler);

      const result = dispatcher.unsubscribe('user.created', handler);

      expect(result.isSuccess).toBe(true);
      expect(dispatcher.getHandlerCount('user.created')).toBe(0);
    });

    it('is a no-op for an unknown event type', () => {
      const result = dispatcher.unsubscribe('nope', async () => Result.ok());

      expect(result.isSuccess).toBe(true);
    });

    it('is a no-op when the handler is not registered', () => {
      dispatcher.subscribe('user.created', async () => Result.ok());

      const result = dispatcher.unsubscribe('user.created', async () => Result.ok());

      expect(result.isSuccess).toBe(true);
      expect(dispatcher.getHandlerCount('user.created')).toBe(1);
    });
  });

  describe('clearHandlers()', () => {
    it('removes all handlers', () => {
      dispatcher.subscribe('a', async () => Result.ok());
      dispatcher.subscribe('b', async () => Result.ok());

      dispatcher.clearHandlers();

      expect(dispatcher.isSubscribed('a')).toBe(false);
      expect(dispatcher.isSubscribed('b')).toBe(false);
    });
  });

  describe('setLogger()', () => {
    it('can clear a previously set logger', async () => {
      const logger: EventDispatcherLogger = { error: vi.fn() };
      dispatcher.setLogger(logger);
      dispatcher.setLogger(null);
      dispatcher.subscribe('user.created', () => Result.fail('NOPE'));

      await dispatcher.dispatch(new TestEvent('user.created', 1));

      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
