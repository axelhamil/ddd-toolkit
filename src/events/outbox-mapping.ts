import type { IDomainEvent } from '../domain/domain-event.js';
import { uuidv7 } from '../primitives/uuid.js';

/** A CloudEvents-shaped row ready to be inserted into a transactional outbox. */
export type OutboxRow = {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  organizationId: string | null;
  payload: unknown;
  metadata: {
    specversion: '1.0';
    source: string;
    subject?: string;
    traceparent?: string;
    datacontenttype: 'application/json';
  };
  occurredAt: Date;
};

export type OutboxMappingScope = {
  source: string;
  organizationId?: string | null;
  aggregateType: string;
  traceparent?: string;
};

/** Map a domain event to an outbox row, enriching it with CloudEvents metadata. */
export function domainEventToOutboxRow(event: IDomainEvent, scope: OutboxMappingScope): OutboxRow {
  return {
    id: uuidv7(),
    eventType: event.eventType,
    aggregateId: event.aggregateId,
    aggregateType: scope.aggregateType,
    organizationId: scope.organizationId ?? null,
    payload: event.payload,
    metadata: {
      specversion: '1.0',
      source: scope.source,
      subject: event.aggregateId,
      traceparent: scope.traceparent,
      datacontenttype: 'application/json',
    },
    occurredAt: event.dateOccurred,
  };
}
