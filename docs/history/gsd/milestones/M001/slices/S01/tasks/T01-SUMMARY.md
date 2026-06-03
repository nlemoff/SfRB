---
id: T01
parent: S01
milestone: M001
provides:
  - Executable `sfrb` CLI skeleton plus a validated project-local config contract for later slices.
key_files:
  - package.json
  - tsconfig.json
  - src/cli.ts
  - src/commands/init.ts
  - src/config/schema.ts
  - src/config/store.ts
  - tests/config/sfrb-config.test.ts
  - tests/cli/init-command.test.ts
  - package-lock.json
key_decisions:
  - D007 set the S01 config contract to provider + provider-specific env-var name + workspace physics, with `document` as the default physics mode.
patterns_established:
  - Route all CLI config writes through one zod-backed store boundary so CLI flags and later interactive flows share validation and serialization.
observability_surfaces:
  - `node ./dist/cli.js --help`, `node ./dist/cli.js init --provider invalid --physics nope`, `sfrb.config.json`, and `npm test` output
duration: ~25m
verification_result: passed
completed_at: 2026-03-14T06:10:19Z
blocker_discovered: false
---

# T01: Create the CLI skeleton and config contract

**Shipped a real `sfrb` CLI entrypoint, a zod-validated `sfrb.config.json` contract, project-local read/write helpers, and config-boundary tests that pass through the real file path.**

## What Happened

I scaffolded the Node/TypeScript CLI package at the repo root with `commander`, `zod`, `vitest`, and a build that emits the executable entrypoint at `dist/cli.js`. The CLI now exposes a real `sfrb` program with an `init` subcommand, and the `init` command already routes non-interactive writes through the same config store the future interactive wizard will use.

The config contract lives in `src/config/schema.ts` and `src/config/store.ts`. It validates a single project-local `sfrb.config.json` shape with `version`, `ai.provider`, `ai.apiKeyEnvVar`, and `workspace.physics`, defaulting physics to `document`. The store helper writes formatted JSON, reads it back from the workspace root, and turns zod failures into actionable field-level messages.

I also added the first passing contract tests in `tests/config/sfrb-config.test.ts` for stable serialization/defaults and rejection of invalid provider/physics values through the real file boundary. Per the slice-level instruction for the first task, I created `tests/cli/init-command.test.ts` as a deliberately failing placeholder to hold the T02 interactive-flow work.

## Verification

Passed:
- `npm test -- --run tests/config/sfrb-config.test.ts`
- `npm run build`
- `node ./dist/cli.js --help`
- `node ./dist/cli.js init --provider invalid --physics nope` → exited with code 1 and printed field-level validation errors for `ai.provider`, `ai.apiKeyEnvVar`, and `workspace.physics`

Slice-level checks run during this task:
- `npm test -- --run tests/cli/init-command.test.ts` → fails intentionally; placeholder test created for T02 interactive init flow
- `node scripts/verify-s01-init-smoke.mjs` → fails because the T02 smoke script is not created yet

## Diagnostics

Inspect later with:
- `src/config/schema.ts` for the authoritative contract
- `src/config/store.ts` for the real read/write and validation boundary
- `node ./dist/cli.js --help` for the live CLI surface
- `node ./dist/cli.js init --provider invalid --physics nope` for the structured failure-path stderr
- `tests/config/sfrb-config.test.ts` for the contract assertions against the persisted file

## Deviations

Created `tests/cli/init-command.test.ts` earlier than the original T01 file list because the unit contract explicitly required creating slice-verification test files on the first task, even though its real implementation belongs to T02.

## Known Issues

- The interactive `sfrb init` wizard is not implemented yet; running `sfrb init` without config flags only confirms the command surface and config path.
- `scripts/verify-s01-init-smoke.mjs` does not exist yet and remains part of T02.
- The placeholder `tests/cli/init-command.test.ts` fails until T02 replaces it with real init-command coverage.

## Files Created/Modified

- `package.json` — added the CLI package metadata, scripts, bin entry, and dependencies.
- `package-lock.json` — captured the npm dependency graph for reproducible installs.
- `tsconfig.json` — defined the TypeScript build that emits `dist/cli.js`.
- `src/cli.ts` — added the executable CLI bootstrap and command registration.
- `src/commands/init.ts` — wired the initial `init` command and non-interactive config-write path.
- `src/config/schema.ts` — defined the authoritative `sfrb.config.json` schema and defaults.
- `src/config/store.ts` — implemented project-local config path, read/write, and validation error formatting.
- `tests/config/sfrb-config.test.ts` — added passing config contract tests through the real file boundary.
- `tests/cli/init-command.test.ts` — added the intentional T02-failing placeholder for the future interactive init flow.
- `.gsd/DECISIONS.md` — recorded the S01 config-contract decision.
- `.gsd/milestones/M001/slices/S01/S01-PLAN.md` — marked T01 complete and added the failure-path verification item.
- `.gsd/milestones/M001/slices/S01/tasks/T01-PLAN.md` — added the missing observability impact section.
