# S03: Tile Engine & Group Locking

**Goal:** Extend the canonical editor engine so design-backed resumes can split fine-grained tiles, group and lock them into larger compositions, and persist those edits through the same validated document/action boundary used by the shipped runtime.
**Demo:** Starting from the shipped template or blank design workspace, a user can split a multi-line block into smaller tiles, group selected tiles, lock that group, drag the locked composition as one meaningful edit, and see the grouped state survive `/__sfrb/editor`, `/__sfrb/bootstrap`, and on-disk `resume.sfrb.json`.

This slice is ordered around the real risk identified in research: tile behavior only matters if it survives the canonical document boundary cleanly. That is why task 1 establishes the persisted model and pure actions first, task 2 threads those actions through starters and the bridge, task 3 builds the browser interaction surface on top of that contract, and task 4 proves the shipped runtime round-trip. S03 directly owns **R015** and materially advances **R007** and **R012**, so the plan explicitly covers split/move/group/lock behavior, starter assembly, and inspectable persistence that later reconciliation work can trust.

## Must-Haves

- Design-backed documents persist fine-grained tile/group state canonically without adding a third `workspace.physics` mode.
- Canonical editor actions cover the slice’s meaningful tile intents: splitting blocks into smaller tiles, creating/removing groups as needed, toggling group lock state, and translating a locked group as one edit.
- The shipped template starter opens with an assembled tile composition rather than a loose pile of frames, while the blank starter remains compatible with the new group model.
- The browser tile surface exposes calm, explicit split/group/lock affordances and commits meaningful edits through canonical actions instead of browser-only fragment state.
- Slice proof exercises the real local loop: canonical action application → bridge persistence → browser interaction → built `dist/cli.js open` runtime round-trip, including at least one invalid-action no-write path.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/starter-documents.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-design-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`
- `node scripts/verify-s03-tile-engine.mjs`
- Failure-path check: submit an invalid split/group action through `/__sfrb/editor` and verify the response preserves actionable diagnostics while both `/__sfrb/bootstrap` and `resume.sfrb.json` remain unchanged.

## Observability / Diagnostics

- Runtime signals: canonical tile action kind, group id membership, group locked state, bridge validation/apply failure reasons, save-status transitions, and bootstrap document identity after split/group/drag commits.
- Inspection surfaces: `src/editor/actions.ts`, `src/document/schema.ts`, `resume.sfrb.json`, `/__sfrb/bootstrap`, `/__sfrb/editor`, stable browser selectors/testids for tile/group affordances, `tests/document/editor-actions.test.ts`, `tests/bridge/bridge-editor-contract.test.ts`, `tests/web/editor-tile-mode.test.ts`, and `scripts/verify-s03-tile-engine.mjs`.
- Failure visibility: a future agent can distinguish malformed tile payloads, missing block/frame ids, invalid group membership, stale browser rerender issues, and partial-move regressions where a locked group failed to persist as one canonical action.
- Redaction constraints: diagnostics may expose canonical ids, starter metadata, workspace paths, and action kinds, but must never expose provider secrets or unrelated local env values.

## Integration Closure

- Upstream surfaces consumed: S01 starter metadata and factories, S02 `applyEditorAction(...)` contract, existing document schema/validation boundary, `/__sfrb/editor` + `/__sfrb/bootstrap`, and current browser editor engine/canvas commit flow.
- New wiring introduced in this slice: persisted `layout.frameGroups`-style model + tile actions → bridge parsing/application for split/group/lock/translate → grouped starter composition → browser multi-select/group/lock tile UI → built-runtime tile smoke verification.
- What remains before the milestone is truly usable end-to-end: S04 and S05 still need real text and freeform editing surfaces, S06 still needs explicit reconciliation/overflow policy, and S07 still needs direct CLI invocation of the shared action surface plus final product polish.

## Tasks

- [x] **T01: Add canonical tile/group schema and pure action semantics** `est:3h`
  - Why: R015 cannot be proven until split/group/lock behavior exists as canonical document state and intent-level actions rather than DOM-only editor state.
  - Files: `src/document/schema.ts`, `src/document/validation.ts`, `src/editor/actions.ts`, `tests/document/editor-actions.test.ts`
  - Do: Extend the canonical document model with explicit frame-group metadata and any minimal split provenance needed for later inspection; keep `workspace.physics` unchanged (`document | design` only); add shared editor actions for block splitting, frame-group creation/removal as needed, lock toggling, and locked-group translation; enforce invariants such as valid frame membership, one-group-per-frame if chosen, and atomic split+frame creation for design physics; and add contract tests covering valid application plus invalid payload and missing-target failures.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
  - Done when: canonical tile/group actions parse and apply deterministically, resulting documents still satisfy design-physics validation, and invalid split/group/lock payloads fail with actionable diagnostics instead of partial writes.
- [x] **T02: Persist assembled tile groups through starters and the bridge** `est:2h`
  - Why: S03 supports R007, and the tile engine only becomes product-real once grouped compositions survive the existing bridge/document persistence path and the shipped template opens already assembled.
  - Files: `src/document/starters.ts`, `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `tests/document/starter-documents.test.ts`, `tests/bridge/bridge-editor-contract.test.ts`, `tests/utils/bridge-browser.ts`
  - Do: Update the template starter so it materializes sensible default frame groups while keeping the blank starter compatible; thread the new tile actions through `/__sfrb/editor` and browser bridge helpers without adding a tile-specific endpoint; preserve the one-action-per-request model by treating locked group movement as one canonical action; and extend starter/bridge tests to prove split/group/lock persistence, bootstrap round-trip, and invalid-action no-write behavior.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/starter-documents.test.ts && npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
  - Done when: the shipped template opens with canonical starter group metadata, the bridge can persist tile actions end-to-end, and invalid split/group actions leave disk state unchanged.
- [x] **T03: Build the browser tile editor for split, group, lock, and locked dragging** `est:4h`
  - Why: The slice promise is not believable until a user can perform these tile operations in the actual editor with calm, explicit affordances that map onto canonical actions.
  - Files: `web/src/editor/engine.ts`, `web/src/editor/Canvas.tsx`, `web/src/App.tsx`, `web/src/bridge-client.ts`, `tests/web/editor-design-mode.test.ts`, `tests/web/editor-tile-mode.test.ts`
  - Do: Expand the editor engine with group-aware selection and drag state while keeping multi-select gesture details browser-local; update the canvas structure key and rendering so split/group/lock changes rerender reliably; add restrained UI affordances for splitting a block, grouping selected tiles, showing lock state, and dragging a locked group as one composition; and prove through browser tests that the resulting writes are canonical actions rather than whole-document posts.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-design-mode.test.ts && npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`
  - Done when: a browser user can split a multi-line block into visible tiles, group and lock selected tiles, drag a locked group as one edit, and the UI stays in sync with canonical refetches without stale group visuals.
- [x] **T04: Add built-runtime tile smoke proof and finalize slice evidence** `est:1h`
  - Why: S03 is only retired when the shipped runtime proves tile/group behavior survives the real `dist/cli.js open` loop, not just in-process tests.
  - Files: `scripts/verify-s03-tile-engine.mjs`, `tests/utils/bridge-browser.ts`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`
  - Do: Add a built-runtime verifier that opens a real design workspace through the built CLI, submits split/group/lock/translate actions through the running bridge, rechecks `/__sfrb/bootstrap` plus on-disk `resume.sfrb.json`, and verifies one invalid action produces diagnostics with no write; then update requirement/roadmap evidence only after the verifier passes so S03’s proof is recorded where later slices will look.
  - Verify: `node scripts/verify-s03-tile-engine.mjs`
  - Done when: the real runtime demonstrates canonical tile persistence from bridge to disk to bootstrap refresh, the failure path is inspectable, and slice evidence is ready to mark R015 materially proven at the slice boundary.

## Files Likely Touched

- `src/document/schema.ts`
- `src/document/validation.ts`
- `src/document/starters.ts`
- `src/editor/actions.ts`
- `src/bridge/server.mjs`
- `web/src/bridge-client.ts`
- `web/src/editor/engine.ts`
- `web/src/editor/Canvas.tsx`
- `web/src/App.tsx`
- `tests/document/editor-actions.test.ts`
- `tests/document/starter-documents.test.ts`
- `tests/bridge/bridge-editor-contract.test.ts`
- `tests/web/editor-design-mode.test.ts`
- `tests/web/editor-tile-mode.test.ts`
- `tests/utils/bridge-browser.ts`
- `scripts/verify-s03-tile-engine.mjs`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M002/M002-ROADMAP.md`
