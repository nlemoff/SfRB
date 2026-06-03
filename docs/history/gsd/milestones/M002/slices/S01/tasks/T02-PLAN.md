---
estimated_steps: 4
estimated_files: 5
---

# T02: Let init create editable workspaces without mandatory AI setup

**Slice:** S01 — Template Starts & First-Run Guidance
**Milestone:** M002

## Description

Turn `sfrb init` into a truthful first-run entrypoint. This task should let users choose template vs blank, optionally skip AI configuration entirely, and leave behind a real editable workspace (`sfrb.config.json` plus `resume.sfrb.json`) instead of only an AI-first config stub.

## Steps

1. Loosen the config contract so workspace physics remains required but AI configuration can be absent for editor-only workspaces.
2. Update the init wizard and non-interactive flag path to capture starter choice and an explicit AI-skipped path while preserving the existing configured-provider path.
3. Materialize the selected starter document during init, write the config/document pair atomically enough for local use, and keep output summaries explicit about starter choice and AI status.
4. Expand CLI tests to cover wizard-harness and non-interactive flows for template/blank starts, AI-skipped workspaces, configured-AI workspaces, and secret-redaction behavior.

## Must-Haves

- [ ] A user can initialize either starter type without entering provider credentials.
- [ ] Configured-AI init still works and continues to redact secret values in output.
- [ ] Init leaves behind a valid starter document that `sfrb open` can serve immediately.

## Verification

- `npm test -- --run tests/cli/init-command.test.ts`
- Confirm the test covers both AI-skipped and AI-configured init paths and asserts that `resume.sfrb.json` is created with the requested starter variant.

## Observability Impact

- Signals added/changed: init summary reports starter choice and whether AI was skipped or configured.
- How a future agent inspects this: rerun `tests/cli/init-command.test.ts` or inspect the init command JSON summary plus on-disk workspace files.
- Failure state exposed: config-validation failure vs starter-materialization failure vs redaction regression becomes visible in the init command output/tests.

## Inputs

- `src/commands/init.ts` — current init entrypoint and summary behavior.
- `src/prompts/init-wizard.ts` — current AI-first wizard flow to reshape around starter creation.
- `src/document/starters.ts` — starter factory from T01 that init should materialize.

## Expected Output

- `src/config/schema.ts` — AI-optional workspace config contract for first-run editing.
- `src/commands/init.ts` — init writes config plus starter document and supports AI-skipped setup.
- `src/prompts/init-wizard.ts` — starter-aware prompt flow with an explicit skip-AI path.
- `tests/cli/init-command.test.ts` — executable coverage for AI-skipped and configured-AI workspace creation.
