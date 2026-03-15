---
id: T02
parent: S01
milestone: M002
provides:
  - Truthful first-run init that can create template or blank editable workspaces with AI either skipped or configured.
key_files:
  - src/config/schema.ts
  - src/prompts/init-wizard.ts
  - src/commands/init.ts
  - tests/config/sfrb-config.test.ts
  - tests/cli/init-command.test.ts
key_decisions:
  - Made `sfrb.config.json` AI-optional while keeping workspace physics required.
  - Had `sfrb init` always materialize `resume.sfrb.json` from the canonical starter factory and report AI state as `skipped` vs `configured`.
patterns_established:
  - First-run workspace creation now flows through starter selection + physics selection + optional AI config, then persists config/document through the normal validated store boundaries.
observability_surfaces:
  - Init JSON summary now reports `workspace.starter`, `workspace.physics`, `documentPath`, and `ai.status`.
  - `resume.sfrb.json` starter metadata remains inspectable via `metadata.starter.id` and `metadata.starter.kind`.
  - CLI tests cover wizard-harness and non-interactive init for both AI-skipped and AI-configured paths.
duration: 18m
verification_result: passed
completed_at: 2026-03-15T03:19:17-07:00
blocker_discovered: false
---

# T02: Let init create editable workspaces without mandatory AI setup

**`sfrb init` now creates a real starter workspace on day one: template or blank, with AI either skipped or configured, and it leaves behind both `sfrb.config.json` and `resume.sfrb.json`.**

## What Happened

I loosened the config contract so editor-only workspaces can omit `ai` while still requiring `workspace.physics`. Then I rewired the init flow around real workspace creation instead of AI-first config stubbing: the wizard now asks for starter + physics up front, offers an explicit skip-AI branch, and only prompts for provider credentials when the user chooses to configure AI.

On the command side, non-interactive init now requires `--starter` and `--physics`, plus either `--skip-ai` or the configured AI path. Successful init writes both the validated workspace config and a starter document from `createStarterDocument(...)`, then prints a JSON summary that exposes starter choice, starter id, physics, document path, and `ai.status` (`skipped` or `configured`). Configured flows still redact captured API keys in output.

I expanded test coverage at the real command boundary: wizard-harness template + AI-skipped init, wizard-harness blank + AI-configured init, non-interactive skip/configured paths, conflicting flag rejection, cancellation, validation failures, and persisted starter-document assertions. I also added a config-store test for AI-optional editor-only configs.

## Verification

- Passed: `npm test -- --run tests/config/sfrb-config.test.ts tests/document/starter-documents.test.ts tests/cli/init-command.test.ts`
- Passed: `npm test -- --run tests/document/starter-documents.test.ts`
- Passed: `npm test -- --run tests/cli/init-command.test.ts`
- Passed: `npm run build`
- Passed operational spot check:
  - `node dist/cli.js init --cwd <tmp> --starter template --physics document --skip-ai`
  - `node dist/cli.js open --cwd <tmp> --no-open --port 4317`
  - Browser assertions passed against `http://127.0.0.1:4317/__sfrb/bootstrap` for ready/document/template starter state.
  - Browser loaded `http://127.0.0.1:4317/` without failed network requests; console showed one 404 resource-load error but no app crash.
- Slice-level checks still pending/failing outside T02 scope:
  - `npm test -- --run tests/web/editor-first-run-guidance.test.ts` → failed because the file does not exist yet (T03 scope).
  - `node scripts/verify-s01-first-run.mjs` → failed because the script does not exist yet (T03 scope).

## Diagnostics

- Inspect init results in command output JSON: `workspace.starter.kind`, `workspace.starter.id`, `workspace.physics`, `documentPath`, and `ai.status`.
- Inspect on disk:
  - `sfrb.config.json` for optional `ai` presence/absence
  - `resume.sfrb.json` for `metadata.starter.id` / `metadata.starter.kind`
- Re-run `tests/cli/init-command.test.ts` to check:
  - wizard-harness skip/configured flows
  - non-interactive skip/configured flows
  - starter-document persistence
  - redaction behavior
- Re-run `npm run build` if a future change loosens types around optional AI config or Enquirer prompt flow again.

## Deviations

- None.

## Known Issues

- The T03 browser-proof artifacts are not present yet, so the slice-level web test and `scripts/verify-s01-first-run.mjs` check still fail as expected.
- The built open-path browser check surfaced one 404 resource-load console error; it did not block bootstrap readiness or page render, but it remains worth checking during T03 browser polish.

## Files Created/Modified

- `src/config/schema.ts` — made workspace AI config optional while preserving provider/env-var validation when `ai` is present.
- `src/prompts/init-wizard.ts` — added starter selection, explicit skip-AI path, and updated harness/TTY validation for the new flow.
- `src/commands/init.ts` — added starter/skip-AI flags, wrote starter documents during init, and expanded init summary output.
- `tests/config/sfrb-config.test.ts` — added coverage for editor-only configs with no `ai` section.
- `tests/cli/init-command.test.ts` — added executable coverage for template/blank, AI-skipped/AI-configured, non-interactive, cancellation, validation, and redaction cases.
- `.gsd/DECISIONS.md` — appended the first-run init contract decision.
- `.gsd/milestones/M002/slices/S01/S01-PLAN.md` — marked T02 complete.
