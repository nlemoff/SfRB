---
estimated_steps: 5
estimated_files: 6
---

# T01: Wire one shared canonical action runner into the bridge and `sfrb edit`

**Slice:** S07 — CLI Editing Parity & Product Polish
**Milestone:** M002

## Description

Close the actual parity gap first. This task should extract the bridge’s workspace mutation pipeline into one shared runner and use it to ship a generic `sfrb edit` command, so direct CLI edits and browser edits stay on the same canonical action path instead of drifting into separate implementations.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the current mutation flow in `src/bridge/server.mjs` together with `src/editor/actions.ts`, `src/document/validation.ts`, and the workspace store helpers to identify the exact read → parse → apply → validate → write seam that must be shared.
2. Create `src/editor/workspace-action-runner.ts` (or an equivalent clearly shared module if a nearby name fits better) that owns this pipeline and returns normalized success/no-write metadata the bridge and CLI can both surface.
3. Rewire `src/bridge/server.mjs` to call the shared runner, then add `src/commands/edit.ts` and register it from `src/cli.ts` so `sfrb edit` accepts canonical action payloads from `--action`, `--action-file`, and stdin without inventing a second action grammar.
4. Implement concise human-readable stdout by default plus an opt-in `--json` mode, keeping invalid payloads and blocked actions inspectable while preserving byte-stable `resume.sfrb.json` on no-write paths.
5. Add or extend `tests/cli/edit-command.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` to cover representative success cases (`replace_block_text`, `set_frame_box`, `reconcile_freeform_exit`) and one invalid/no-write case that proves bridge and CLI now share behavior.

## Must-Haves

- [ ] The bridge and CLI both call the same shared workspace action runner; no duplicate mutation pipeline remains in the CLI command.
- [ ] `sfrb edit` supports practical automation input (`--action`, `--action-file`, stdin) and an opt-in `--json` output mode.
- [ ] Invalid or blocked actions produce inspectable no-write results and leave `resume.sfrb.json` unchanged.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts tests/cli/edit-command.test.ts tests/cli/open-command.test.ts tests/cli/init-command.test.ts`
- Run one representative manual command from the worktree against a temp workspace and confirm stdout reports the action kind plus write/no-write outcome without dumping the whole document.

## Observability Impact

- Signals added/changed: CLI action kind, write vs no-write outcome, diagnostics summary, optional machine-readable result payload.
- How a future agent inspects this: run `dist/cli.js edit --json ...`, inspect `resume.sfrb.json`, or compare bridge and CLI behavior through the shared tests.
- Failure state exposed: action parse failures, validation failures, and physics mismatches become visible through one normalized runner result rather than ad hoc command errors.

## Inputs

- `src/bridge/server.mjs` — existing canonical workspace mutation seam already used by the browser.
- `src/editor/actions.ts` — discriminated union for every meaningful editor action.
- `src/document/validation.ts`, `src/document/store.ts`, `src/config/store.ts` — validation and workspace file boundaries the CLI must not bypass.
- `tests/bridge/bridge-editor-contract.test.ts`, `tests/cli/open-command.test.ts`, `tests/cli/init-command.test.ts` — existing command and bridge test patterns to match.
- S07 research plus decisions D025, D037, and D039 — the CLI must stay generic, action-shaped, and parity-safe.

## Expected Output

- `src/editor/workspace-action-runner.ts` — shared bridge/CLI mutation runner for canonical actions.
- `src/commands/edit.ts` and `src/cli.ts` — working `sfrb edit` command wired into the CLI entrypoint.
- `tests/cli/edit-command.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` — proof that direct CLI edits and bridge edits share success and no-write behavior.
