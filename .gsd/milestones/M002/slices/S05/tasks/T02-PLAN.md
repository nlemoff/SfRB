---
estimated_steps: 4
estimated_files: 5
---

# T02: Promote Freeform from preview to a real element-editing surface

**Slice:** S05 — Freeform Element Editor
**Milestone:** M002

## Description

Turn the placeholder into a product surface. This task should make Freeform a genuine browser lens with a cleaner element-editing presentation, clear scope messaging, and stable HUD-style observability for the selected element instead of preview-only copy.

Relevant skills to load before implementation: `frontend-design`, `test`.

## Steps

1. Update the editor shell in `web/src/App.tsx` so Freeform is presented as a real available lens, not preview-only guidance text.
2. Replace the placeholder `renderFreeformMode()` in `web/src/editor/Canvas.tsx` with a positioned-page surface built from the existing frame rendering path, but styled with calmer freeform-specific chrome and selection treatment instead of tile/group-heavy UI.
3. Expose stable testids and browser-visible state for the active freeform element id, geometry readout, and blocked/unusual-placement messaging that a future agent can inspect.
4. Update the first-run guidance and new freeform browser test so the shipped copy and visible surface match the real capability.

## Must-Haves

- [ ] Freeform is no longer described as preview-only anywhere user-facing in the editor shell or guidance tests.
- [ ] The freeform surface visually reads as element editing, not simply Tile mode with renamed labels.
- [ ] The browser exposes stable observability for selected element identity, geometry, and risk/blocked feedback.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-freeform-mode.test.ts`

## Observability Impact

- Signals added/changed: active freeform lens state, selected element HUD fields, and user-facing blocked/risky placement messaging.
- How a future agent inspects this: run the browser tests or inspect the stable testids rendered by `web/src/App.tsx` and `web/src/editor/Canvas.tsx`.
- Failure state exposed: regressions where Freeform reverts to preview, loses HUD visibility, or shows the wrong element-selection state become easy to localize in-browser.

## Inputs

- `web/src/App.tsx` — current lens shell copy that still advertises Freeform as preview-only.
- `web/src/editor/Canvas.tsx` — existing design-frame render path plus the placeholder freeform panel to replace.
- `T01 output` — clarified freeform scope and blocked-state semantics that the surface must communicate honestly.
- `tests/web/editor-first-run-guidance.test.ts` — current assertions that need to flip from preview copy to real-lens expectations.

## Expected Output

- `web/src/App.tsx` and `web/src/editor/Canvas.tsx` — real Freeform lens shell and positioned element-editing surface.
- `web/src/editor/engine.ts` — any snapshot fields needed purely to expose freeform HUD state.
- `tests/web/editor-first-run-guidance.test.ts` and `tests/web/editor-freeform-mode.test.ts` — executable proof that Freeform is shipped and inspectable.