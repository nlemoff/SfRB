---
id: T01
parent: S07
milestone: M002
provides:
  - Shared canonical workspace action execution for both bridge and CLI edits, plus a shipped generic `sfrb edit` surface.
key_files:
  - src/editor/workspace-action-runner.ts
  - src/commands/edit.ts
  - src/bridge/server.mjs
  - tests/cli/edit-command.test.ts
key_decisions:
  - Kept one canonical action grammar for CLI automation: the command accepts the raw canonical action object via `--action`, `--action-file`, or stdin instead of introducing CLI-specific subcommands.
patterns_established:
  - Canonical workspace mutations should flow through `runWorkspaceAction()` so bridge and CLI share read → parse → apply → validate → write semantics and the same normalized saved/no-write payload shape.
observability_surfaces:
  - dist/cli.js edit --json
  - /__sfrb/bootstrap
  - resume.sfrb.json
  - bridge and CLI contract tests
duration: ~3h
verification_result: passed
completed_at: 2026-03-17 00:21 PDT
blocker_discovered: false
---

# T01: Wire one shared canonical action runner into the bridge and `sfrb edit`

**Added one shared workspace action runner, rewired bridge edits to use it, and shipped `sfrb edit` with inline/file/stdin input plus concise or JSON output.**

## What Happened

I first traced the existing bridge mutation seam in `src/bridge/server.mjs` and the editor/document/config validation stack to isolate the canonical read → parse → apply → validate → write path.

From that seam I created `src/editor/workspace-action-runner.ts`, which now owns canonical action execution and returns one normalized result shape with explicit `writeOutcome: saved|no_write`, action metadata, reconciliation metadata, diagnostics, and persistence paths.

I then rewired `src/bridge/server.mjs` so action-bearing `/__sfrb/editor` requests call the shared runner instead of reimplementing the mutation pipeline locally. The legacy whole-document write branch stayed intact for migration compatibility, but action mutation behavior now comes from the shared module.

On the CLI side I added `src/commands/edit.ts` and registered it from `src/cli.ts`. `sfrb edit` accepts one canonical action payload from exactly one source at a time:

- `--action '<json>'`
- `--action-file path/to/action.json`
- stdin

Default output is concise, human-readable, and action/outcome-focused; `--json` emits the normalized result payload for automation. Invalid or blocked actions return inspectable no-write results and leave `resume.sfrb.json` byte-stable.

I also added `tests/cli/edit-command.test.ts` for help discovery, the three representative success paths (`replace_block_text`, `set_frame_box`, `reconcile_freeform_exit`), and a blocked `set_frame_box` no-write case. `tests/bridge/bridge-editor-contract.test.ts` was extended to assert the shared saved/no-write normalization on bridge responses as well.

One extra fix was needed during verification: the CLI/bridge tests were resolving `dist/cli.js` from the repo root rather than this worktree because the test runner’s `process.cwd()` differed from the task working directory. I updated the CLI/bridge test helpers to resolve the worktree root from the test file path so the shipped runtime checks exercise the correct build artifacts.

## Verification

Passed task-level verification:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts tests/cli/edit-command.test.ts tests/cli/open-command.test.ts tests/cli/init-command.test.ts`
- `npm run build`

Also ran the slice web verification suite after the shared-runner change and it still passed:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`

Manual command smoke passed from the worktree against a temp workspace:

- `node dist/cli.js edit --cwd <tmp> --action '{"kind":"replace_block_text",...}'`
- stdout reported `replace_block_text: saved (saved)` plus the workspace path, without dumping the document
- `resume.sfrb.json` persisted the edited text as expected

Slice-level verification status at T01:

- ✅ task-level CLI/bridge suite
- ✅ web suite
- ✅ `npm run build`
- ⏳ `node scripts/verify-s07-cli-parity-smoke.mjs` not yet runnable in T01 because that T03-owned script does not exist yet
- ⏳ human/UAT shell-polish check deferred to T02/T03

## Diagnostics

Future agents can inspect this work through:

- `dist/cli.js edit --json ...` for machine-readable action results
- default `dist/cli.js edit ...` output for concise human-readable action kind + saved/no-write summaries
- `/__sfrb/bootstrap` to confirm bridge-side persisted state after an action
- `resume.sfrb.json` to confirm disk writes or byte-stable no-write behavior
- `tests/cli/edit-command.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` for parity expectations

Normalized failure results expose action parse failures, blocked actions, and physics/document validation problems through one shared shape with `code`, `message`, `issues`, and `writeOutcome: "no_write"`.

## Deviations

- I updated `tests/utils/bridge-browser.ts` and `tests/cli/open-command.test.ts` in addition to the originally listed files so the verification suite resolves this worktree’s `dist/cli.js` explicitly instead of whichever repository root the test runner happens to use.

## Known Issues

- `scripts/verify-s07-cli-parity-smoke.mjs` is still pending because it belongs to T03.
- The slice’s human/UAT shell-polish check is still pending because T02 has not landed yet.

## Files Created/Modified

- `src/editor/workspace-action-runner.ts` — new shared canonical action runner and document-persistence validation seam
- `src/commands/edit.ts` — generic `sfrb edit` command with `--action`, `--action-file`, stdin, and `--json`
- `src/cli.ts` — registered the new `edit` command
- `src/bridge/server.mjs` — rewired bridge action mutations to the shared runner and preserved whole-document writes
- `tests/cli/edit-command.test.ts` — end-to-end CLI parity coverage for representative saved and no-write outcomes
- `tests/bridge/bridge-editor-contract.test.ts` — added saved/no-write normalization assertions on bridge responses
- `tests/utils/bridge-browser.ts` — made bridge/browser helpers resolve the worktree build explicitly
- `tests/cli/open-command.test.ts` — made CLI runtime verification resolve the worktree build explicitly
- `.gsd/milestones/M002/slices/S07/S07-PLAN.md` — marked T01 complete
- `.gsd/STATE.md` — advanced the slice’s next action to T02
