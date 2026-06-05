/**
 * Atomic Repository / Unit of Work port. Call `startTransaction` for a plain
 * transaction, or `run` for one that also flushes domain events captured via
 * `EventCollector` (e.g. into an outbox) before commit. `TTx` is parametric —
 * the project pins it to the provider's concrete transaction type.
 */
export interface IUnitOfWork<TTx = unknown> {
  startTransaction<T>(callback: (tx: TTx) => Promise<T>): Promise<T>;
  run<T>(callback: (tx: TTx) => Promise<T>): Promise<T>;
}
