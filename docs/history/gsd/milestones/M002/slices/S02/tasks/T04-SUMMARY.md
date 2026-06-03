---
id: T04
parent: S02
milestone: M002
provides:
  - Built-runtime smoke proof that canonical editor actions persist through the shipped `/__sfrb/editor` bridge with success and failure-path checks against bootstrap and disk state.
key_files:
  - scripts/verify-s02-editor-actions.mjs
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
  - .gsd/KNOWLEDGE.md
  - .gsd/STATE.md
  - .gsd/milestones/M002/slices/S02/S02-PLAN.md
key_decisions:
  - Keep R009 active after S02 and record only browser/runtime action-proof evidence, because direct CLI invocation parity is still explicitly owned by S07.
patterns_established:
  - Built-runtime smoke checks should drive `dist/cli.js open`, mutate `/__sfrb/editor` directly with canonical actions, then compare `/__sfrb/bootstrap` and on-disk `resume.sfrb.json` before and after invalid payloads.
observability_surfaces:
  - scripts/verify-s02-editor-actions.mjs
  - /__sfrb/editor
  - /__sfrb/bootstrap
  - resume.sfrb.json
  - action_invalid issues
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
duration: ~1h
verification_result: passed
completed_at: 2026-03-16 18:03 PDT
blocker_discovered: false
---

# T04: Add built-runtime action smoke proof and slice evidence for future CLI parity

**Added a built-runtime action smoke verifier for `/__sfrb/editor`, proved success and failure paths against bootstrap plus disk state, and updated S02/R009 evidence without overstating CLI parity.**

## What Happened

I added `scripts/verify-s02-editor-actions.mjs` as the new S02 operational proof. The script builds the project, creates a real design-mode workspace, launches the shipped `dist/cli.js open` runtime, fetches `/__sfrb/bootstrap`, posts a canonical `replace_block_text` action, confirms the updated block text in both bootstrap and `resume.sfrb.json`, then repeats the same pattern for a canonical `set_frame_box` action.

For the failure path, the script snapshots bootstrap and raw disk state, submits an invalid `replace_block_text` action with empty text, asserts a `422` `action_invalid` response with localized `issues`, and verifies that neither bootstrap state nor `resume.sfrb.json` changed. The script also fails if bridge stderr is non-empty, so runtime-only regressions stay visible.

After the smoke proof passed, I updated R009’s notes/validation to point at the new built-runtime evidence while keeping the requirement active because direct CLI invocation is still owned by S07. I also marked S02 complete in the milestone roadmap, marked T04 complete in `S02-PLAN.md`, advanced `.gsd/STATE.md` to S03, and recorded a worktree-specific Vitest path gotcha in `.gsd/KNOWLEDGE.md`.

## Verification

Passed:

- `node scripts/verify-s02-editor-actions.mjs`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-document-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-design-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-layout-consultant.test.ts`

Behavior confirmed by the smoke verifier:

- `replace_block_text` persisted through the real `/__sfrb/editor` path.
- `set_frame_box` persisted through the real `/__sfrb/editor` path.
- `/__sfrb/bootstrap` reflected both canonical mutations after persistence.
- `resume.sfrb.json` matched the canonical post-mutation state.
- Invalid action payloads returned actionable `action_invalid` diagnostics.
- Invalid action payloads did not mutate bootstrap state or disk state.

## Diagnostics

Future agents can inspect this work by:

- running `node scripts/verify-s02-editor-actions.mjs`
- watching the script’s three explicit checkpoints: text action, frame action, invalid action
- comparing `/__sfrb/bootstrap` and `resume.sfrb.json` before/after each action
- reading R009 in `.gsd/REQUIREMENTS.md` for the current evidence boundary
- reading S02 in `.gsd/milestones/M002/M002-ROADMAP.md` for the slice-level completion/evidence framing

## Deviations

- I supplemented the old S02 smoke entrypoint with a new action-focused verifier instead of rewriting `scripts/verify-s02-document-smoke.mjs`, because the old script still covers earlier document-validation behavior while the new verifier cleanly owns the canonical action proof required by T04.
- I did not need to modify `tests/utils/bridge-browser.ts`; the new runtime smoke script is self-contained and targets the built CLI/open path directly.

## Known Issues

- In this repo’s GSD worktrees, `vitest run --run tests/...` can resolve its root outside the worktree and falsely report “No test files found.” Use worktree-absolute test paths when running targeted verification from a task worktree.

## Files Created/Modified

- `scripts/verify-s02-editor-actions.mjs` — new built-runtime S02 smoke verifier for canonical text/frame action success plus invalid-action no-write proof.
- `.gsd/REQUIREMENTS.md` — updated R009 validation/notes to cite the new built-runtime action proof while leaving CLI invocation parity to S07.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S02 complete and reframed the slice/proof text around browser/runtime action proof.
- `.gsd/KNOWLEDGE.md` — recorded the Vitest/worktree targeted-run path gotcha discovered during verification.
- `.gsd/milestones/M002/slices/S02/S02-PLAN.md` — marked T04 complete.
- `.gsd/STATE.md` — advanced active slice/next action to S03.
