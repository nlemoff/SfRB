---
id: T03
parent: S04
milestone: M002
provides:
  - Text-lens writing and structure commands that commit through canonical editor actions while preserving focus through save/refetch in document and design workspaces.
key_files:
  - web/src/editor/engine.ts
  - web/src/editor/Canvas.tsx
  - tests/web/editor-text-mode.test.ts
  - tests/web/editor-design-mode.test.ts
key_decisions:
  - Keep text-structure command intent in the editor engine, but keep drafts, focus continuity, and stale-blur protection browser-session-local so text mode can stay calm without inventing browser-only mutations.
patterns_established:
  - Text-mode structure controls should use mousedown-safe inline buttons and restore editing by block identity across bridge refreshes, with stale blur handlers ignored once a new textarea instance becomes active.
observability_surfaces:
  - #editor-active-text-target
  - #editor-active-text-section
  - #editor-save-status
  - #editor-last-action-kind
  - tests/web/editor-text-mode.test.ts
  - tests/web/editor-design-mode.test.ts
  - /__sfrb/bootstrap
  - resume.sfrb.json
duration: ~3h
verification_result: passed
completed_at: 2026-03-16 20:13 PDT
blocker_discovered: false
---

# T03: Wire text-mode editing and restructuring through the browser engine

**Turned the Text lens into a real writing surface: inline text-mode controls now dispatch canonical insert/remove/move actions, preserve focus through autosave/refetch, and are proven in both document and design workspaces.**

## What Happened

I extended the editor engine with text-lens-local selection and command state for blocks/sections, plus canonical handlers for `insert_block`, `remove_block`, `move_block`, and `move_section`. Those handlers flush pending draft text before structure commits, keep intended focus session-local, and restore the active writing target after bridge save/refetch instead of dropping the user back to a passive block.

On the canvas, I upgraded the text surface from read-only cards to a working editorial surface with nearby inline controls for block insertion, removal, reordering, and section movement. I also added stable observability for the active text target and active text section so future agents can localize focus-loss and action-routing regressions quickly.

The trickiest runtime issue was browser interaction ordering: text-mode command clicks and block-to-block switching could lose the intended action or clear the newly active block because stale textarea blur handlers fired after the DOM remounted. I fixed that by making inline command buttons mousedown-stable, routing text-body activation directly, and ignoring stale blur completions once a newer textarea instance is active.

## Verification

Passed:

- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-text-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs`

Behavior confirmed by browser/runtime proof:

- Text-mode edits still save through canonical `replace_block_text` actions.
- Document-mode text lens can insert a new block, edit it, move a section, and keep `Last action` canonical.
- Design-mode text lens can insert a new block with a linked frame payload, continue typing in the inserted block after refetch, and persist both semantic text and layout linkage to disk.
- Focus continuity survives save/refetch for inserted and moved text-mode targets.

## Diagnostics

Inspect later via:

- `#editor-active-text-target[data-target-id][data-target-kind]`
- `#editor-active-text-section[data-section-id]`
- `#editor-save-status[data-save-state]`
- `#editor-last-action-kind[data-action-kind]`
- `#editor-canvas[data-active-lens]`
- `tests/web/editor-text-mode.test.ts`
- `tests/web/editor-design-mode.test.ts`
- `/__sfrb/bootstrap`
- on-disk `resume.sfrb.json`

If focus continuity regresses again, check whether a stale textarea blur handler is still clearing engine edit state after a newer textarea instance has mounted.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `web/src/editor/engine.ts` — added text-lens section/block command state, canonical structure-action submission, and focus-restoration handling across save/refetch.
- `web/src/editor/Canvas.tsx` — wired inline text-mode controls, active-target observability, and blur-safe/focus-safe text editing transitions.
- `tests/web/editor-text-mode.test.ts` — added document text-mode insert/reorder browser proof with canonical action assertions.
- `tests/web/editor-design-mode.test.ts` — added design text-mode insert/focus browser proof with canonical frame-linked action assertions.
- `.gsd/KNOWLEDGE.md` — recorded the inline-command stale-blur gotcha for future agents.
