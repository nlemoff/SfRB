---
estimated_steps: 4
estimated_files: 6
---

# T03: Prove built-runtime CLI parity and record final slice evidence

**Slice:** S07 — CLI Editing Parity & Product Polish
**Milestone:** M002

## Description

Finish at the real entrypoint. This task should prove representative direct CLI actions against built `dist/cli.js`, then update the roadmap, requirements, README, and slice summary so later agents can trust S07 as the milestone-closing slice without re-deriving its proof.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the existing shipped-runtime verifiers (`scripts/verify-s02-editor-actions.mjs`, `scripts/verify-s06-mode-reconciliation-smoke.mjs`) and the helpers in `tests/utils/bridge-browser.ts` so the new proof reuses the established temp-workspace/open/bootstrap/disk pattern.
2. Add `scripts/verify-s07-cli-parity-smoke.mjs` to build or consume built `dist/`, create a temp workspace, run representative `dist/cli.js edit` actions for text, layout, and reconciliation, then assert both success and invalid/no-write outcomes through command output, `/__sfrb/bootstrap`, and `resume.sfrb.json`.
3. Update `README.md` so the new command is discoverable for real users/scripts, including practical input forms (`--action`, `--action-file`, stdin) and the concise default vs `--json` behavior.
4. Record final evidence in `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, and `.gsd/milestones/M002/slices/S07/S07-SUMMARY.md`, calling out that R009 is now proven by direct CLI invocation and noting any remaining UAT judgment for R011.

## Must-Haves

- [ ] The smoke verifier proves built `dist/cli.js edit` behavior on a real workspace, not just in Vitest.
- [ ] The verifier includes at least one invalid/no-write case that confirms `/__sfrb/bootstrap` and `resume.sfrb.json` remain unchanged.
- [ ] README and slice evidence tell the truthful post-S07 story so another agent can consume the command and proof trail directly.

## Verification

- `npm run build && node scripts/verify-s07-cli-parity-smoke.mjs`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/cli/edit-command.test.ts tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`

## Observability Impact

- Signals added/changed: shipped-runtime CLI parity smoke output, documented command examples, and final slice evidence pointers.
- How a future agent inspects this: run `node scripts/verify-s07-cli-parity-smoke.mjs`, read the updated README and S07 summary, and inspect `/__sfrb/bootstrap` plus `resume.sfrb.json` during failures.
- Failure state exposed: built-runtime regressions in direct CLI editing, no-write guarantees, or shell observability are isolated at the shipped entrypoint instead of being inferred from unit tests alone.

## Inputs

- `scripts/verify-s02-editor-actions.mjs` and `scripts/verify-s06-mode-reconciliation-smoke.mjs` — prior shipped-runtime proof patterns to reuse.
- `tests/utils/bridge-browser.ts` — reusable temp-workspace and browser/bootstrap helpers.
- `README.md` — current CLI docs that only describe `init` and `open`.
- `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, and the future `S07-SUMMARY.md` — evidence artifacts that should reflect the finished slice.
- Outputs from T01 and T02 — working `sfrb edit` command and polished shell selectors the smoke/doco updates must reference truthfully.

## Expected Output

- `scripts/verify-s07-cli-parity-smoke.mjs` — authoritative built-runtime proof for direct CLI editing parity.
- `README.md` — user-facing documentation for `sfrb edit`.
- `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, `.gsd/milestones/M002/slices/S07/S07-SUMMARY.md` — final evidence showing how S07 closes the milestone.
