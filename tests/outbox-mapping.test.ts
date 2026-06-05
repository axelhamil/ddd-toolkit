import { describe, expect, it } from 'vitest';
import { domainEventToOutboxRow, type IDomainEvent } from '../src/index.js';

const event: IDomainEvent<{ amount: number }> = {
  eventType: 'order.placed',
  dateOccurred: new Date('2024-01-01T00:00:00.000Z'),
  aggregateId: 'order-1',
  payload: { amount: 100 },
};

describe('domainEventToOutboxRow()', () => {
  it('maps an event to a CloudEvents-shaped outbox row', () => {
    const row = domainEventToOutboxRow(event, {
      source: 'orders-service',
      aggregateType: 'Order',
      organizationId: 'org-1',
      traceparent: '00-trace-span-01',
    });

    expect(row.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(row.eventType).toBe('order.placed');
    expect(row.aggregateId).toBe('order-1');
    expect(row.aggregateType).toBe('Order');
    expect(row.organizationId).toBe('org-1');
    expect(row.payload).toEqual({ amount: 100 });
    expect(row.occurredAt).toBe(event.dateOccurred);
    expect(row.metadata).toEqual({
      specversion: '1.0',
      source: 'orders-service',
      subject: 'order-1',
      traceparent: '00-trace-span-01',
      datacontenttype: 'application/json',
    });
  });

  it('defaults organizationId to null when omitted', () => {
    const row = domainEventToOutboxRow(event, {
      source: 'orders-service',
      aggregateType: 'Order',
    });

    expect(row.organizationId).toBeNull();
    expect(row.metadata.traceparent).toBeUndefined();
  });

  it('passes through an explicit null organizationId', () => {
    const row = domainEventToOutboxRow(event, {
      source: 'orders-service',
      aggregateType: 'Order',
      organizationId: null,
    });

    expect(row.organizationId).toBeNull();
  });

  it('generates a unique id per call', () => {
    const a = domainEventToOutboxRow(event, { source: 's', aggregateType: 'Order' });
    const b = domainEventToOutboxRow(event, { source: 's', aggregateType: 'Order' });

    expect(a.id).not.toBe(b.id);
  });
});
