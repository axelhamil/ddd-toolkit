import { Result } from '../primitives/result.js';

/**
 * Base class for value objects — immutable, identity-less domain values compared
 * by structural equality. Subclasses implement `validate()` and are built through
 * the static `create()`, which returns a `Result` instead of throwing.
 */
export abstract class ValueObject<T> {
  protected readonly _value: T;

  public constructor(value: T) {
    this._value = Object.freeze(value);
  }

  get value(): T {
    return this._value;
  }

  /** Structural equality (deep for objects via JSON, strict for primitives). */
  public equals(other: ValueObject<T>): boolean {
    if (this._value === other.value) return true;
    if (
      typeof this._value === 'object' &&
      this._value !== null &&
      typeof other.value === 'object' &&
      other.value !== null
    ) {
      return JSON.stringify(this._value) === JSON.stringify(other.value);
    }
    return false;
  }

  /** Validate (and optionally normalize) the raw value. */
  protected abstract validate(value: T): Result<T>;

  /** Validate then construct, returning `fail` on invalid input. */
  public static create<T extends ValueObject<V>, V>(
    this: new (
      value: V,
    ) => T,
    value: NoInfer<V>,
  ): Result<T> {
    // biome-ignore lint/complexity/noThisInStatic: need `this` to construct the subclass
    const ValueObjectConstructor = this as new (value: V) => T;

    const tempInstance = new ValueObjectConstructor(value);
    const validationResult = tempInstance.validate(value);

    if (validationResult.isFailure) return Result.fail(validationResult.getError());

    const validatedValue = validationResult.getValue();
    const finalInstance = new ValueObjectConstructor(validatedValue);
    return Result.ok(finalInstance);
  }
}
