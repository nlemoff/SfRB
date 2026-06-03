---
id: T03
parent: S02
milestone: M002
provides:
  - Browser editor commits now persist block text, frame moves, and consultant-accepted frame resizes through canonical `/__sfrb/editor` actions instead of whole-document browser writes.
key_files:
  - web/src/editor/engine.ts
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/bridge-client.ts
  - tests/web/editor-document-mode.test.ts
  - tests/web/editor-design-mode.test.ts
  - tests/web/editor-layout-consultant.test.ts
key_decisions:
  - Keep draft text, selection, ghost preview, and drag intermediates browser-local; only final committed text/frame changes cross the bridge as structured actions.
  - Preserve consultant requests as non-mutating bridge calls and route only explicit preview acceptance through the shared `set_frame_box` action helper.
  - Compare pending frame commits against canonical payload state, not local overrides, so drag releases cannot short-circuit as false no-ops.
patterns_established:
  - Browser commit code can use narrow bridge helpers (`submitBridgeBlockTextAction`, `submitBridgeFrameBoxAction`) over the shared action route while reusing the existing save-status store.
  - Runtime browser regressions should assert real `/__sfrb/editor` payload shapes directly so action-route migrations stay observable at the user boundary.
observability_surfaces:
  - Browser save-state panel
  - `/__sfrb/editor` POST bodies captured in browser tests
  - `/__sfrb/bootstrap` / payload-preview refresh after saves
  - `resume.sfrb.json` disk state in browser regressions
duration: 2h40m
verification_result: passed
completed_at: 2026-03-16T17:57:00-07:00
blocker_discovered: false
---

# T03: Move browser commit paths and consultant acceptance onto the shared action route

**Shipped browser-side canonical action commits for text edits, frame moves, and consultant accept, while keeping draft/drag/preview state local and preserving the existing save UX.**

## What Happened

I switched the browser persistence path away from recomposed whole-document writes and onto the structured editor action route already added in T01/T02.

In `web/src/bridge-client.ts` I kept the shared action submitter and added narrow helpers for block-text and frame-box commits so the editor/runtime can reuse the existing status-store transitions without duplicating request boilerplate.

In `web/src/editor/engine.ts` I replaced whole-document commit composition with serialized action commits:
- committed text edits now post `replace_block_text`
- committed frame moves now post `set_frame_box`
- draft text, selection, and drag-local box state remain browser-local until commit
- optimistic local overrides stay visible until canonical payload refresh catches up

While verifying design mode, I found a real regression that the old whole-document path had masked: frame drags were not actually committing on release, and only later text saves could accidentally persist the moved box. The root cause was the engine comparing pending frame commits against the local drag override instead of canonical payload state, which made every drag look like a no-op. I fixed that in `web/src/editor/engine.ts` and tightened the drag-settle path in `web/src/editor/Canvas.tsx` so release/capture-loss flows reliably trigger the frame commit call.

In `web/src/App.tsx` I switched consultant preview acceptance to the same frame-box action helper used by manual design edits. The consultant request path remains non-mutating. I also stopped masking explicit consultant request failures behind the generic bootstrap AI-availability state so a real missing-secret request now surfaces the bridge’s precise `configuration_missing` error in the UI.

I updated the shipped browser regressions to prove the user-visible behavior stayed the same while persistence moved onto actions. The tests now assert real `/__sfrb/editor` payload shapes for:
- document-mode text commit
- design-mode frame move commit
- design-mode text commit
- consultant accept commit
and they keep checking that reject/non-accept consultant flows do not mutate the canonical document.

## Verification

Passed:
- `npm test -- --run ./tests/document/editor-actions.test.ts`
- `npm test -- --run ./tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run ./tests/web/editor-document-mode.test.ts`
- `npm test -- --run ./tests/web/editor-design-mode.test.ts`
- `npm test -- --run ./tests/web/editor-layout-consultant.test.ts`

Observed in the real browser-runtime tests:
- document-mode inline edits post `action.kind = "replace_block_text"`
- design-mode drag commits post `action.kind = "set_frame_box"`
- consultant accept posts the same `set_frame_box` payload shape as manual frame edits
- reject/non-accept consultant flows leave `resume.sfrb.json` unchanged
- draft textarea focus and local drag state remain intact during save/refetch

Still not passing at slice level (expected to be addressed by T04):
- `node scripts/verify-s02-editor-actions.mjs` → fails because the script does not exist yet in this worktree

## Diagnostics

Future agents can inspect this work by:
- reading `web/src/editor/engine.ts` for action-based commit selection and optimistic-local-state handling
- reading `web/src/App.tsx` for consultant request vs accept separation
- reading `web/src/editor/Canvas.tsx` for drag-settle → frame commit wiring
- running the three browser tests and inspecting the asserted `/__sfrb/editor` POST bodies
- watching `#editor-save-status`, `#bridge-payload-preview`, and on-disk `resume.sfrb.json` during edits

## Deviations

- I also updated `web/src/editor/Canvas.tsx`, which was not listed in the task plan’s expected output, because verification exposed a real drag-release persistence bug that had been hidden by the prior whole-document save path.
- I created `.gsd/KNOWLEDGE.md` with the drag-commit comparison gotcha because it is non-obvious and likely to recur during future action-route migrations.

## Known Issues

- `scripts/verify-s02-editor-actions.mjs` is still missing, so the slice’s built-runtime smoke proof remains for T04.

## Files Created/Modified

- `web/src/bridge-client.ts` — added narrow browser helpers for canonical block-text and frame-box action submits.
- `web/src/editor/engine.ts` — replaced whole-document browser commits with action-based text/frame commits and fixed canonical-vs-local frame no-op detection.
- `web/src/editor/Canvas.tsx` — tightened drag release/capture-loss settlement so frame moves actually trigger commits on release.
- `web/src/App.tsx` — switched consultant acceptance to the shared frame-box action route and preserved explicit consultant request failures in the UI.
- `tests/web/editor-document-mode.test.ts` — now proves document-mode inline save posts a `replace_block_text` action.
- `tests/web/editor-design-mode.test.ts` — now proves design-mode drag and text commits post action payloads rather than whole documents.
- `tests/web/editor-layout-consultant.test.ts` — now proves consultant accept uses the shared frame-box action route and fixes the stale-preview mutation call to use the real bridge contract.
- `.gsd/milestones/M002/slices/S02/S02-PLAN.md` — marked T03 complete.
- `.gsd/KNOWLEDGE.md` — recorded the canonical-vs-local frame-commit comparison gotcha.
- `.gsd/STATE.md` — advanced the next action to T04.
