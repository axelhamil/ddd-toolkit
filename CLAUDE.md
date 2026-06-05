# CLAUDE.md

`aggregate-kit` — zero-dependency DDD / Clean Architecture building blocks for TypeScript. Published to npm, ESM-only. `Result`, `Option`, `Entity`, `Aggregate`, `ValueObject`, domain events, repository/unit-of-work ports. Extracted from the `clean-stack` monorepo.

## Philosophy

This is a **published primitive**, not an app. The product is the public contract and the `.d.ts` — stability and zero-cost adoption beat feature breadth. Every export is something thousands of call sites may pin; a sloppy signature or a sneaky dependency is paid by everyone, forever. "Done > perfect" does **not** apply here — the rules below are what make a primitive safe to depend on.

## Working method

Toolchain API/quirk unclear (tsdown, `isolatedDeclarations`, `erasableSyntaxOnly`, Vitest, Biome, attw/publint)? **Check docs first** — TS compiler-flag and bundler behaviour drift between versions and are the frequent failure mode here. Primary: Context7 MCP via `explore-docs`. Fallback: `websearch` / `WebFetch`.

## Stack

- **Runtime**: Node ≥ 24, ESM only (`"type": "module"`); stdlib only (`node:crypto`, `node:async_hooks`)
- **Language**: TypeScript 6 — `strict`, `noUncheckedIndexedAccess`, `isolatedDeclarations`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noImplicitOverride`; `types: ["node"]` for stdlib globals
- **Build**: tsdown (Rolldown) → single-file ESM bundle + `.d.ts` + minify + treeshake; `publint` + `attw` (`esm-only`) gate the published shape
- **Test**: Vitest 4 + V8 coverage, 90% thresholds on all four metrics
- **Lint/format**: Biome 2 (single quotes, 2-space, 100 cols, trailing commas, semicolons)
- **Release**: semantic-release on push to `main` (Conventional Commits) → npm publish with provenance, built-in `GITHUB_TOKEN` + `NPM_TOKEN`

## Cross-cutting rules (always apply)

1. **Adding a rule — omnipotent or it doesn't belong.** A rule states a *principle* tied to an architectural property and survives swapping any library/version/path it references. Phrase it library-agnostic; only name a tool when it *is* the property (Zod = "validate at boundary"). Always include the **why**. Promote on the 2nd occurrence; rewrite or delete a rule the moment its property changes.

2. **Errors are values; the only `throw` is a guard against misuse.** Every fallible public operation returns `Result<T, E>` (failure) or `Option<T>` (absence) — never `null`, never an exception for a recoverable outcome. The sole permitted throws are programmer-error guards already in the kit: `Result.getValue()` on a failure, `Option.unwrap()` on a `None`. **Why**: a primitive that throws for expected outcomes forces every consumer into `try/catch` and erases the failure mode from the type signature — the entire reason `Result`/`Option` exist. **Test before merging**: a new method that can fail returns `Result`/`Option`; a `throw` is justified only when calling it is a bug, not an input error. **Trap**: a "convenience" constructor/helper that throws on bad input instead of returning `Result.fail` — route it through `validate()` + `create()`.

3. **Zero runtime dependencies — ship the seam, not the dep.** stdlib imports only. A feature needing a validator (zod), a uuid lib, or a date lib exposes a *seam* (an overridable `validate()`, an injected port) and lets the consumer bring the dep; document the pattern in the README, never import it. **Why**: the published artifact is a single-file ESM bundle, so any top-level `import 'x'` runs on module load and makes `x` mandatory for *every* consumer — even those not using the one export that needs it. This is exactly why `UserId` (its zod import) was dropped from the kit. **Test before merging**: `pnpm build` green AND `package.json` `dependencies` stays empty (peer/optional at most, and never statically imported into the barrel). **Trap**: importing a lib at module top level for a niche helper; if it must exist, isolate it behind a separate non-barrel entry the consumer opts into.

4. **Public exports are fully, explicitly typed; the `.d.ts` must emit without inference.** `isolatedDeclarations` + `erasableSyntaxOnly` are on: every export needs an explicit return/value type, and erasable-only-breaking syntax is banned (no parameter properties, no `enum`, no runtime `namespace`). A non-exported symbol may never appear in a public signature. **Why**: tsdown emits each file's declarations in isolation; cross-file inference or non-erasable syntax breaks the build and, downstream, the consumer's IDE hover. **Test before merging**: `pnpm typecheck` + `pnpm build` green. **Three recurring traps**: (a) `as const satisfies X` on a value that an exported `typeof` type reads → use `as const` alone (bit us on `STATUS_BY_SUFFIX`); (b) `typeof someLocalLet` in a public method param → name and export the type (`OutOfContextLogger`); (c) a `Symbol.for()` used as a computed key needs `: unique symbol` to be referenceable in a type.

5. **The domain stays pure — no I/O, no framework, no transport.** Code under `domain/` and `primitives/` imports only other `domain/`/`primitives/` files. Infrastructure enters as a *port* (`BaseRepository`, `ScopedRepository`, `IUnitOfWork`) or a *taxonomy* (`ErrorCode` suffix → HTTP status), never as a concrete dependency. **Why**: the moment an aggregate imports an ORM, a web framework, or `fetch`, the kit stops being reusable and pins consumers to one stack — the opposite of a primitive. **Test before merging**: grep the new file's imports — a `domain/` file pulling anything but sibling domain/primitives is the smell. **Trap**: an `httpStatusFromCode`-style helper is fine (it returns a number, owns no transport); importing `hono`/`express`/`pg` is not.

6. **Owned aggregates are scoped at the port; absence is not forbidden.** Anything carrying a `userId`/`organizationId` is persisted through `ScopedRepository<T, TScope>`, not `BaseRepository<T>`. A wrong owner reads as `Option.none()` and writes as a not-found `Result.fail` — never a `*_FORBIDDEN`. **Why**: a 403 on someone else's row confirms the row exists (existence leak); and HTTP middleware ownership checks evaporate outside the request (cron, queue, event handlers) — only the port is airtight across every caller. **Test before merging**: every owned-aggregate port method takes a `scope`; a cross-owner read in its test returns `none`, a cross-owner write returns not-found. **Trap**: surfacing a forbidden code (or `403`) from a scoped read instead of `Option.none()`.

7. **The barrel is the only entry; tests exercise it, not internals.** `src/index.ts` is the single public surface (`export *`); internal imports use the `.js` extension; tests live in `tests/**/*.test.ts` and import from `../src/index.js` only, at ≥90% coverage on every metric. No sub-barrel (`src/<x>/index.ts`). **Why**: `publint`/`attw` validate one entry; deep imports and sub-barrels create ambiguous entry points and let the public contract rot untested while internals are green. **Test before merging**: only `index.ts` re-exports; `pnpm test:coverage` green from the public API; the build stays single-file. **Trap**: a test importing `../src/domain/entity.js` directly — it couples the suite to file layout and skips the contract consumers actually see.

8. **Every public symbol carries a one-line JSDoc; that hover *is* the docs.** Public classes/functions get a short `/** … */` summary (what it is, when to reach for it). No prose inline comments otherwise — the code and names carry intent; a `// biome-ignore <rule>: <why>` directive is the only inline comment that earns its place. **Why**: a library is consumed through IDE hover and the README, not by reading source; an undocumented export is invisible, a commented internal rots out of sync with the code. **Test before merging**: a new export has a JSDoc line and an entry in the README/llms.txt API table. **Trap**: documenting *how* it works inline instead of *what/why* in JSDoc.

## Commands

- Build: `pnpm build` (tsdown → `dist/`, runs publint + attw)
- Test: `pnpm test` · single: `pnpm vitest run tests/<name>.test.ts` · watch: `pnpm test:watch` · coverage: `pnpm test:coverage`
- Typecheck: `pnpm typecheck` · Lint: `pnpm lint` / `pnpm lint:fix` · Both: `pnpm check`

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

Dependency graph (acyclic): `result`/`option`/`uuid` are leaves → `value-object`/`watched-list` build on them → `entity` composes all three → `aggregate` extends `entity` with `domain-event` → `repository` depends on `entity`/`option`/`result`/`scope`. A new file slots in without creating a back-edge or it doesn't belong in that layer.

## Release flow

Single-branch: every push to `main` runs semantic-release.

- **Conventional Commits drive the bump** (`.releaserc.json`): `feat`→minor, `fix`/`perf`→patch, `docs(readme)`→patch, `BREAKING CHANGE:`/`!`→major, `chore`/`docs`/`test`/`ci`→no release. Pick the type for the *release impact you want*, not the file touched.
- The release job runs `lint → typecheck → test → build → semantic-release`; a red gate blocks the publish. No `--no-verify`, no direct unverified pushes that skip CI.
- Publishing uses the built-in `GITHUB_TOKEN` (tag + GitHub release) and `NPM_TOKEN` (npm publish with provenance). `"private": false` — the package is live as **`aggregate-kit`**.
- **npm name lesson**: a registry `404` on GET does *not* mean a name is publishable — npm's similarity filter rejects at publish time and normalizes away `-`/`_`/`.` (that's why `ddd-toolkit` was refused as ≈ `ddd-tool-kit`). Verify normalized variants, or use a scope.
