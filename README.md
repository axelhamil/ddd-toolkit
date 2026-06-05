# ddd-toolkit

Zero-dependency Domain-Driven Design building blocks for TypeScript.

[![NPM Version](https://img.shields.io/npm/v/ddd-toolkit)](https://www.npmjs.com/package/ddd-toolkit)
[![NPM Downloads](https://img.shields.io/npm/dm/ddd-toolkit)](https://www.npmjs.com/package/ddd-toolkit)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](#)

📦 **npm:** [npmjs.com/package/ddd-toolkit](https://www.npmjs.com/package/ddd-toolkit)

The reusable tactical patterns for a DDD / Clean Architecture codebase — `Result`,
`Option`, `Entity`, `Aggregate`, `ValueObject`, domain events and repository ports —
extracted into one ESM-only package with **no runtime dependencies**.

## Why

- **Errors are values.** Domain and application code returns `Result<T, E>` and
  `Option<T>` instead of throwing or returning `null`. Failure paths are visible
  in the type signature.
- **Pure domain.** Aggregates, value objects and events have no framework or I/O
  coupling. The repository and unit-of-work ports keep infrastructure at arm's length.
- **Ownership-safe by construction.** `ScopedRepository` constrains every query to
  a `RepoScope`, so a wrong owner reads as *absent* (no existence leak), never *forbidden*.

## Install

```bash
pnpm add ddd-toolkit  # or npm i ddd-toolkit / bun add ddd-toolkit
```

Node >= 24, ESM only. Everything is imported from the package root:

```typescript
import { Result, Option, Entity, Aggregate, ValueObject } from 'ddd-toolkit';
```

## Quick start

```typescript
import { Aggregate, BaseDomainEvent, Result, UUID, ValueObject } from 'ddd-toolkit';

// 1. A validated value object — never throws, returns a Result.
class Email extends ValueObject<string> {
  protected validate(value: string): Result<string> {
    return value.includes('@')
      ? Result.ok(value.toLowerCase())
      : Result.fail('EMAIL_INVALID');
  }
}

// 2. A domain event.
class UserRegistered extends BaseDomainEvent<{ email: string }> {
  readonly eventType = 'user.registered';
  readonly aggregateId: string;
  readonly payload: { email: string };
  constructor(aggregateId: string, email: string) {
    super();
    this.aggregateId = aggregateId;
    this.payload = { email };
  }
}

// 3. An aggregate root that records events on creation.
interface UserProps {
  email: Email;
}

class User extends Aggregate<UserProps> {
  static register(email: Email): User {
    const user = new User({ email }, new UUID());
    user.addEvent(new UserRegistered(user._id.value.toString(), email.value));
    return user;
  }
}

const email = Email.create('Ada@Example.com');
if (email.isSuccess) {
  const user = User.register(email.getValue());
  user.toObject(); // { id, email: 'ada@example.com' }
  user.pullDomainEvents(); // [UserRegistered] — drained for the outbox
}
```

## API overview

### Primitives

| Export | What it is |
| --- | --- |
| `Result<T, E>` | Success/failure container. `ok`, `fail`, `combine`, `getValue`, `getError`, `isSuccess`, `isFailure`. |
| `Option<T>` / `Some` / `None` | Explicit optional. `some`, `none`, `fromNullable`, `map`, `flatMap`, `filter`, `unwrapOr`, `match(...)`. |
| `UUID<T>` | Typed identifier wrapper; defaults to a fresh UUID v7. Subclass for nominal ids. |
| `uuidv7()` / `randomUuidV4()` | Standalone id generators (time-ordered v7 / random v4). |

### Domain

| Export | What it is |
| --- | --- |
| `Entity<T>` | Identity-based equality, `get(key)`, `toObject()`, `clone()`. |
| `Aggregate<T>` | `Entity` + domain-event recording (`addEvent`, `pullDomainEvents`, `clearEvents`). |
| `ValueObject<T>` | Immutable, structurally-compared value; `static create()` validates via `validate()`. |
| `BaseDomainEvent<T>` / `IDomainEvent<T>` | Event base stamping `dateOccurred`, and its interface. |
| `WatchedList<T>` | Tracks added/removed items against an initial snapshot for delta persistence. |

### Application

| Export | What it is |
| --- | --- |
| `BaseRepository<T>` | Repository port; reads return `Option`, all methods return `Result`. |
| `ScopedRepository<T, TScope>` | Ownership-scoped repository port. |
| `RepoScope` / `ScopeOf<K>` | `user` \| `org` \| `user-in-org` scopes, with factories and guards. |
| `PaginationParams` / `PaginatedResult<T>` / `createPaginatedResult` / `DEFAULT_PAGINATION` | Pagination helpers. |
| `IUnitOfWork<TTx>` | Transaction / unit-of-work port (`startTransaction`, `run`). |
| `ErrorCode` / `AppError` / `AppErrorException` / `httpStatusFromCode` | Error taxonomy whose suffix maps to an HTTP status. |
| `DatabaseOperationError` / `InputParseError` | Infrastructure error types preserving `cause`. |

### Events

| Export | What it is |
| --- | --- |
| `EventCollector` | `AsyncLocalStorage`-backed, request-scoped event buffer (`runWithContext`, `add`, `drain`). |
| `IEventDispatcher` / `InMemoryEventDispatcher` | Dispatcher port and an in-process implementation that never lets one handler abort the others. |
| `IEventHandler` / `EventHandlerFn` | Handler shapes. |
| `onEvent` / `isEventHandler` / `EVENT_HANDLER_SYMBOL` | DI-friendly handler factory and brand guard. |
| `domainEventToOutboxRow` / `OutboxRow` | Map a domain event to a CloudEvents-shaped transactional-outbox row. |

## Patterns

### Validate at the boundary with value objects

```typescript
import { Result, ValueObject } from 'ddd-toolkit';

class Quantity extends ValueObject<number> {
  protected validate(value: number): Result<number> {
    if (!Number.isInteger(value) || value <= 0) return Result.fail('QUANTITY_INVALID');
    return Result.ok(value);
  }
}
```

Need schema validation? `validate()` is a plain method — plug in any validator
(this keeps `ddd-toolkit` dependency-free):

```typescript
import { z } from 'zod';
import { Result, ValueObject } from 'ddd-toolkit';

const schema = z.string().uuid();

class UserId extends ValueObject<string> {
  protected validate(value: string): Result<string> {
    const parsed = schema.safeParse(value);
    return parsed.success ? Result.ok(parsed.data) : Result.fail('USER_ID_INVALID');
  }
}
```

### Scoped repositories never leak existence

```typescript
import { RepoScope, type ScopedRepository, type ScopeOf, UUID } from 'ddd-toolkit';

declare const notes: ScopedRepository<Note, ScopeOf<'user'>>;

const scope = RepoScope.user(new UUID<string>(currentUserId));
const result = await notes.findById(noteId, scope);
// Another user's note → Option.none(), never a 403.
```

### Drain events through a unit of work

```typescript
import { EventCollector } from 'ddd-toolkit';

await EventCollector.runWithContext(async () => {
  // ... mutate aggregates; EventCollector.add(aggregate.pullDomainEvents()) ...
  const events = EventCollector.drain(); // flush to the outbox before commit
});
```

## Scripts

| Command              | What it does                          |
| -------------------- | ------------------------------------- |
| `pnpm build`         | Bundle to `dist/` (+ publint + attw)  |
| `pnpm test`          | Run tests                             |
| `pnpm test:coverage` | Tests with coverage report (90% min)  |
| `pnpm typecheck`     | `tsc --noEmit`                        |
| `pnpm lint`          | Biome check                           |
| `pnpm lint:fix`      | Biome check + autofix                 |
| `pnpm check`         | Lint + typecheck                      |

## Architecture

```
src/
  primitives/    Result · Option · UUID
  domain/        Entity · Aggregate · ValueObject · DomainEvent · WatchedList
  application/   Repository ports · Scope · Pagination · UnitOfWork · errors
  events/        EventCollector · dispatchers · onEvent · outbox mapping
  index.ts       public barrel — the only entry point
```

## Toolchain

- **TypeScript 6** — `strict`, `noUncheckedIndexedAccess`, `isolatedDeclarations`,
  `verbatimModuleSyntax`, `erasableSyntaxOnly`
- **[tsdown](https://tsdown.dev)** (Rolldown) — ESM bundle + `.d.ts` + minify + treeshake,
  validated with [`publint`](https://publint.dev) and [`are-the-types-wrong`](https://arethetypeswrong.github.io)
- **[Vitest 4](https://vitest.dev)** + V8 coverage (90% thresholds, 326 tests)
- **[Biome 2](https://biomejs.dev)** — lint + format
- **[semantic-release](https://semantic-release.gitbook.io)** — versioning & npm publish with provenance

## Publishing

This repo ships with `"private": true` as a safety gate. To publish:

1. Remove `"private": true` from `package.json`.
2. Add the `NPM_TOKEN` and `GH_TOKEN` secrets in GitHub.
3. Push Conventional Commits to `main` — `.github/workflows/release.yml` runs semantic-release.

## LLM / AI integration

Ships [llms.txt](https://llmstxt.org/) files (`llms.txt`, `llms-full.txt`) for
AI-assisted development. Compatible with [Context7](https://context7.com/).

## Compatibility

- Node.js >= 24 (uses `node:crypto` and `node:async_hooks`)
- TypeScript >= 6.0
- ESM only

## License

MIT
