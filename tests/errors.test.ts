import { describe, expect, it } from 'vitest';
import { DatabaseOperationError, InputParseError } from '../src/index.js';

describe('DatabaseOperationError', () => {
  it('preserves message, name and cause', () => {
    const cause = new Error('connection reset');
    const error = new DatabaseOperationError('insert failed', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DatabaseOperationError');
    expect(error.message).toBe('insert failed');
    expect(error.cause).toBe(cause);
    expect(error.options.cause).toBe(cause);
  });
});

describe('InputParseError', () => {
  it('preserves message, name and cause', () => {
    const cause = new Error('expected string');
    const error = new InputParseError('invalid payload', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InputParseError');
    expect(error.message).toBe('invalid payload');
    expect(error.cause).toBe(cause);
    expect(error.options.cause).toBe(cause);
  });
});
