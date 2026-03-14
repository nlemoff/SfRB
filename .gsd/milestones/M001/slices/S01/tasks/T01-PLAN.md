---
estimated_steps: 4
estimated_files: 7
---

# T01: Create the CLI skeleton and config contract

**Slice:** S01 — CLI & Config Agent
**Milestone:** M001

## Description

Establish the executable Node CLI boundary and the validated config contract that every later slice will consume. This task should leave the repo with a real `sfrb` entrypoint, a typed `sfrb.config.json` schema, project-local persistence helpers, and automated tests that lock the contract before interactive behavior is layered on.

## Steps

1. Add the Node/TypeScript package scaffolding for the CLI, including scripts for build/test and a runnable `sfrb` binary entrypoint.
2. Implement the CLI bootstrap and `init` command module wiring with `commander`, leaving a callable command surface even if the wizard body is still minimal.
3. Define the `zod` config schema and project-local read/write helpers for `sfrb.config.json`, including defaults and explicit validation errors.
4. Add the first automated test file to verify config parsing/serialization and invalid provider or physics rejection through the real config boundary.

## Must-Haves

- [ ] `sfrb` can be executed locally and shows command/help output from a real CLI entrypoint.
- [ ] `sfrb.config.json` has a single validated schema covering provider, key storage field, and physics preference.
- [ ] Project-local config read/write helpers exist and reject malformed values with actionable errors.
- [ ] A working test runner is present and executes contract assertions for the config layer.

## Verification

- `npm test -- --run tests/config/sfrb-config.test.ts`
- `npm run build && node ./dist/cli.js --help`

## Inputs

- `.gsd/milestones/M001/slices/S01/S01-PLAN.md` — slice goal, demo, and verification targets for the CLI/config boundary.
- `.gsd/DECISIONS.md` — milestone architectural choices for local CLI, BYOK, and configurable physics.

## Observability Impact

- New runtime signals: CLI help/usage output from the real entrypoint, explicit non-zero exits for invalid config writes, and structured validation errors that identify rejected config fields.
- Inspection surfaces for future agents: `sfrb.config.json`, `npm test` output for the config boundary, and stderr from `node ./dist/cli.js init --provider invalid --physics nope`.
- Failure visibility added by this task: malformed provider or physics values become inspectable through the same config parse/write path later slices will use, instead of failing silently or accepting drifted JSON.

## Expected Output

- `package.json` — CLI package metadata, scripts, and dependency declarations.
- `tsconfig.json` — TypeScript build configuration for the CLI sources.
- `src/cli.ts` — executable CLI bootstrap and command registration.
- `src/commands/init.ts` — initial `init` command surface wired into the CLI.
- `src/config/schema.ts` — validated `sfrb.config.json` schema.
- `src/config/store.ts` — project-local config persistence helpers.
- `tests/config/sfrb-config.test.ts` — executable config contract assertions.
