# AGENTS.md

Operational guide for AI coding agents (and new human contributors) working in this repository. Human-focused contribution rules live in [CONTRIBUTING.md](./CONTRIBUTING.md); deep design notes live under [docs/](./docs/).

## What this project is

SfRB (Straightforward Resume Builder) is a local-first, CLI-first resume editor. The `sfrb` CLI spawns a Vite-backed local bridge that serves a React editor in the browser. One canonical `resume.sfrb.json` is the only authoritative document state.

## Environment

- Node.js `>=20` (CI runs Node 20 and 22).
- Install dependencies with `npm ci`.
- Browser tests require Chromium: `npm run test:setup:browsers` (one-time).

## Build, test, and quality commands

```bash
npm run build            # tsc + copy bridge runtime into dist/
npm test                 # full vitest suite
npm run test:web         # browser tests only (needs Chromium)
npm run coverage         # tests + coverage thresholds
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run format:check     # prettier --check
npm run knip             # unused files / dependencies
npm run duplication      # jscpd duplicate-code scan
npm run check:tech-debt  # fail on stray TODO/FIXME markers
npm run check:large-files# fail on oversized source files
npm run schema:check     # assert schema.json matches the Zod source
```

Before opening a PR, the following must pass: `build`, `typecheck`, `lint`, `format:check`, `knip`, `duplication`, `schema:check`, and `test` (or `coverage`). Pre-commit hooks (husky + lint-staged) run ESLint and Prettier on staged files automatically.

## Architecture in one screen

The whole product is one canonical document boundary mediated by a local HTTP bridge.

- **CLI** (`src/cli.ts`, `src/commands/*`) — Commander entry; compiles to CommonJS in `dist/`.
- **Bridge** (`src/bridge/server.mjs`) — ESM Vite dev server; loads compiled CJS from `dist/` via `createRequire`. Owns all disk I/O.
- **Web UI** (`web/src/`) — React editor plus the printable surface.
- **Document model** (`src/document/`) — Zod schema, store, validation, starters.
- **Config** (`src/config/`) — Zod-validated `sfrb.config.json`.
- **Layout consultant** (`src/agent/LayoutConsultant.ts`) — provider boundary for AI overflow proposals.
- **Shared utilities** (`src/utils/`) — structured logger and metrics registry.

See [docs/architecture.md](./docs/architecture.md) and [docs/bridge-api.md](./docs/bridge-api.md) for the full picture.

## Load-bearing contracts (do not break)

1. **Canonical write path.** All document mutations go through `POST /__sfrb/editor`, which runs schema + physics validation before writing `resume.sfrb.json`. Never write the document from the CLI or browser directly.
2. **Provider secrets stay bridge-side.** The bridge reads API keys from environment variables referenced by config. Secrets must never appear in committed config, in the browser, or in logs.
3. **Bridge stdio is quiet.** During normal operation the bridge must not write to stderr (a contract test asserts this). The shared logger is silent unless `SFRB_LOG_LEVEL` is set.
4. **Zod-first.** Define the schema, infer the TS type, validate at every boundary.
5. **CLI parity.** Every meaningful editor/export action must be representable as a structured operation invokable from the CLI.

## Conventions

- TypeScript strict mode; no `any` escape hatches without justification.
- ESLint enforces complexity, naming, and module-boundary rules (`web/` and bridge code must not import each other directly).
- Prettier owns formatting (`*.md` is intentionally excluded).
- Keep changes surgical: touch only what the task requires, and match existing style.
- Add a comment only when the reason behind the code is non-obvious; prefer self-documenting code.

## Observability

The bridge exposes `GET /__sfrb/health` and `GET /__sfrb/metrics` (Prometheus text), tags every `/__sfrb/*` response with an `x-request-id`, and logs structured JSON when `SFRB_LOG_LEVEL` is set. See [docs/observability.md](./docs/observability.md).

## Planning source of truth

Active planning lives in [ROADMAP.md](./ROADMAP.md), GitHub issues, and PR descriptions.
