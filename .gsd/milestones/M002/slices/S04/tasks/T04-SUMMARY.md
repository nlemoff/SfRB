---
id: T04
parent: S04
milestone: M002
provides:
  - Built-runtime proof that Text mode works in document and design workspaces, that a canonical text edit plus structure edit persist through bootstrap/disk, and that invalid text actions surface diagnostics without writing.
key_files:
  - scripts/verify-s04-editor-smoke.mjs
  - .gsd/milestones/M002/slices/S04/S04-SUMMARY.md
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
  - .gsd/milestones/M002/slices/S04/S04-PLAN.md
  - .gsd/STATE.md
key_decisions:
  - Reused the built starter factory from `dist/document/starters.js` inside the smoke verifier so the shipped proof exercises the same production template document shape as the rest of the runtime.
  - Verified canonical persistence by polling `/__sfrb/bootstrap` after UI actions instead of assuming the browser’s last-action label and bridge refetch become consistent at the same instant.
patterns_established:
  - Shipped runtime smoke for canonical editor features should prove success via UI action → `Last action` → `/__sfrb/bootstrap` → `resume.sfrb.json`, then prove failure via actionable `action_invalid` diagnostics plus byte-stable disk state.
observability_surfaces:
  - `#editing-lenses[data-active-lens]`
  - `#editor-last-action-kind[data-action-kind]`
  - `/__sfrb/bootstrap`
  - `/__sfrb/editor`
  - `resume.sfrb.json`
  - `.gsd/milestones/M002/slices/S04/S04-SUMMARY.md`
duration: ~1h
verification_result: passed
completed_at: 2026-03-17T03:18:06Z
blocker_discovered: false
---

# T04: Extend built-runtime smoke proof for text mode and record slice evidence

**Extended the shipped S04 smoke verifier so the built CLI/browser loop now proves Text mode success and invalid-action no-write behavior in both document and design workspaces, then recorded that proof in the slice and requirement artifacts.**

## What Happened

I replaced the old M001-style smoke flow in `scripts/verify-s04-editor-smoke.mjs` with an S04-specific built-runtime verifier. The new script builds the app, creates real template workspaces through the production starter factory, opens each workspace via `dist/cli.js open`, enters the Text lens, performs a real `replace_block_text` edit and canonical `insert_block` structure edit, and then re-reads `/__sfrb/bootstrap` plus on-disk `resume.sfrb.json` to prove the canonical document changed.

For the failure path, the same smoke flow now submits an invalid text action (`remove_block` against `skillsBlock`, which is the only block in its section) and asserts that the bridge returns `action_invalid` with actionable issues while both bootstrap and on-disk state remain unchanged. The verifier also confirms that the visible `Last action` diagnostic stays on the last successful canonical action rather than drifting on the failed request.

Once the verifier passed, I recorded the evidence in `.gsd/milestones/M002/slices/S04/S04-SUMMARY.md`, updated R008’s validation note in `.gsd/REQUIREMENTS.md`, marked S04 complete in `.gsd/milestones/M002/M002-ROADMAP.md`, and prepared the slice/task plan/state files for handoff to the next slice.

## Verification

Passed:
- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-text-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs`

Important verification note:
- The slice plan listed absolute worktree test paths, but Vitest excludes `.gsd/**`; from this worktree shell, the equivalent repo-relative test paths above are the executable commands and all passed.

## Diagnostics

Inspect later via:
- `node scripts/verify-s04-editor-smoke.mjs`
- `#editing-lenses[data-active-lens]`
- `#editor-last-action-kind[data-action-kind]`
- `/__sfrb/bootstrap`
- `/__sfrb/editor`
- `resume.sfrb.json`
- `.gsd/milestones/M002/slices/S04/S04-SUMMARY.md`

The smoke verifier now exposes two clear failure classes: canonical persistence drift after successful text actions, and silent-write regressions where invalid text actions return diagnostics but still mutate bootstrap or disk.

## Deviations

- The verifier now imports the built `dist/document/starters.js` factory instead of maintaining a smoke-only hand-authored template document.
- Verification commands are recorded with repo-relative test paths because the literal absolute worktree paths from the task plan are filtered out by the package’s Vitest exclude rules.

## Known Issues

- None.

## Files Created/Modified

- `scripts/verify-s04-editor-smoke.mjs` — replaced the old smoke flow with S04 text-mode success and invalid-action no-write runtime proof.
- `.gsd/milestones/M002/slices/S04/S04-SUMMARY.md` — recorded slice-level built-runtime evidence and pass set.
- `.gsd/REQUIREMENTS.md` — updated R008 evidence to reflect S04’s shipped Text-lens proof.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S04 complete with a more specific closure note.
- `.gsd/milestones/M002/slices/S04/S04-PLAN.md` — will mark T04 complete.
- `.gsd/STATE.md` — will advance the active slice/next action after S04 closure.
