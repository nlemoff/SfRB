# S07: CLI Editing Parity & Product Polish

**Goal:** Close M002 by making the canonical editor action surface directly invokable from the CLI through the same mutation pipeline the browser already uses, while simplifying the browser shell so the product feels calmer, more intentional, and less developer-facing for the non-technical primary user.
**Demo:** In the shipped runtime, a user or script can run `dist/cli.js edit` with a canonical action payload, see a concise success or no-write summary, verify the same persisted result through `/__sfrb/bootstrap` and `resume.sfrb.json`, then open the editor and land in a sleeker shell where editing surfaces are primary and diagnostics/bridge/AI chrome stay inspectable but secondary by default.

S07 has two real jobs, and the order matters. First, it must retire the remaining active gap in **R009** by making direct CLI invocation use the exact same canonical action path as the bridge. If the slice starts with CLI UX copy or bespoke subcommands, parity will drift the next time a new action lands. Second, it must advance **R011** by changing the shell hierarchy rather than just tweaking labels: the editing surface should lead, while inspection-heavy panels become secondary without breaking the hidden observability contract established in S04–S06.

The plan therefore groups work into three increments. T01 closes the architectural parity gap with one generic `sfrb edit` command backed by a shared workspace mutation runner. T02 uses that foundation-free product bandwidth to demote cluttered chrome and preserve stable selectors for agents/tests. T03 finishes at the real runtime boundary by proving representative CLI actions against built `dist/cli.js`, then records the final evidence in the slice artifacts and user-facing docs. This directly delivers owned active requirements **R009** and **R011**, while supporting the already-validated non-technical flow in **R010** by making the default shell calmer.

## Must-Haves

- Direct CLI editing uses the same canonical action schema, parse/apply/validation boundary, and no-write failure semantics as the browser bridge instead of duplicating mutation logic.
- One generic CLI command can invoke representative canonical actions through JSON input that is practical for humans and automation, including inline JSON, file-based payloads, and stdin.
- CLI output is concise by default, offers an opt-in machine-readable mode, and leaves `resume.sfrb.json` byte-stable on invalid or blocked actions with inspectable diagnostics.
- The browser shell becomes materially calmer by default: primary editing surfaces stay prominent, while diagnostics, payload preview, bridge status, consultant details, and AI-heavy/developer-heavy chrome move behind a secondary disclosure without deleting stable IDs/testids.
- The built runtime proves direct CLI parity for text, layout, and reconciliation actions, and the slice artifacts update requirement/roadmap status with truthful evidence.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts tests/cli/edit-command.test.ts tests/cli/open-command.test.ts tests/cli/init-command.test.ts`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`
- `npm run build`
- `node scripts/verify-s07-cli-parity-smoke.mjs`
- Failure-path check: run an invalid `dist/cli.js edit` payload and verify the command reports a no-write/action-invalid outcome while `/__sfrb/bootstrap` and `resume.sfrb.json` remain unchanged.
- Human/UAT: open the polished editor shell on a starter workspace and confirm the first impression is editing-first rather than diagnostics-first, with the secondary inspector/disclosure still available when needed.

## Observability / Diagnostics

- Runtime signals: CLI action kind, write vs no-write outcome, reconciliation metadata, bridge/bootstrap state after edits, active shell inspector visibility, and last canonical action kind.
- Inspection surfaces: `dist/cli.js edit`, optional `--json` output, `/__sfrb/bootstrap`, `resume.sfrb.json`, `#editor-last-action-kind`, and the hidden-by-default but still present shell/inspector selectors in `web/src/App.tsx`.
- Failure visibility: invalid payload parse errors, action validation diagnostics, physics/document mismatches, and hidden-shell regressions remain visible through command output, bootstrap state, disk state, and stable DOM selectors.
- Redaction constraints: diagnostics may expose workspace-relative file paths, block/frame/group ids, and action kinds, but must not print secrets or unrelated local environment values.

## Integration Closure

- Upstream surfaces consumed: `src/editor/actions.ts`, `src/document/validation.ts`, `src/document/store.ts`, `src/config/store.ts`, `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `tests/bridge/bridge-editor-contract.test.ts`, and the S06 reconciliation contract.
- New wiring introduced in this slice: shared workspace action runner → `src/bridge/server.mjs` + `src/commands/edit.ts`/`src/cli.ts`; secondary shell inspector hierarchy in `web/src/App.tsx`; built-runtime CLI parity smoke and slice evidence updates.
- What remains before the milestone is truly usable end-to-end: nothing beyond completing this slice and confirming the planned human/UAT product-feel check.

## Tasks

- [x] **T01: Wire one shared canonical action runner into the bridge and `sfrb edit`** `est:4h`
  - Why: R009 is not actually closed until the CLI invokes the exact same mutation path as the browser; this task removes the drift risk and ships the direct command surface the milestone still lacks.
  - Files: `src/editor/workspace-action-runner.ts`, `src/bridge/server.mjs`, `src/commands/edit.ts`, `src/cli.ts`, `tests/bridge/bridge-editor-contract.test.ts`, `tests/cli/edit-command.test.ts`
  - Do: Extract the bridge’s current workspace mutation pipeline into a shared runner that reads the workspace document, parses a canonical action, applies it, validates physics, writes on success, and returns normalized action/result metadata for both success and no-write failure paths; keep `src/bridge/server.mjs` wired to that runner; add a generic `sfrb edit` command registered from `src/cli.ts`; and support practical action input via `--action`, `--action-file`, and stdin, with concise default output plus opt-in `--json`. Relevant skill to load before implementation: `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts tests/cli/edit-command.test.ts tests/cli/open-command.test.ts tests/cli/init-command.test.ts`
  - Done when: a representative `replace_block_text`, `set_frame_box`, and `reconcile_freeform_exit` payload all succeed through `sfrb edit`, invalid payloads fail without write drift, and the bridge plus CLI both use the same shared runner rather than duplicated mutation code.
- [x] **T02: Demote technical shell chrome behind a calm default inspector model** `est:3h`
  - Why: R011 depends more on shell hierarchy than copy; the product will still feel raw if diagnostics and payload chrome remain first-order even after CLI parity lands.
  - Files: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, `tests/web/editor-first-run-guidance.test.ts`, `tests/web/editor-text-mode.test.ts`, `tests/web/editor-mode-reconciliation.test.ts`, `tests/web/editor-freeform-mode.test.ts`
  - Do: Rework the top-level browser shell so the editor canvas, mode guidance, and essential actions are primary while diagnostics, payload preview, bridge status, consultant details, and AI/developer-heavy panels move into a secondary inspector/disclosure that starts collapsed or otherwise de-emphasized by default; preserve existing IDs/testids and hidden-state semantics for agent inspection; and keep Text especially calm without regressing S06 reconciliation visibility. Relevant skills to load before implementation: `frontend-design`, `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`
  - Done when: the default shell presents editing-first product chrome, the secondary inspector remains inspectable through stable selectors, and the updated browser tests prove that the hidden/de-emphasized panels are still present for diagnostics and automation.
- [x] **T03: Prove built-runtime CLI parity and record final slice evidence** `est:3h`
  - Why: The milestone only closes when the shipped `dist/cli.js` proves direct CLI action parity on a real workspace and the project artifacts record that truthfully for later slices and agents.
  - Files: `scripts/verify-s07-cli-parity-smoke.mjs`, `tests/utils/bridge-browser.ts`, `README.md`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, `.gsd/milestones/M002/slices/S07/S07-SUMMARY.md`
  - Do: Add a dedicated S07 smoke verifier that builds the app, creates a real temp workspace, runs representative `dist/cli.js edit` actions for text, layout, and freeform-reconciliation paths, checks invalid/no-write behavior, and confirms the resulting state through command output, `/__sfrb/bootstrap`, and `resume.sfrb.json`; then update README/help-facing docs and record the final evidence in the requirement, roadmap, and slice summary artifacts, including any remaining UAT caveat for product feel. Relevant skill to load before implementation: `test`.
  - Verify: `npm run build && node scripts/verify-s07-cli-parity-smoke.mjs && npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/cli/edit-command.test.ts tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`
  - Done when: built `dist/cli.js edit` truthfully proves direct CLI invocation parity and no-write behavior on a real workspace, README/artifact evidence reflects the new command and proof trail, and S07 has a final summary another agent can trust without reopening the slice.

## Files Likely Touched

- `src/editor/workspace-action-runner.ts`
- `src/bridge/server.mjs`
- `src/commands/edit.ts`
- `src/cli.ts`
- `tests/bridge/bridge-editor-contract.test.ts`
- `tests/cli/edit-command.test.ts`
- `web/src/App.tsx`
- `web/src/editor/Canvas.tsx`
- `web/src/editor/engine.ts`
- `tests/web/editor-first-run-guidance.test.ts`
- `tests/web/editor-text-mode.test.ts`
- `tests/web/editor-mode-reconciliation.test.ts`
- `tests/web/editor-freeform-mode.test.ts`
- `scripts/verify-s07-cli-parity-smoke.mjs`
- `tests/utils/bridge-browser.ts`
- `README.md`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M002/M002-ROADMAP.md`
- `.gsd/milestones/M002/slices/S07/S07-SUMMARY.md`
