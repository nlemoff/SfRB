---
estimated_steps: 5
estimated_files: 6
---

# T02: Implement the interactive init flow and fresh-workspace smoke path

**Slice:** S01 — CLI & Config Agent
**Milestone:** M001

## Description

Turn the CLI skeleton into the slice demo: a user can initialize a workspace through an interactive wizard, safely capture a provider key and physics preference, persist them into `sfrb.config.json`, and verify the result in a fresh workspace. This task closes the user-facing loop and adds the diagnostics needed to understand init failures without exposing secrets.

## Steps

1. Implement the init wizard prompts with `enquirer`, including provider selection, masked API-key input, physics selection, and confirmation/cancel behavior.
2. Map the selected provider to the correct stored key field and persist the validated config through the shared store helpers instead of duplicating file logic in the command.
3. Update init to ensure `.gitignore` protects `sfrb.config.json` and report a redacted success summary showing what was configured.
4. Add automated command-level tests that exercise success, cancellation, invalid/non-interactive input paths, and persistence of provider plus physics.
5. Add a fresh-workspace smoke script that runs the command through a test harness path and asserts the created files and stored values on disk.

## Must-Haves

- [ ] `sfrb init` captures provider, masked API key, and physics preference through a usable interactive flow.
- [ ] The selected values are persisted into project-local `sfrb.config.json` via the shared validated config store.
- [ ] `.gitignore` is updated or checked so the config file is not accidentally committed.
- [ ] Success and failure output redact secrets while still making cancellation or validation failures diagnosable.
- [ ] Automated tests and the smoke script prove the end-to-end init workflow in a fresh workspace.

## Verification

- `npm test -- --run tests/cli/init-command.test.ts`
- `node scripts/verify-s01-init-smoke.mjs`

## Observability Impact

- Signals added/changed: init exit codes, redacted success summary, and explicit validation/cancellation error messages.
- How a future agent inspects this: read `sfrb.config.json`, inspect `.gitignore`, run the smoke script, or rerun the CLI tests.
- Failure state exposed: unsupported selections, missing key for chosen provider, prompt cancellation, and config write failures become visible without printing the secret value.

## Inputs

- `.gsd/milestones/M001/slices/S01/tasks/T01-PLAN.md` — established CLI entrypoint, config schema, and test harness expectations.
- `src/config/schema.ts` — validated contract that the init flow must write without bypassing.
- `src/config/store.ts` — shared persistence layer to reuse instead of writing files directly in prompts.

## Expected Output

- `src/commands/init.ts` — full init command behavior wired to prompts and config persistence.
- `src/prompts/init-wizard.ts` — interactive provider/key/physics prompt flow.
- `.gitignore` — config protection entry for the local secret-bearing config file.
- `tests/cli/init-command.test.ts` — automated end-to-end command behavior coverage.
- `scripts/verify-s01-init-smoke.mjs` — fresh-workspace verification script for the slice demo.
