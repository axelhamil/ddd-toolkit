import { randomUUID } from 'node:crypto';

/**
 * Generate a UUID v7 string: time-ordered, so values sort by creation time —
 * ideal for primary keys that stay roughly sequential.
 */
export function uuidv7(): string {
  const ms = Date.now();
  const msHex = ms.toString(16).padStart(12, '0');
  const rand = new Uint8Array(10);
  globalThis.crypto.getRandomValues(rand);
  // biome-ignore lint/style/noNonNullAssertion: fixed-length Uint8Array indexing
  rand[0] = (rand[0]! & 0x0f) | 0x70;
  // biome-ignore lint/style/noNonNullAssertion: fixed-length Uint8Array indexing
  rand[2] = (rand[2]! & 0x3f) | 0x80;
  let randHex = '';
  for (const b of rand) randHex += b.toString(16).padStart(2, '0');
  return [
    msHex.slice(0, 8),
    msHex.slice(8, 12),
    randHex.slice(0, 4),
    randHex.slice(4, 8),
    randHex.slice(8, 20),
  ].join('-');
}

/**
 * Typed identifier wrapper. Defaults to a fresh UUID v7 when constructed without
 * a value. Subclass it to get nominal id types (e.g. `class OrderId extends UUID`).
 */
export class UUID<T extends string | number> {
  protected readonly _value: T;

  constructor(value?: T) {
    this._value = value ?? (uuidv7() as T);
  }

  public get value(): T {
    return this._value;
  }

  /** Identity equality by value, narrowed to the same concrete id subclass. */
  equals(id?: UUID<T>): boolean {
    if (id === null || id === undefined) {
      return false;
    }
    if (!(id instanceof this.constructor)) {
      return false;
    }
    return id.value === this.value;
  }
}

/** Generate a random UUID v4 string (not time-ordered). */
export function randomUuidV4(): string {
  return randomUUID();
}
