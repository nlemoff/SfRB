---
id: T03
parent: S07
milestone: M002
provides:
  - An authoritative built-runtime CLI parity smoke verifier plus final README/requirement/roadmap/slice evidence that closes S07 truthfully.
key_files:
  - scripts/verify-s07-cli-parity-smoke.mjs
  - README.md
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
  - .gsd/milestones/M002/slices/S07/S07-SUMMARY.md
key_decisions:
  - Proved direct CLI parity against one live built bridge so command output, `/__sfrb/bootstrap`, and `resume.sfrb.json` could all be checked against the same real workspace state instead of inferred separately.
patterns_established:
  - Final slice closure should land a shipped-runtime smoke verifier that exercises representative built entrypoints and validates both success and no-write outcomes across CLI output, bridge bootstrap state, and canonical disk state.
observability_surfaces:
  - scripts/verify-s07-cli-parity-smoke.mjs
  - dist/cli.js edit
  - /__sfrb/bootstrap
  - resume.sfrb.json
  - README.md
  - .gsd/milestones/M002/slices/S07/S07-SUMMARY.md
duration: ~2h
verification_result: passed
completed_at: 2026-03-17 00:47 PDT
blocker_discovered: false
---

# T03: Prove built-runtime CLI parity and record final slice evidence

**Added an authoritative `dist/cli.js edit` smoke proof, updated the README for real users/scripts, and recorded the final S07 evidence across requirements, roadmap, and slice summary artifacts.**

## What Happened

I started by reading the existing shipped-runtime verifiers and the bridge-browser helpers so the new proof would follow the same temp-workspace → built bridge → bootstrap/disk inspection pattern rather than inventing a new style.

From that pattern I added `scripts/verify-s07-cli-parity-smoke.mjs`. The script:

- builds the worktree runtime
- creates a real temporary design workspace from the built starter factory
- opens the built `dist/cli.js open` bridge on that workspace
- runs representative direct `dist/cli.js edit` actions against the same workspace for:
  - text: `replace_block_text` via `--action`
  - layout: `set_frame_box` via `--action-file --json`
  - reconciliation: `reconcile_freeform_exit` via stdin + `--json`
- confirms each success through command output plus `/__sfrb/bootstrap` and `resume.sfrb.json`
- proves one invalid/no-write path by attempting a blocked locked-group `set_frame_box`, then asserting the CLI returns `action_invalid` / `writeOutcome: "no_write"` and that both bootstrap and disk state remain unchanged

I then updated `README.md` so the project’s external story matches the shipped product after S07 instead of the pre-M002 state. The README now:

- describes M002 as the current stable baseline
- calls out `sfrb edit` as a shipped command
- documents inline JSON, action-file, and stdin usage
- explains default concise output vs `--json`
- points readers to `node scripts/verify-s07-cli-parity-smoke.mjs` for the direct CLI parity proof

For the formal evidence trail, I updated `.gsd/REQUIREMENTS.md` and `.gsd/milestones/M002/M002-ROADMAP.md`, then wrote `.gsd/milestones/M002/slices/S07/S07-SUMMARY.md`.

Those artifacts now record that:

- **R009** is validated by direct built-runtime CLI invocation proof
- **R011** now has real implementation and browser/UAT evidence, but remains a quality attribute with ongoing human judgment rather than something automation can permanently retire
- **S07** is complete and closes M002’s remaining direct-CLI parity gap

I also ran the real-browser shell check required by the slice’s human/UAT note. On a local built bridge serving a template design workspace, the product now reads as editing-first, the workspace inspector starts collapsed, and the summary still advertises access to bridge/AI/consultant/payload details when needed.

## Verification

Passed the task-plan verification commands:

- `npm run build && node /home/nlemo/SfRB/.gsd/worktrees/M002/scripts/verify-s07-cli-parity-smoke.mjs`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/cli/edit-command.test.ts tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`

Passed the full slice-level verification gates required on the final task:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts tests/cli/edit-command.test.ts tests/cli/open-command.test.ts tests/cli/init-command.test.ts`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/cli/edit-command.test.ts tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`
- `npm run build`
- `node scripts/verify-s07-cli-parity-smoke.mjs`
- failure-path check inside the S07 smoke script: blocked `set_frame_box` returned `action_invalid` / `no_write` while `/__sfrb/bootstrap` and `resume.sfrb.json` stayed unchanged
- human/UAT browser check against a local built bridge: editing-first first impression confirmed, with `#workspace-inspector` collapsed by default and the secondary inspector still discoverable

## Diagnostics

Future agents can inspect this work through:

- `node scripts/verify-s07-cli-parity-smoke.mjs` — authoritative shipped-runtime CLI parity proof
- `dist/cli.js edit` — direct command surface for inline JSON, action-file, and stdin inputs
- `dist/cli.js edit --json ...` — normalized machine-readable success/no-write envelopes
- `/__sfrb/bootstrap` — bridge-visible state after each CLI mutation or failure path
- `resume.sfrb.json` — canonical on-disk result or byte-stable no-write proof
- `README.md` — user-facing invocation examples and output-mode guidance
- `.gsd/milestones/M002/slices/S07/S07-SUMMARY.md` — slice-level closure evidence for M002

## Deviations

- The background job runner executed one build+smoke command from the repository root instead of this worktree, which caused a false `MODULE_NOT_FOUND` for `scripts/verify-s07-cli-parity-smoke.mjs`. I reran the exact verification command from `/home/nlemo/SfRB/.gsd/worktrees/M002` explicitly; no product-code change was needed.

## Known Issues

- None.

## Files Created/Modified

- `scripts/verify-s07-cli-parity-smoke.mjs` — new built-runtime proof for direct CLI editing parity and no-write guarantees
- `README.md` — updated stable-status story plus practical `sfrb edit` usage/output documentation
- `.gsd/REQUIREMENTS.md` — recorded R009 as validated and updated R011 evidence/ongoing UAT note
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S07 complete and retired the remaining direct-CLI parity risk
- `.gsd/milestones/M002/slices/S07/S07-SUMMARY.md` — final slice closure summary for S07/M002
- `.gsd/milestones/M002/slices/S07/S07-PLAN.md` — marked T03 complete
- `.gsd/STATE.md` — advanced project state past S07/M002 execution
