---
id: T04
parent: S03
milestone: M002
provides:
  - Built-runtime operational proof that canonical tile split/group/lock/translate actions survive the shipped `dist/cli.js open` bridge/bootstrap/disk loop and that invalid tile actions do not write.
key_files:
  - scripts/verify-s03-tile-engine.mjs
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
  - .gsd/milestones/M002/slices/S03/S03-PLAN.md
  - .gsd/STATE.md
key_decisions:
  - Kept the new proof as a standalone `node`-runnable script that mirrors the real bridge mutation sequence instead of depending on Vitest or browser helpers, so later agents can inspect shipped-runtime tile persistence with one command.
patterns_established:
  - Slice-closing runtime proof should compare the canonical document returned by `/__sfrb/bootstrap` against on-disk `resume.sfrb.json` after each meaningful action sequence and again after an invalid action to catch write drift.
observability_surfaces:
  - `node scripts/verify-s03-tile-engine.mjs`; `/__sfrb/editor` `actionKind`/`code`/`name`/`issues`; `/__sfrb/bootstrap`; `resume.sfrb.json`
duration: 55m
verification_result: passed
completed_at: 2026-03-16 19:00 PDT
blocker_discovered: false
---

# T04: Add built-runtime tile smoke proof and finalize slice evidence

**Added a shipped-runtime tile smoke verifier, proved the invalid-action no-write path, and recorded S03/R015 as operationally validated.**

## What Happened

I added `scripts/verify-s03-tile-engine.mjs` as the slice-closing runtime proof for S03. The script builds the app, creates a real design workspace, starts the shipped `dist/cli.js open` runtime, and drives the canonical tile action sequence through `/__sfrb/editor`: `split_block` → `create_frame_group` → `set_frame_group_locked` → `translate_frame_group`.

The verifier then waits for `/__sfrb/bootstrap` to reflect the expected grouped/locked/translated tile state and compares that canonical document against on-disk `resume.sfrb.json` to prove bridge/bootstrap/disk parity. It also sends an intentionally invalid `translate_frame_group` for a missing group and asserts that the bridge returns actionable `action_invalid` diagnostics while both bootstrap and disk remain byte-stable.

After the proof passed, I updated `.gsd/REQUIREMENTS.md` to mark R015 validated with explicit evidence, updated `.gsd/milestones/M002/M002-ROADMAP.md` to retire S03/fine-grained tile decomposition with the new built-runtime proof, marked T04 complete in `.gsd/milestones/M002/slices/S03/S03-PLAN.md`, and advanced `.gsd/STATE.md` to the next slice.

## Verification

- `node scripts/verify-s03-tile-engine.mjs` ✅
- `npm test -- --run tests/document/editor-actions.test.ts tests/document/starter-documents.test.ts tests/bridge/bridge-editor-contract.test.ts tests/web/editor-design-mode.test.ts tests/web/editor-tile-mode.test.ts && node scripts/verify-s03-tile-engine.mjs` ✅
  - 5 test files passed
  - 23 tests passed
  - built-runtime tile verifier passed again after the slice suite

Explicit runtime behaviors confirmed:
- built `dist/cli.js open` served a real design workspace
- split/group/lock/translate actions persisted through `/__sfrb/editor`
- `/__sfrb/bootstrap` and `resume.sfrb.json` matched the same canonical post-translation tile/group state
- invalid tile action returned `action_invalid` + `EditorActionApplicationError` diagnostics
- invalid tile action caused no bootstrap drift and no disk write drift

## Diagnostics

Future agents can inspect S03 proof via:

- `node scripts/verify-s03-tile-engine.mjs`
- `/__sfrb/editor` success envelopes with `actionKind`
- `/__sfrb/editor` failure envelopes with `code`, `name`, and `issues`
- `/__sfrb/bootstrap` for canonical grouped/locked frame state after runtime mutations
- `resume.sfrb.json` for the persisted post-split/post-translate document
- `.gsd/REQUIREMENTS.md` R015 notes and `.gsd/milestones/M002/M002-ROADMAP.md` S03 notes for recorded milestone evidence

## Deviations

None.

## Known Issues

- The slice-plan verification commands should be run with worktree-relative `tests/...` paths in this repo. Passing absolute `.gsd/worktrees/...` paths to Vitest can be filtered out by the repo’s `**/.gsd/**` exclusion even when the worktree itself is correct.

## Files Created/Modified

- `scripts/verify-s03-tile-engine.mjs` — built-runtime tile smoke verifier covering split/group/lock/translate success plus invalid-action no-write proof.
- `.gsd/REQUIREMENTS.md` — marked R015 validated and recorded the new runtime proof in requirement evidence.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S03 complete and retired the fine-grained tile decomposition risk with built-runtime proof language.
- `.gsd/milestones/M002/slices/S03/S03-PLAN.md` — marked T04 complete.
- `.gsd/STATE.md` — advanced state to the next slice after S03 closure.
