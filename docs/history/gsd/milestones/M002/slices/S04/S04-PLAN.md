# S04: Text Mode as Real Writing Surface

**Goal:** Deliver a true text mode that feels like a calm writing surface, supports the first useful layer of structure edits, and keeps all meaningful changes flowing through the canonical resume engine instead of browser-only state.
**Demo:** From either a document or design workspace, a user can switch into an explicit Text mode, edit resume content in a writing-first surface, perform basic structure changes such as adding/removing/reordering blocks, and watch those changes persist through `/__sfrb/editor`, `/__sfrb/bootstrap`, and on-disk `resume.sfrb.json` without losing focus or being dropped back into frame/tile interaction chrome.

S04 is ordered around the trust boundary identified in research: text mode only becomes real once writing-first interactions are separated from workspace physics while still committing through canonical actions. That drives the sequence here. Task 1 establishes the minimal canonical structure-action set so text mode can do more than string replacement. Task 2 introduces the lens shell and calm text-surface chrome distinct from physics. Task 3 connects that surface to focused writing/restructure behaviors with browser proof in both document and design workspaces. Task 4 closes the slice with built-runtime evidence so later reconciliation work in S06 can trust the text lens as a real product surface rather than a mock UI.

This slice directly advances **R008** by making text mode a real guided lens, materially advances **R011** by replacing diagnostics-heavy editing chrome with a calmer editorial surface, and establishes the text-side observability and action semantics that **R012** needs before mode-reconciliation policy is finalized in S06.

## Must-Haves

- Text mode is a real, explicit lens in the product shell and is available in both document and design workspaces without being conflated with canonical `workspace.physics`.
- The text surface feels writing-first: it removes tile/drag affordances while active, keeps focus stable through save/refetch, and uses subtle status feedback instead of noisy developer diagnostics.
- Meaningful text-mode edits, including the first basic structure transforms for adding/removing/reordering content, are represented as canonical editor actions and persist through the existing validated bridge/document boundary.
- Browser/runtime proof shows text mode works against the shipped local loop (`dist/cli.js open`), keeps `Last action` inspectable, and leaves `resume.sfrb.json` authoritative after refresh.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-text-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-design-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs`
- Failure-path check: submit an invalid text-structure action through `/__sfrb/editor` and verify the response exposes actionable diagnostics while both `/__sfrb/bootstrap` and `resume.sfrb.json` remain unchanged.

## Observability / Diagnostics

- Runtime signals: active editor lens, active text block/section identity, save-status transitions, last canonical action kind, and bridge validation/apply failure details for text-structure actions.
- Inspection surfaces: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, stable browser testids/selectors for the active lens and text-surface state, `/__sfrb/editor`, `/__sfrb/bootstrap`, `resume.sfrb.json`, `tests/web/editor-text-mode.test.ts`, and `scripts/verify-s04-editor-smoke.mjs`.
- Failure visibility: a future agent can distinguish lens/physics confusion, focus-loss regressions during autosave, missing text mode in design workspaces, malformed structure-action payloads, and silent no-write failures at the bridge boundary.
- Redaction constraints: diagnostics may expose canonical ids, starter metadata, workspace-relative paths, and action kinds, but must never expose provider secrets or unrelated local environment values.

## Integration Closure

- Upstream surfaces consumed: S01 starter/bootstrap guidance metadata, S02 canonical editor action/apply contract, existing bridge mutation/read endpoints, the current browser editor engine/canvas, and design-physics frame invariants from document validation.
- New wiring introduced in this slice: canonical text-structure actions → bridge/client action support → explicit text-lens shell state → writing-first canvas render path and controls → browser/runtime verification through the shipped CLI open flow.
- What remains before the milestone is truly usable end-to-end: S05 still needs the freeform element editor, S06 still needs explicit reconciliation and overflow continuity policy across text/tile/freeform, and S07 still needs direct CLI invocation parity plus final polish across the whole editor.

## Tasks

- [x] **T01: Add canonical text-structure actions for writing-first edits** `est:3h`
  - Why: S04 cannot honestly claim a “real writing surface” if text mode only rewrites existing block strings; the first add/remove/reorder operations must exist as canonical actions before the browser can expose them without breaking S02/S07 parity.
  - Files: `src/editor/actions.ts`, `web/src/bridge-client.ts`, `src/document/validation.ts`, `tests/document/editor-actions.test.ts`, `tests/bridge/bridge-editor-contract.test.ts`
  - Do: Extend the shared editor action contract with a minimal text-mode structure set for writing-first operations such as inserting a block near the current block, removing a block, and reordering blocks/sections in ways the existing semantic model supports; keep design-workspace frame-link invariants valid when structure changes occur; thread the new actions through the browser bridge helpers without inventing a text-only endpoint; and add contract/integration tests covering valid apply paths plus invalid-action no-write behavior.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts && npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
  - Done when: text-mode structure actions parse and apply deterministically, resulting documents still satisfy workspace validation in both physics modes, and invalid payloads fail with actionable diagnostics instead of partial writes.
- [x] **T02: Introduce an explicit text lens and calm writing-surface shell** `est:3h`
  - Why: R008 and R011 both depend on users seeing a real mode switch and an editorial surface, not just guidance cards plus the old frame/document canvas chrome.
  - Files: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, `tests/web/editor-first-run-guidance.test.ts`, `tests/web/editor-text-mode.test.ts`
  - Do: Add browser-local lens selection that is clearly separate from canonical `physics`; make Text mode available in both document and design workspaces; render a calmer text-focused surface with explicit active-lens observability, restrained structure cues, and subtle save feedback; and hide tile/drag affordances while text mode is active without regressing the existing guidance surface.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts && npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-text-mode.test.ts`
  - Done when: the browser exposes a distinct Text lens, the active lens is inspectable in tests, the text surface reads as writing-first rather than frame-first, and design workspaces can enter text mode without showing tile/drag chrome.
- [x] **T03: Wire text-mode editing and restructuring through the browser engine** `est:4h`
  - Why: The slice promise is only credible once real writing interactions—content edits plus basic structure operations—work end-to-end from the text surface through canonical saves while preserving focus and trust.
  - Files: `web/src/editor/engine.ts`, `web/src/editor/Canvas.tsx`, `web/src/bridge-client.ts`, `tests/web/editor-text-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, `tests/utils/bridge-browser.ts`
  - Do: Extend the editor engine with text-lens-local focus/selection state, command handlers, and quiet commit behavior for the new structure actions while keeping drafting/focus session-local; hook the text surface controls and keyboard-friendly affordances to those canonical actions; preserve focus/caret through save/refetch; and add browser coverage proving edits and restructuring work in both document and design workspaces while `Last action` stays canonical.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-text-mode.test.ts && npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-design-mode.test.ts`
  - Done when: a user can rewrite content, insert/remove/reorder supported structures from text mode, stay in flow through autosave/refetch, and see canonical action kinds rather than browser-only whole-document writes.
- [x] **T04: Extend built-runtime smoke proof for text mode and record slice evidence** `est:1h`
  - Why: S04 is not retired until the shipped `dist/cli.js open` runtime proves that the new text lens and writing actions survive the real bridge/bootstrap/disk loop instead of only passing in-process browser tests.
  - Files: `scripts/verify-s04-editor-smoke.mjs`, `tests/utils/bridge-browser.ts`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, `.gsd/milestones/M002/slices/S04/S04-SUMMARY.md`
  - Do: Extend the existing S04 smoke verifier so it opens a real document and design workspace through the built CLI, switches into text mode, performs at least one content edit plus one structure edit, rechecks `/__sfrb/bootstrap` and on-disk `resume.sfrb.json`, and verifies an invalid text action yields diagnostics with no write; then record the resulting requirement/slice evidence in the milestone artifacts after the verifier passes.
  - Verify: `node scripts/verify-s04-editor-smoke.mjs`
  - Done when: the built runtime demonstrates text-mode editing and restructuring through the canonical loop, the failure path is inspectable, and slice evidence is ready for requirement/status updates.

## Files Likely Touched

- `src/editor/actions.ts`
- `src/document/validation.ts`
- `web/src/bridge-client.ts`
- `web/src/App.tsx`
- `web/src/editor/Canvas.tsx`
- `web/src/editor/engine.ts`
- `tests/document/editor-actions.test.ts`
- `tests/bridge/bridge-editor-contract.test.ts`
- `tests/web/editor-first-run-guidance.test.ts`
- `tests/web/editor-text-mode.test.ts`
- `tests/web/editor-design-mode.test.ts`
- `tests/utils/bridge-browser.ts`
- `scripts/verify-s04-editor-smoke.mjs`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M002/M002-ROADMAP.md`
- `.gsd/milestones/M002/slices/S04/S04-SUMMARY.md`
