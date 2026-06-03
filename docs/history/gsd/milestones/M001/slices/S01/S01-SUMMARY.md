---
id: S01
parent: M001
milestone: M001
provides:
  - Executable `sfrb init` workflow that captures BYOK provider settings and workspace physics, then persists validated project-local config for downstream slices.
requires: []
affects:
  - S02
key_files:
  - package.json
  - src/cli.ts
  - src/commands/init.ts
  - src/prompts/init-wizard.ts
  - src/config/schema.ts
  - src/config/store.ts
  - tests/config/sfrb-config.test.ts
  - tests/cli/init-command.test.ts
  - scripts/verify-s01-init-smoke.mjs
  - .gitignore
key_decisions:
  - D007 set the S01 config contract to provider + provider-specific env-var name + workspace physics, with `document` as the default physics mode.
  - D008 added `SFRB_INIT_TEST_INPUT` as the init test harness so automated coverage can exercise the real command flow without mocking Enquirer internals.
patterns_established:
  - Route all CLI config writes through one zod-backed store boundary so flag-driven and interactive init paths share the same validation and serialization rules.
  - Keep init filesystem safety adjacent to config persistence by enforcing `.gitignore` protection and redacted summaries at the command boundary.
observability_surfaces:
  - `npm test -- --run tests/config/sfrb-config.test.ts`
  - `npm test -- --run tests/cli/init-command.test.ts`
  - `node scripts/verify-s01-init-smoke.mjs`
  - `node ./dist/cli.js init --provider invalid --physics nope`
  - `sfrb.config.json`
  - `.gitignore`
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
duration: ~1h25m
verification_result: passed
completed_at: 2026-03-14T06:31:00Z
---

# S01: CLI & Config Agent

**Shipped a real `sfrb init` CLI flow with validated config persistence, masked BYOK capture, workspace physics selection, `.gitignore` protection, and executable smoke coverage for fresh workspaces.**

## What Happened

S01 established the first stable boundary for the milestone: a real executable `sfrb` CLI and a project-local `sfrb.config.json` contract that later slices can trust. The CLI skeleton was built with Commander, the config contract was formalized with Zod, and all config reads/writes were centralized in one store so both direct flags and the interactive wizard validate through the same path.

The slice then closed the user-facing loop by implementing `sfrb init` as a real Enquirer wizard. The command now captures the AI provider, prompts for a masked provider-specific API key, records the correct env-var name instead of persisting the secret, captures the workspace physics preference, confirms the action, and writes a formatted `sfrb.config.json` into the chosen workspace. Adjacent safety behavior was added at the same boundary: `.gitignore` is updated to protect `sfrb.config.json`, cancellation and non-TTY misuse fail explicitly, and the command prints a redacted summary that never echoes the raw key.

To keep the slice integration-grade rather than scaffold-grade, automated coverage exercises both the config contract and the end-to-end command flow. The smoke script builds the CLI, runs `sfrb init` in a fresh temp workspace through the real harness path, and verifies the created config plus `.gitignore` contents on disk. Together, T01 and T02 retired the biggest S01 risk: config drift between prompts, persisted JSON, and downstream consumers.

## Verification

Passed:
- `npm test -- --run tests/config/sfrb-config.test.ts`
- `npm test -- --run tests/cli/init-command.test.ts`
- `node scripts/verify-s01-init-smoke.mjs`
- `node ./dist/cli.js init --provider invalid --physics nope`

Observed during verification:
- config tests proved stable serialization/defaults and rejection of malformed provider/physics values through the real file boundary
- CLI tests covered success, cancellation, non-TTY failure, unsupported provider/physics, and non-interactive flag-driven init
- the smoke check created a fresh temp workspace, wrote `sfrb.config.json`, and confirmed `.gitignore` protection without leaking the raw API key
- the invalid-flag diagnostic exited non-zero and printed field-level validation errors naming `ai.provider` and `workspace.physics`

## Deviations

None.

## Known Limitations

- S01 only establishes workspace configuration; no document schema exists yet for validating actual resume data.
- The stored config records provider metadata and env-var naming, not a persisted secret source beyond the init-time capture path.
- Browser launch, live sync, and editor physics enforcement remain future-slice work in S03-S05.

## Follow-ups

- S02 should consume `workspace.physics` directly from `sfrb.config.json` when defining and validating the universal document model.
- S03 should reuse the same config store instead of introducing a second config-loading path in the web bridge.

## Files Created/Modified

- `package.json` — added the CLI package metadata, scripts, dependencies, and executable bin entry.
- `package-lock.json` — captured the dependency graph for reproducible installs.
- `tsconfig.json` — defined the TypeScript build that emits `dist/cli.js`.
- `src/cli.ts` — bootstraps the `sfrb` program and subcommand registration.
- `src/commands/init.ts` — implements interactive and flag-driven init, redacted summaries, and exit-code handling.
- `src/prompts/init-wizard.ts` — provides the Enquirer wizard and `SFRB_INIT_TEST_INPUT` automation path.
- `src/config/schema.ts` — defines the authoritative `sfrb.config.json` schema and provider/physics guards.
- `src/config/store.ts` — implements validated config read/write helpers and `.gitignore` protection logic.
- `tests/config/sfrb-config.test.ts` — verifies config defaults, serialization, and invalid value rejection.
- `tests/cli/init-command.test.ts` — verifies success, cancellation, non-TTY failure, invalid flags, and non-interactive init behavior.
- `scripts/verify-s01-init-smoke.mjs` — performs the fresh-workspace smoke check through the built CLI.
- `.gitignore` — ignores `sfrb.config.json` by default.

## Forward Intelligence

### What the next slice should know
- `workspace.physics` already has a stable validated source of truth in `sfrb.config.json`; S02 should consume that contract rather than re-encoding mode names elsewhere.
- `SFRB_INIT_TEST_INPUT` is the fastest reliable integration path for future CLI tests that need a configured workspace without coupling to prompt internals.

### What's fragile
- `src/prompts/init-wizard.ts` — prompt flow and automation harness must stay behaviorally aligned; if fields or defaults change in one path but not the other, smoke and CLI tests should be updated immediately.
- `src/config/store.ts` — this is the only safe place to evolve config shape or filesystem protections; bypassing it risks config drift between CLI and future browser consumers.

### Authoritative diagnostics
- `node scripts/verify-s01-init-smoke.mjs` — best end-to-end signal that a fresh workspace can actually be initialized.
- `node ./dist/cli.js init --provider invalid --physics nope` — best failure-path signal for schema validation and structured stderr behavior.
- `tests/cli/init-command.test.ts` — best command-level regression net for success, cancel, and non-interactive flows.

### What assumptions changed
- "Interactive init is the hard part of S01" — the real long-term risk was boundary drift, so centralizing validation/store behavior first made the wizard straightforward to finish.
- "Secrets need to be stored in config for downstream use" — the shipped contract only stores the provider and provider-specific env-var name, which is enough for later slices while keeping secrets out of `sfrb.config.json`.
