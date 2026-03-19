---
estimated_steps: 4
estimated_files: 5
---

# T02: Introduce an explicit text lens and calm writing-surface shell

**Slice:** S04 — Text Mode as Real Writing Surface
**Milestone:** M002

## Description

Make text mode visible and trustworthy in the product shell. This task should introduce an explicit Text lens that is separate from canonical physics and present a calmer editorial surface that feels like a writing environment instead of the existing diagnostics-heavy mixed canvas.

Relevant skills to load before implementation: `frontend-design`, `test`.

## Steps

1. Add browser-local lens selection in `web/src/App.tsx` so Text, Tile, and Freeform are actual product modes rather than static guidance cards, with the active lens exposed through stable testids/state.
2. Update `web/src/editor/Canvas.tsx` to render a writing-first text surface for the Text lens in both document and design workspaces while leaving canonical physics handling intact underneath.
3. Use restrained editorial styling and subtle status language so the active text surface feels calm, focused, and non-technical, and hide tile/drag affordances whenever Text mode is active.
4. Extend guidance/browser tests so they assert real lens switching, text-lens availability in design workspaces, and the absence of drag/tile chrome while Text mode is selected.

## Must-Haves

- [ ] Text mode is an explicit lens the user can enter from the shell, distinct from `workspace.physics`.
- [ ] The text surface reads as writing-first and calm, with subtle save feedback rather than frame/tile diagnostics dominating the screen.
- [ ] Design workspaces can enter Text mode without showing drag handles, tile grouping controls, or other design-lens affordances.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-text-mode.test.ts`

## Observability Impact

- Signals added/changed: active lens state, visible text-surface status, and explicit absence of tile/drag chrome while Text mode is selected.
- How a future agent inspects this: inspect stable App/Canvas testids or run the guidance/text-mode browser tests.
- Failure state exposed: lens/physics confusion, missing text mode in design workspaces, and accidental tile affordances leaking into text mode become obvious in UI assertions.

## Inputs

- `web/src/App.tsx` — current shell/guidance implementation that must evolve from descriptive cards to real lens selection.
- `web/src/editor/Canvas.tsx` — existing document/design render split that needs a text-lens render path.
- `T01 output` — canonical text action vocabulary that the lens shell will later call.
- `frontend-design` skill guidance — use a deliberate editorial/minimal direction rather than generic app chrome.

## Expected Output

- `web/src/App.tsx` — explicit lens state and text-mode shell controls.
- `web/src/editor/Canvas.tsx` and `web/src/editor/engine.ts` — text-lens rendering inputs and writing-surface chrome/state.
- `tests/web/editor-first-run-guidance.test.ts` and `tests/web/editor-text-mode.test.ts` — browser proof that Text mode is real, inspectable, and calmer than the old mixed surface.
