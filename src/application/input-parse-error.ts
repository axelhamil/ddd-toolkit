/** Wraps an input validation/parsing failure, preserving the original `cause`. */
export class InputParseError extends Error {
  public readonly options: ErrorOptions;

  constructor(message: string, options: ErrorOptions) {
    super(message, options);
    this.name = 'InputParseError';
    this.options = options;
  }
}
