# S05: Freeform Element Editor

**Goal:** Ship Freeform as a real editing lens over the canonical resume engine so a user can select, inspect, and reposition individual persisted page elements on a clean Figma/Acrobat-style surface without falling back to Tile-only behavior or browser-only state.
**Demo:** From the shipped `dist/cli.js open` runtime, a user opens a resume, switches into Freeform, selects a real page element such as a text box, bullet-backed fragment, or split line fragment, drags it to a new position, sees explicit selection/geometry/risk feedback in the browser, and verifies the resulting geometry persists through `Last action`, `/__sfrb/editor`, `/__sfrb/bootstrap`, and on-disk `resume.sfrb.json` with an inspectable no-write failure path for blocked or invalid moves.

S05 is ordered around the main research constraint: Freeform only becomes honest if it reuses the canonical positioned-object model the engine already persists, rather than inventing a second browser-only element layer or prematurely expanding the schema for decorative primitives. The plan therefore starts by locking in the first shipped freeform element set and the interaction rules around locked groups/risky placement, then promotes Freeform from preview to a real lens with a calmer dedicated surface, wires selection and drag persistence through the existing canonical action path, and finally retires the slice with built-runtime proof. This grouping directly advances **R014** by making element-level manipulation real for existing persisted objects, advances **R008** by turning Freeform into an intentional guided lens instead of preview copy, materially advances **R011** through a cleaner dedicated surface, and gives **R012** an explicit freeform state/diagnostic basis for later reconciliation work in S06.

## Must-Haves

- Freeform is a real, explicit browser lens in both the shell and editor canvas, no longer labeled preview-only, and it works over the same canonical resume document as Tile/Text rather than a separate browser-only model.
- The first shipped freeform element set is explicit and honest: existing block-backed frames, bullet-backed frames, and split-line fragments can be selected and moved individually, while unsupported decorative primitives are not implied to exist canonically.
- Meaningful freeform geometry changes persist through the existing validated bridge/document boundary using canonical actions, and the browser exposes stable observability for selected element identity, geometry, and blocked/risky move state.
- Browser and built-runtime proof cover success and failure paths, including an inspectable no-write response when a move is invalid or disallowed.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`
- `node scripts/verify-s05-freeform-smoke.mjs`
- Failure-path check: submit an invalid or blocked freeform move through `/__sfrb/editor` and verify diagnostics are visible while both `/__sfrb/bootstrap` and `resume.sfrb.json` remain unchanged.

## Observability / Diagnostics

- Runtime signals: active editor lens, selected freeform element id, selected element geometry, last canonical action kind, and visible blocked/risky move state for locked or invalid freeform manipulations.
- Inspection surfaces: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, stable browser testids for freeform selection/geometry state, `/__sfrb/editor`, `/__sfrb/bootstrap`, `resume.sfrb.json`, `tests/web/editor-freeform-mode.test.ts`, and `scripts/verify-s05-freeform-smoke.mjs`.
- Failure visibility: a future agent can distinguish “Freeform still preview-only,” selection not binding to a canonical frame, drag preview that never commits, locked-group member moves that are blocked or misapplied, and invalid-action silent-write regressions.
- Redaction constraints: diagnostics may expose canonical frame ids, group ids, starter metadata, and workspace-relative paths, but must never expose provider secrets or unrelated local environment values.

## Integration Closure

- Upstream surfaces consumed: S01 shell/bootstrap guidance metadata, S02 canonical editor action/apply contract, S03 split/group/lock invariants, S04 browser-local lens shell patterns, the existing bridge mutation/read endpoints, and the current design-canvas frame rendering path.
- New wiring introduced in this slice: freeform lens shell state and copy → freeform canvas render path over canonical positioned objects → editor-engine selection/drag/blocked-state handling in Freeform → canonical geometry commits through the shared bridge → browser and built-runtime verification.
- What remains before the milestone is truly usable end-to-end: S06 still needs explicit reconciliation rules across text/tile/freeform including what happens after freeform moves and locked compositions re-enter structured lenses, and S07 still needs direct CLI invocation parity plus final product polish.

## Tasks

- [x] **T01: Lock the freeform element scope and canonical move diagnostics** `est:2h`
  - Why: The slice will sprawl or mislead users unless executors first make the shipped freeform element set and blocked-move rules explicit at the shared action/engine boundary; this task turns the research recommendation into concrete product and runtime rules.
  - Files: `src/editor/actions.ts`, `web/src/bridge-client.ts`, `web/src/editor/engine.ts`, `tests/document/editor-actions.test.ts`, `tests/bridge/bridge-editor-contract.test.ts`
  - Do: Keep S05 scoped to existing canonically persisted objects rather than adding a new `layout.elements` model; extend the shared action/application and browser mirror only as needed to support freeform-facing diagnostics around individual frame moves; define how locked groups behave in Freeform (for example, blocked member drag with visible diagnostics unless moved through the group path already established in S03); and add contract coverage for valid single-element geometry commits plus invalid/blocked no-write outcomes.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts && npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
  - Done when: the canonical action boundary truthfully supports the first shipped freeform element set, blocked/invalid moves are inspectable and no-write, and executors do not need to invent a parallel freeform persistence model.
- [x] **T02: Promote Freeform from preview to a real element-editing surface** `est:3h`
  - Why: R008, R011, and R014 all depend on users seeing Freeform as an intentional product lens with its own calm surface, not a placeholder card or a renamed Tile canvas.
  - Files: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, `tests/web/editor-first-run-guidance.test.ts`, `tests/web/editor-freeform-mode.test.ts`
  - Do: Update shell copy and lens availability so Freeform is no longer described as preview-only; replace the placeholder `renderFreeformMode()` with a positioned-page surface built from the existing frame rendering path but styled as a cleaner Figma/Acrobat-style editor; expose stable observability for active freeform element identity and geometry; and make the chrome explicitly communicate the first shipped element scope plus unusual-placement or blocked-move messaging without surfacing raw developer diagnostics.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts && npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-freeform-mode.test.ts`
  - Done when: the browser exposes a distinct Freeform lens, the old preview-only copy is gone, and the page presents a genuine element-selection surface with inspectable freeform HUD state.
- [x] **T03: Wire freeform selection and drag commits through the editor engine** `est:4h`
  - Why: The slice promise is only credible once a user can actually select individual positioned elements in Freeform, drag them, and watch those commits persist canonically while respecting S03 lock/group invariants.
  - Files: `web/src/editor/engine.ts`, `web/src/editor/Canvas.tsx`, `web/src/bridge-client.ts`, `tests/web/editor-freeform-mode.test.ts`, `tests/web/editor-tile-mode.test.ts`, `tests/utils/bridge-browser.ts`
  - Do: Remove the tile-only gating around frame selection, drag preview, and drag commit where Freeform should share the same persisted movement path; keep session-local selection/preview state browser-local while routing meaningful geometry changes through canonical `set_frame_box` or existing group actions; surface blocked-member behavior for locked groups intentionally rather than bypassing it; and add browser tests proving a freeform element move updates `Last action`, `/__sfrb/bootstrap`, and disk-backed state while preserving tile-mode regressions.
  - Verify: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-freeform-mode.test.ts && npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`
  - Done when: a freeform user can move a supported individual page element end-to-end through the canonical save loop, and locked/invalid cases surface an inspectable blocked state instead of silently doing nothing or corrupting groups.
- [x] **T04: Add shipped-runtime freeform smoke proof and record slice evidence** `est:1h`
  - Why: S05 is not retired until the built `dist/cli.js open` loop proves Freeform works against a real workspace and not just in-process browser tests.
  - Files: `scripts/verify-s05-freeform-smoke.mjs`, `tests/utils/bridge-browser.ts`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, `.gsd/milestones/M002/slices/S05/S05-SUMMARY.md`
  - Do: Add a dedicated S05 smoke verifier that opens a real workspace through the built CLI, switches into Freeform, selects and moves a supported page element, re-checks `Last action`, `/__sfrb/bootstrap`, and on-disk `resume.sfrb.json`, and exercises an invalid or blocked move that must yield diagnostics with no write; then record the resulting evidence in the slice summary and any requirement/roadmap status notes once the verifier passes.
  - Verify: `node scripts/verify-s05-freeform-smoke.mjs`
  - Done when: the built runtime proves Freeform selection and geometry persistence on a real workspace, the no-write failure path is inspectable, and the slice has recorded evidence ready for requirement/status updates.

## Files Likely Touched

- `src/editor/actions.ts`
- `web/src/bridge-client.ts`
- `web/src/App.tsx`
- `web/src/editor/Canvas.tsx`
- `web/src/editor/engine.ts`
- `tests/document/editor-actions.test.ts`
- `tests/bridge/bridge-editor-contract.test.ts`
- `tests/web/editor-first-run-guidance.test.ts`
- `tests/web/editor-freeform-mode.test.ts`
- `tests/web/editor-tile-mode.test.ts`
- `tests/utils/bridge-browser.ts`
- `scripts/verify-s05-freeform-smoke.mjs`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M002/M002-ROADMAP.md`
- `.gsd/milestones/M002/slices/S05/S05-SUMMARY.md`
