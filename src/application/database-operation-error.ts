/** Wraps a low-level persistence failure, preserving the original `cause`. */
export class DatabaseOperationError extends Error {
  public readonly options: ErrorOptions;

  constructor(message: string, options: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseOperationError';
    this.options = options;
  }
}
