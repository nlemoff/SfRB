# Development Guide

## Prerequisites

- Node.js `>=20`
- npm
- Chromium for browser tests: `npm run test:setup:browsers`

A [devcontainer](../.devcontainer/devcontainer.json) is provided for a reproducible environment.

## Install and build

```bash
npm ci
npm run build      # tsc -> dist/, then copies the bridge runtime
```

`npm run build` is required before running the bridge against `src/` changes, because the bridge (`.mjs`) loads compiled CJS from `dist/`.

## Run the editor locally

```bash
node dist/cli.js init     # scaffold a workspace
node dist/cli.js open     # spawn the bridge + browser editor
node dist/cli.js export   # render a PDF
```

Enable structured logs with `SFRB_LOG_LEVEL=info` (see [observability.md](./observability.md)).

## Project layout

```
src/
  cli.ts            CLI entry (Commander)
  commands/         init | open | export | template
  bridge/server.mjs local HTTP bridge (owns disk I/O)
  document/         Zod schema, store, validation, starters
  config/           workspace config schema + store
  agent/            LayoutConsultant provider boundary
  utils/            logger + metrics
web/src/            React editor + printable surface
tests/              unit, contract, and browser tests
scripts/            build helpers and verifiers
```

## Quality gates

| Command | Purpose |
| ------- | ------- |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (complexity, naming, boundaries) |
| `npm run format:check` | Prettier formatting check |
| `npm run knip` | unused files / dependencies |
| `npm run duplication` | jscpd duplicate-code scan |
| `npm run check:tech-debt` | fail on stray TODO/FIXME |
| `npm run check:large-files` | fail on oversized files |
| `npm run schema:check` | schema.json matches Zod source |
| `npm test` / `npm run coverage` | test suite (+ coverage thresholds) |

Auto-fix with `npm run lint:fix` and `npm run format`.

## Pre-commit hooks

husky runs `lint-staged` on commit, applying ESLint and Prettier to staged files. Hooks are installed by the `prepare` script during `npm install`.

## API reference

Generate the TypeScript API reference with TypeDoc:

```bash
npm run docs        # outputs to docs/api (gitignored)
```

## Conventions

- TypeScript strict mode; validate at boundaries with Zod.
- Keep changes surgical and match existing style.
- Respect module boundaries: web and bridge code do not import each other.
- Comment only non-obvious reasoning; prefer self-documenting code.
