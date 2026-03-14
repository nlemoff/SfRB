---
id: T02
parent: S01
milestone: M001
provides:
  - A real `sfrb init` wizard plus a stable automation/smoke path that persists validated config, protects it in `.gitignore`, and redacts captured secrets in diagnostics.
key_files:
  - src/commands/init.ts
  - src/prompts/init-wizard.ts
  - src/config/store.ts
  - tests/cli/init-command.test.ts
  - scripts/verify-s01-init-smoke.mjs
  - .gitignore
key_decisions:
  - D008 added `SFRB_INIT_TEST_INPUT` as the init test harness so automated coverage can exercise the real command flow without mocking Enquirer internals.
patterns_established:
  - Keep init writes on the shared zod-backed config store and add adjacent filesystem safety checks (`.gitignore`) plus redacted summaries at the command boundary.
observability_surfaces:
  - `npm test -- --run tests/cli/init-command.test.ts`, `node scripts/verify-s01-init-smoke.mjs`, `node ./dist/cli.js init --provider invalid --physics nope`, `sfrb.config.json`, and `.gitignore`
duration: ~1h
verification_result: passed
completed_at: 2026-03-14T06:17:09Z
blocker_discovered: false
---

# T02: Implement the interactive init flow and fresh-workspace smoke path

**Shipped a real `sfrb init` setup loop with Enquirer prompts, validated config persistence, `.gitignore` protection, redacted success/error output, and an end-to-end fresh-workspace smoke check.**

## What Happened

I replaced the placeholder `init` command with a real flow that can either run interactively through `enquirer` or run through a non-TTY harness for tests and smoke verification. The new wizard captures provider, masked API key input, physics mode, and final confirmation/cancel behavior in `src/prompts/init-wizard.ts`. Prompt cancellation now resolves to an explicit, non-secret-bearing failure message instead of a generic stack trace.

On the command side, `src/commands/init.ts` now routes all persisted writes through `writeConfig`, maps the selected provider to the authoritative env-var field from the schema contract, ensures `.gitignore` contains `sfrb.config.json`, and prints a redacted init summary that shows provider/env-var/physics plus a masked API-key preview without ever echoing the raw secret. The config store gained a shared `.gitignore` helper so protection logic lives at the same file boundary as config persistence.

I also replaced the placeholder CLI test file with real command-level coverage for success, cancellation, non-TTY failure, unsupported provider/physics validation, and fully non-interactive flag-driven init. Finally, `scripts/verify-s01-init-smoke.mjs` now builds the CLI, runs `sfrb init` in a fresh temp workspace through the harness path, and asserts the resulting config plus `.gitignore` contents on disk.

## Verification

Passed:
- `npm test -- --run tests/cli/init-command.test.ts`
- `npm test -- --run tests/config/sfrb-config.test.ts`
- `npm run build`
- `node scripts/verify-s01-init-smoke.mjs`
- `node ./dist/cli.js init --provider invalid --physics nope` → exited non-zero and printed field-level validation errors for `ai.provider` and `workspace.physics`

Observed behavior confirmed during verification:
- successful init writes `sfrb.config.json` with provider-specific env-var mapping and selected physics
- `.gitignore` gains `sfrb.config.json` protection when missing
- cancellation and non-TTY flows fail explicitly without writing files
- raw API keys do not appear in CLI summaries, test assertions, or smoke output

## Diagnostics

Inspect later with:
- `src/prompts/init-wizard.ts` for the interactive wizard and the `SFRB_INIT_TEST_INPUT` automation path
- `src/commands/init.ts` for exit-code handling, redacted summaries, and non-interactive flag validation
- `src/config/store.ts` for config writes plus `.gitignore` protection behavior
- `tests/cli/init-command.test.ts` for command-level end-to-end coverage
- `node scripts/verify-s01-init-smoke.mjs` for the fresh-workspace slice demo
- `node ./dist/cli.js init --provider invalid --physics nope` for the structured failure-path stderr

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/commands/init.ts` — replaced the placeholder init action with the real wizard/flag flow, redacted summaries, and exit-code handling.
- `src/prompts/init-wizard.ts` — added the Enquirer-driven provider/key/physics/confirm wizard plus the automation harness input path.
- `src/config/store.ts` — added shared `.gitignore` protection helpers alongside the validated config read/write boundary.
- `src/config/schema.ts` — exported provider/physics guards used by the wizard and command validation.
- `tests/cli/init-command.test.ts` — added real command-level coverage for success, cancellation, non-TTY failure, validation errors, and non-interactive init.
- `scripts/verify-s01-init-smoke.mjs` — added the fresh-workspace smoke script that builds the CLI and verifies created files on disk.
- `.gitignore` — now ignores `sfrb.config.json` at the repo root by default.
- `package.json` — added the `enquirer` runtime dependency required by the interactive wizard.
- `package-lock.json` — captured the updated dependency graph for the new prompt library.
- `.gsd/DECISIONS.md` — recorded the init automation harness decision for downstream slices.
- `.gsd/milestones/M001/slices/S01/S01-PLAN.md` — marked T02 complete.
