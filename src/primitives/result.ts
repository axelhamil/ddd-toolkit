/**
 * A success-or-failure container that makes error handling explicit in the type
 * system. Domain and application code returns `Result` instead of throwing.
 */
export class Result<T, E = string> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(isSuccess: boolean, value?: T, error?: E) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._value = value;
    this._error = error;
  }

  /** Unwrap the success value. Throws if called on a failure. */
  public getValue(): T {
    if (!this.isSuccess) throw new Error("Can't get value from failure result");

    // biome-ignore lint/style/noNonNullAssertion: safe after isSuccess check
    return this._value!;
  }

  /** Unwrap the error. Throws if called on a success. */
  public getError(): E {
    if (this.isSuccess) throw new Error("Can't get error from success result");

    // biome-ignore lint/style/noNonNullAssertion: safe after isFailure check
    return this._error!;
  }

  /** Build a success result, optionally carrying a value. */
  public static ok<T, E = string>(value?: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  /** Build a failure result carrying an error. */
  public static fail<T, E = string>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  /** Return the first failure in `results`, or `ok()` when all succeed. */
  public static combine(results: Result<unknown>[]): Result<unknown> {
    for (const result of results) {
      if (result.isFailure) return result;
    }
    return Result.ok();
  }
}
