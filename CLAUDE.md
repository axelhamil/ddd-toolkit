# aggregate-kit

Zero-dependency DDD / Clean Architecture building blocks for TypeScript. ESM-only,
no runtime dependencies. Errors are values (`Result`/`Option`), the domain is pure,
and ownership is enforced at the repository port.

## Commands

- Build: `pnpm build` (tsdown → `dist/`, runs publint + attw)
- Test all: `pnpm test`
- Test single: `pnpm vitest run tests/<name>.test.ts`
- Test watch: `pnpm test:watch`
- Coverage: `pnpm test:coverage` (90% thresholds, all metrics)
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint` / fix: `pnpm lint:fix`
- Check (lint + typecheck): `pnpm check`

## Architecture

```
src/
  primitives/    result.ts · option.ts · uuid.ts
  domain/        entity.ts · aggregate.ts · value-object.ts · domain-event.ts · watched-list.ts
  application/   repository.ts · scope.ts · pagination.ts · transaction.ts
                 error-code.ts · database-operation-error.ts · input-parse-error.ts
  events/        event-collector.ts · event-dispatcher.ts · in-memory-event-dispatcher.ts
                 event-handler.ts · on-event.ts · outbox-mapping.ts
  index.ts       barrel — the only public entry point
```

Internal dependency graph (acyclic): `result`/`option`/`uuid` are leaves; `value-object`
and `watched-list` build on them; `entity` composes all three; `aggregate` extends
`entity` with `domain-event`; `repository` depends on `entity`/`option`/`result`/`scope`.

## Design rules (this is a published library — keep it disciplined)

- **No `throw` in the public API** except programmer-error guards (`Result.getValue()`
  on a failure, `Option.unwrap()` on `None`). Recoverable outcomes return `Result`/`Option`.
- **No runtime dependencies.** `node:crypto` and `node:async_hooks` (stdlib) are the
  only imports. Do not add npm deps; if a feature needs a validator (e.g. zod), expose
  the seam (a `validate()` method) and let the consumer bring it — document the pattern
  in the README instead of importing it.
- **Public exports need explicit types** (`isolatedDeclarations` is on) and **no
  erasable-only-breaking syntax** (`erasableSyntaxOnly` is on → no parameter properties,
  no enums, no runtime namespaces).
- **`get id()` is the only getter on aggregates/entities** in consumer code; other props
  via `entity.get('prop')`. The kit exposes `_id`/`_props` as the documented escape hatches.
- **`ScopedRepository` for owned aggregates**; a wrong owner is `Option.none()` (read) /
  not-found `Result.fail` (write), never a forbidden error (no existence leak).

## Toolchain

- Node >= 24, pnpm (via corepack), ESM only (`"type": "module"`)
- TypeScript 6 — `strict`, `noUncheckedIndexedAccess`, `isolatedDeclarations`,
  `verbatimModuleSyntax`, `erasableSyntaxOnly`; `types: ["node"]` for stdlib globals
- tsdown (Rolldown) for build + `.d.ts` + minify + treeshake; `publint` + `attw` validate
- Vitest 4 + V8 coverage (90% thresholds)
- Biome 2 for lint + format
- semantic-release (Conventional Commits) → npm publish with provenance

## Code style

- Biome: single quotes, 2-space indent, 100-char lines, trailing commas, semicolons
- Files: `kebab-case.ts` · Classes: `PascalCase` · functions: `camelCase`
- `verbatimModuleSyntax` is on → use `import type` for type-only imports
- `isolatedDeclarations` is on → all public exports need explicit return/value types
- Internal imports use the `.js` extension (ESM convention)
- Tests live in `tests/**/*.test.ts` and import from `../src/index.js` (public API only)
- No barrel re-exports beyond `src/index.ts`; no inline comments unless the WHY is
  non-obvious (public classes/functions carry a short JSDoc summary instead)

## Testing

- Vitest with V8 coverage, thresholds 90% (statements/branches/functions/lines)
- Tests in `tests/**/*.test.ts`, one file per module, organized by method category
- Test-only helpers (stub ids, sample VOs/entities) are defined inline in each test file
- Explicit imports from `vitest` (no globals)

## Releases

- Conventional Commits drive semantic-release: `feat` → minor, `fix` → patch, `docs(readme)` → patch
- Releases run on push to `main` via `.github/workflows/release.yml`
- Publishing requires removing `"private": true` and setting `NPM_TOKEN` + `GH_TOKEN` secrets
