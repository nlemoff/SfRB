---
id: T03
parent: S03
milestone: M002
provides:
  - Browser tile editing in design mode with explicit split, group, lock, and locked-group drag affordances that persist canonical actions instead of whole-document writes.
key_files:
  - web/src/editor/engine.ts
  - web/src/editor/Canvas.tsx
  - web/src/App.tsx
  - tests/web/editor-tile-mode.test.ts
  - tests/web/editor-design-mode.test.ts
key_decisions:
  - Kept multi-select and drag preview state browser-session-local in the editor engine while persisting locked composition movement only as one canonical `translate_frame_group` action.
patterns_established:
  - Design-mode tile UI derives calm selection/group/lock affordances from canonical bootstrap state plus engine-local selection/drag state, then reconciles back through `/__sfrb/bootstrap` after each saved action.
  - Locked-group dragging previews member frame movement through transient frame-box overrides, but only commits the saved move as one group-translate action and exposes the resulting action kind in browser diagnostics.
observability_surfaces:
  - `#tile-toolbar`, `#editor-selected-frame-count`, `#editor-selected-group`, `#editor-selected-group-lock`, per-frame group/split badges, `#editor-last-action-kind`, `/__sfrb/bootstrap`, and `tests/web/editor-tile-mode.test.ts`
duration: 3h36m
verification_result: passed
completed_at: 2026-03-16 18:52:06 PDT
blocker_discovered: false
---

# T03: Build the browser tile editor for split, group, lock, and locked dragging

**Shipped a real browser tile surface for design mode: users can split a multi-line tile, shift-select and group tiles, lock the group, drag the locked composition as one canonical action, and watch the UI reconcile cleanly after bridge refetches.**

## What Happened

I expanded `web/src/editor/engine.ts` from a single-frame editor into a group-aware browser engine that now tracks multi-selection, selected-group state, lock-aware drag previews, and pending tile actions without leaking any gesture state into persisted documents. The engine still keeps text editing and ordinary frame dragging intact, but it now generates canonical split/group/lock/translate actions and reports the last saved action kind back through the UI.

In `web/src/editor/Canvas.tsx`, I added a restrained tile toolbar, selection/group status diagnostics, structure keys that include frame-group and split metadata, and per-frame badges for selection, split provenance, and lock/group state. The design surface now rerenders correctly after canonical split/group/lock refetches, so group visuals and lock indicators do not go stale. Locked compositions preview as coordinated movement across member frames, but only persist as one `translate_frame_group` write.

In `web/src/App.tsx`, I updated the tile-lens copy to match the shipped behavior and exposed `#editor-last-action-kind` so a future agent can tell whether the surface just sent `split_block`, `create_frame_group`, `set_frame_group_locked`, `translate_frame_group`, or the existing text/box actions.

On the verification side, I kept the existing design-mode regression spec and extended it slightly for the new diagnostics, then added `tests/web/editor-tile-mode.test.ts` to prove the real browser flow: split a tile, group the resulting frames, lock the group, drag it as one composition, and confirm the bridge only receives canonical action payloads.

## Verification

Passed:
- `npm test -- tests/web/editor-design-mode.test.ts tests/web/editor-tile-mode.test.ts`
- `npm test -- tests/document/editor-actions.test.ts`
- `npm test -- tests/document/starter-documents.test.ts`
- `npm test -- tests/bridge/bridge-editor-contract.test.ts`

Real browser verification against a live local bridge also passed:
- Opened a real design workspace in the browser.
- Split `summaryFrame` into `summaryFrameLine1` / `summaryFrameLine2` and explicitly asserted split badges plus `Last action · split_block`.
- Built a multi-selection, grouped it, locked it, and explicitly asserted visible group/lock state plus `Last action · create_frame_group` and `Last action · set_frame_group_locked`.
- Dragged the locked composition in the live browser and explicitly asserted `Last action · translate_frame_group`, coordinated member movement, and no console/network failures.

Verification mismatch discovered and documented:
- The slice plan still references `node scripts/verify-s03-tile-engine.mjs`, but that script does not exist in this worktree. Existing `scripts/verify-s03-open-smoke.mjs`, `verify-s04-editor-smoke.mjs`, and `verify-s05-layout-consultant.mjs` are present. I treated this as a plan/script mismatch, not a blocker in the tile editor implementation.

## Diagnostics

Inspect later with:
- `#tile-toolbar` for the shipped tile affordances.
- `#editor-selected-frame-count`, `#editor-selected-group`, and `#editor-selected-group-lock` for engine-derived browser selection/group state.
- `#editor-last-action-kind` for the exact canonical action most recently persisted.
- Per-frame testids such as `editor-frame-*`, `editor-frame-group-badge-*`, and `editor-frame-split-badge-*` for lock/group/split visuals.
- `/__sfrb/bootstrap` or `resume.sfrb.json` for canonical post-save split/group/lock state.
- `tests/web/editor-tile-mode.test.ts` for the executable end-to-end proof of the canonical action payload path.

## Deviations

- The slice plan’s verification section references `scripts/verify-s03-tile-engine.mjs`, but the repository currently does not contain that file. I did not invent an unplanned verifier in T03; I documented the mismatch for T04/slice closeout instead.

## Known Issues

- `vitest` invocation with absolute worktree paths under `.gsd/worktrees/...` can report “No test files found” because of the default `.gsd` exclusion pattern and tooling cwd differences. Use repo-relative `tests/...` filters from the worktree for reliable execution.
- The missing `scripts/verify-s03-tile-engine.mjs` still needs to be reconciled during T04’s slice-closeout work.

## Files Created/Modified

- `web/src/editor/engine.ts` — added browser-local multi-select, selected-group state, split/group/lock action helpers, and locked-group drag preview/commit logic.
- `web/src/editor/Canvas.tsx` — added the tile toolbar, group/split/lock badges, structure-key fixes, group-aware rendering, and group drag behavior.
- `web/src/App.tsx` — updated tile-lens copy and added `#editor-last-action-kind` observability.
- `tests/web/editor-tile-mode.test.ts` — added browser proof for split → group → lock → locked drag canonical action flow.
- `tests/web/editor-design-mode.test.ts` — kept design-mode regression coverage while asserting the new tile toolbar/last-action diagnostics do not break ordinary design editing.
- `.gsd/DECISIONS.md` — recorded the engine/UI decision to keep gesture state browser-local while persisting locked movement as one canonical group action.
- `.gsd/KNOWLEDGE.md` — recorded the current slice-verifier script mismatch and the worktree-relative Vitest execution gotcha.
