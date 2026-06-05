import { describe, expect, it } from 'vitest';
import { AppErrorException, type ErrorCode, httpStatusFromCode } from '../src/index.js';

describe('httpStatusFromCode()', () => {
  it.each([
    ['SESSION_UNAUTHORIZED', 401],
    ['AUTH_REQUIRED', 401],
    ['ACCESS_FORBIDDEN', 403],
    ['USER_NOT_FOUND', 404],
    ['EMAIL_CONFLICT', 409],
    ['ACCOUNT_BLOCKED', 409],
    ['INPUT_INVALID', 400],
    ['CHECKSUM_INTEGRITY_FAILED', 422],
    ['API_RATE_LIMITED', 429],
    ['PAYMENT_PROVIDER_FAILURE', 502],
    ['SERVICE_UNAVAILABLE', 503],
    ['REQUEST_TIMEOUT', 504],
  ] satisfies [ErrorCode, number][])('maps %s to %i', (code, status) => {
    expect(httpStatusFromCode(code)).toBe(status);
  });

  it('throws on a code with no recognised suffix', () => {
    expect(() => httpStatusFromCode('WEIRD_THING' as ErrorCode)).toThrow(/no recognised suffix/);
  });
});

describe('AppErrorException', () => {
  it('carries code, message and metadata', () => {
    const exception = new AppErrorException({
      code: 'USER_NOT_FOUND',
      message: 'No such user',
      metadata: { userId: '42' },
    });

    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe('AppErrorException');
    expect(exception.message).toBe('No such user');
    expect(exception.code).toBe('USER_NOT_FOUND');
    expect(exception.metadata).toEqual({ userId: '42' });
  });

  it('allows omitting metadata', () => {
    const exception = new AppErrorException({
      code: 'EMAIL_CONFLICT',
      message: 'Already taken',
    });

    expect(exception.metadata).toBeUndefined();
  });
});
