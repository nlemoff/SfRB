---
estimated_steps: 5
estimated_files: 6
---

# T03: Wire text-mode editing and restructuring through the browser engine

**Slice:** S04 — Text Mode as Real Writing Surface
**Milestone:** M002

## Description

Turn the text lens into a real working editor. This task should connect the writing surface to canonical content-edit and structure-edit actions, preserve focus and flow through autosave/refetch, and prove the behavior in both document and design workspaces.

Relevant skills to load before implementation: `frontend-design`, `test`.

## Steps

1. Extend `web/src/editor/engine.ts` with text-lens-local focus, selection, and command state while keeping drafts, caret behavior, and temporary affordance state browser-session-local.
2. Hook the text surface in `Canvas.tsx` to canonical edit actions for rewriting block text and for the new structure operations added in T01.
3. Preserve quiet autosave and focus continuity across save/refetch cycles so users can keep writing without being kicked out of the active block or losing the text-lens context.
4. Add keyboard-friendly or nearby inline controls for the supported structure actions so add/remove/reorder workflows are obvious without turning the surface into a toolbar-heavy design tool.
5. Extend browser tests to prove document and design workspaces both support text-mode writing/restructure flows and keep `Last action` canonical after commits.

## Must-Haves

- [ ] Text-mode edits and structure commands dispatch canonical action kinds rather than whole-document posts or browser-only mutations.
- [ ] Focus/caret continuity survives save/refetch while the user remains in Text mode.
- [ ] Browser proof covers both document and design workspaces, including at least one structure change and its canonical `Last action` observability.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-text-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-design-mode.test.ts`

## Observability Impact

- Signals added/changed: active text target, save-state transitions during text-mode commits, and last canonical action kind after structure edits.
- How a future agent inspects this: run the browser tests, inspect stable text-mode selectors/testids, or watch `/__sfrb/bootstrap` after a UI action.
- Failure state exposed: focus-loss regressions, non-canonical writes, and design-workspace text-mode drift become localizable in browser assertions.

## Inputs

- `web/src/editor/engine.ts` and `web/src/editor/Canvas.tsx` — current edit/draft/render seams to extend for text mode.
- `web/src/bridge-client.ts` — canonical action submission helpers from T01.
- `T02 output` — explicit text-lens shell and writing-surface chrome.
- `tests/utils/bridge-browser.ts` — existing browser harness for bridge/runtime editor scenarios.

## Expected Output

- `web/src/editor/engine.ts` — text-lens interaction state and canonical commit flow for content + structure actions.
- `web/src/editor/Canvas.tsx` and `web/src/bridge-client.ts` — wired text-mode controls and action submission path.
- `tests/web/editor-text-mode.test.ts` and `tests/web/editor-design-mode.test.ts` — executable browser proof for writing-first edits and structure actions in both workspace physics modes.
