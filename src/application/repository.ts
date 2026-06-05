import type { IEntity } from '../domain/entity.js';
import type { Option } from '../primitives/option.js';
import type { Result } from '../primitives/result.js';
import type { PaginatedResult, PaginationParams } from './pagination.js';
import type { RepoScope } from './scope.js';

/**
 * Port for persisting an aggregate. Reads return `Option` for absence and every
 * method returns a `Result`, so infrastructure failures never throw across the
 * boundary. `TTransaction` is the provider's transaction handle, threaded in
 * optionally for unit-of-work composition.
 */
export interface BaseRepository<T extends IEntity<unknown>, TTransaction = unknown> {
  create(entity: T, trx?: TTransaction): Promise<Result<T>>;
  update(entity: T, trx?: TTransaction): Promise<Result<T>>;
  delete(id: T['_id'], trx?: TTransaction): Promise<Result<T['_id']>>;
  findById(id: T['_id']): Promise<Result<Option<T>>>;
  findAll(pagination?: PaginationParams): Promise<Result<PaginatedResult<T>>>;
  findMany(
    props: Partial<T['_props']>,
    pagination?: PaginationParams,
  ): Promise<Result<PaginatedResult<T>>>;
  findBy(props: Partial<T['_props']>): Promise<Result<Option<T>>>;
  exists(id: T['_id']): Promise<Result<boolean>>;
  count(): Promise<Result<number>>;
}

/**
 * Like `BaseRepository`, but every operation is constrained by a `RepoScope`.
 * Use it for owned aggregates (carrying a `userId`/`organizationId`): a wrong
 * owner yields `Option.none()` on reads and a not-found failure on writes,
 * never a forbidden error.
 */
export interface ScopedRepository<
  T extends IEntity<unknown>,
  TScope extends RepoScope,
  TTransaction = unknown,
> {
  create(entity: T, scope: TScope, trx?: TTransaction): Promise<Result<T>>;
  update(entity: T, scope: TScope, trx?: TTransaction): Promise<Result<T>>;
  delete(id: T['_id'], scope: TScope, trx?: TTransaction): Promise<Result<T['_id']>>;
  findById(id: T['_id'], scope: TScope): Promise<Result<Option<T>>>;
  findAll(scope: TScope, pagination?: PaginationParams): Promise<Result<PaginatedResult<T>>>;
  findMany(
    props: Partial<T['_props']>,
    scope: TScope,
    pagination?: PaginationParams,
  ): Promise<Result<PaginatedResult<T>>>;
  findBy(props: Partial<T['_props']>, scope: TScope): Promise<Result<Option<T>>>;
  exists(id: T['_id'], scope: TScope): Promise<Result<boolean>>;
  count(scope: TScope): Promise<Result<number>>;
}
