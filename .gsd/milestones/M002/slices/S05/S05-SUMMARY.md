---
id: S05
parent: M002
milestone: M002
provides:
  - A real Freeform lens over canonical page frames, with built-runtime proof that supported element moves persist through the shipped CLI/browser loop and that blocked member drags surface diagnostics without writing.
requires:
  - S02
affects:
  - S06
  - S07
key_files:
  - src/editor/actions.ts
  - web/src/bridge-client.ts
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - tests/document/editor-actions.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
  - tests/web/editor-first-run-guidance.test.ts
  - tests/web/editor-freeform-mode.test.ts
  - tests/web/editor-tile-mode.test.ts
  - scripts/verify-s05-freeform-smoke.mjs
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
key_decisions:
  - Ship Freeform over the existing canonical `layout.frames` model instead of inventing a second browser-only element layer or expanding the schema for decorative primitives in this slice.
  - Keep locked-group member drags blocked in Freeform and make that state visible through stable HUD diagnostics instead of silently translating groups or silently doing nothing.
  - Retire the slice only with shipped-runtime proof that re-checks `Last action`, `/__sfrb/bootstrap`, and `resume.sfrb.json` after both a successful element move and a blocked/no-write drag.
patterns_established:
  - Freeform proof is only complete when a real `dist/cli.js open` workspace can switch into the Freeform lens, move a supported page element through canonical `set_frame_box`, and then re-read bridge bootstrap and disk state to confirm the geometry persisted.
  - Blocked freeform moves should be proven in-browser, not just by API response shape: the HUD must expose blocked diagnostics while `Last action`, bootstrap payloads, and on-disk JSON remain unchanged.
observability_surfaces:
  - `#editing-lenses[data-active-lens]`
  - `#shell-active-lens`
  - `#editor-canvas[data-active-lens][data-physics-mode]`
  - `[data-testid="editor-freeform-surface"]`
  - `[data-testid="freeform-selected-element-id"]`
  - `[data-testid="freeform-selected-element-kind"]`
  - `[data-testid="freeform-selected-element-geometry"]`
  - `[data-testid="freeform-move-state"]`
  - `[data-testid="freeform-selected-element-group"]`
  - `[data-testid="freeform-placement-note"]`
  - `#editor-last-action-kind[data-action-kind]`
  - `/__sfrb/editor`
  - `/__sfrb/bootstrap`
  - `resume.sfrb.json`
  - `tests/web/editor-freeform-mode.test.ts`
  - `scripts/verify-s05-freeform-smoke.mjs`
  - `.gsd/milestones/M002/slices/S05/tasks/T01-SUMMARY.md`
  - `.gsd/milestones/M002/slices/S05/tasks/T02-SUMMARY.md`
  - `.gsd/milestones/M002/slices/S05/tasks/T03-SUMMARY.md`
duration: ~1d
verification_result: passed
completed_at: Monday, March 16, 2026 at 10:52:00 PM PDT
blocker_discovered: false
---

# S05: Freeform Element Editor

**Shipped Freeform as a real element-editing lens over the canonical resume model: users can enter a dedicated Freeform surface, inspect supported page elements through stable HUD diagnostics, persist real geometry changes through canonical actions, and trust the shipped runtime because the new smoke flow re-proves success and blocked/no-write behavior through `Last action`, `/__sfrb/bootstrap`, and `resume.sfrb.json`.**

## What Happened

S05 completed the freeform-side product loop in four steps and then retired it at the shipped runtime boundary.

T01 locked the first shipped freeform element scope at the shared truth boundary. `src/editor/actions.ts` and `web/src/bridge-client.ts` now classify supported freeform targets as existing canonical frame-backed objects — block frames, bullet-backed frames, and split-line fragments — and expose blocked-move diagnostics when a selected member belongs to a locked group. This kept the slice honest and prevented a browser-only “elements” model from drifting away from the canonical document.

T02 promoted Freeform from placeholder copy to a real lens in the shell and canvas. `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, and `web/src/editor/engine.ts` now let users enter a calmer positioned-page surface that reuses canonical frame rendering while surfacing stable HUD state for selected element identity, geometry, group-lock state, and move-risk messaging.

T03 wired actual freeform dragging through the canonical editor loop. The browser now keeps freeform selection and drag preview state local to the session, but meaningful geometry changes still commit through canonical `set_frame_box`. Locked-group member drags remain intentionally blocked, and the HUD exposes `idle` / `preview` / `blocked` / `saving` move-state transitions so later slices can inspect freeform behavior without guessing.

T04 closed the slice with shipped-runtime evidence. `scripts/verify-s05-freeform-smoke.mjs` now builds the app, opens a real design workspace through `dist/cli.js open`, explicitly enters the Freeform lens, drags `summaryFrame`, and then re-reads `#editor-last-action-kind`, `/__sfrb/bootstrap`, and `resume.sfrb.json` to prove the moved geometry persisted canonically. In the same runtime flow it then prepares a locked split-line group, attempts a blocked member drag in Freeform, verifies the HUD exposes blocked diagnostics, and confirms both bootstrap and on-disk JSON remain unchanged with no additional editor mutation posted. This is the runtime proof S06 and S07 can now trust when they build reconciliation and CLI parity on top of Freeform.

## Verification

Passed:
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`
- `node scripts/verify-s05-freeform-smoke.mjs`

Built-runtime proof confirmed all slice must-haves:
- Freeform is available and functional through the shipped local `dist/cli.js open` loop.
- A supported freeform element move persists through `Last action`, `/__sfrb/bootstrap`, and `resume.sfrb.json`.
- A blocked freeform move surfaces visible diagnostics and causes no bootstrap or disk drift.

Note on command form: an `async_bash` attempt from the repo root hit the known `**/.gsd/**` Vitest exclusion, so the authoritative final verification above uses the worktree-shell commands that actually execute from this worktree.

## Requirements Advanced

- R008 — materially advanced and now has explicit built-runtime proof for the Freeform portion of the three-lens promise, though full cross-lens reconciliation still belongs to S06.
- R011 — materially advanced by replacing preview-only copy with a calmer dedicated Freeform surface and HUD instead of tile-heavy chrome.
- R012 — materially advanced by establishing inspectable freeform selection, geometry, blocked-state, and no-write failure surfaces that S06 can use when finalizing reconciliation policy.

## Requirements Validated

- R014 — validated. S05 now proves that Freeform can select and manipulate individual canonical page elements through the shipped runtime rather than only moving coarse sections.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

- `scripts/verify-s05-freeform-smoke.mjs` records the blocked/no-write path through a real in-browser locked-member drag rather than through a synthetic invalid POST alone, because the slice plan required visible diagnostics in the shipped Freeform surface and this proves the no-write behavior at the actual user interaction boundary.
- The final verification record uses worktree-shell test commands because the repo’s root-level Vitest exclusions can filter `.gsd/worktrees/...` paths when invoked from the wrong cwd even though the tests themselves pass from this worktree.

## Known Limitations

- The first validated Freeform set still targets canonically persisted frame-backed objects, not brand-new decorative primitives.
- Cross-lens reconciliation rules after freeform moves are still deferred to S06.
- Direct CLI invocation parity for the same canonical action surface is still a later proof target for S07.

## Follow-ups

- S06 should treat `scripts/verify-s05-freeform-smoke.mjs` as a standing regression guard whenever text/tile/freeform reconciliation changes how free-moved or locked compositions behave across lenses.
- S06 should reuse the stable Freeform HUD selectors rather than inventing new inspection-only state for move/reconciliation outcomes.
- S07 should preserve the same shipped-runtime proof discipline when it adds direct CLI action invocation parity.

## Files Created/Modified

- `src/editor/actions.ts` — established canonical freeform target inspection and blocked-move diagnostics at the action boundary.
- `web/src/bridge-client.ts` — mirrored freeform move-scope diagnostics to the browser runtime.
- `web/src/App.tsx` — promoted Freeform from preview copy to a real shipped lens in the shell.
- `web/src/editor/Canvas.tsx` — rendered the dedicated Freeform surface, HUD diagnostics, and direct frame-drag interactions.
- `web/src/editor/engine.ts` — preserved freeform selection/preview state while committing canonical frame moves and surfacing blocked/preview diagnostics.
- `tests/document/editor-actions.test.ts` — proved canonical freeform move classification and blocked/invalid no-write behavior.
- `tests/bridge/bridge-editor-contract.test.ts` — proved bridge persistence plus blocked/no-write behavior for freeform actions.
- `tests/web/editor-first-run-guidance.test.ts` — preserved shell guidance coverage alongside the new Freeform lens state.
- `tests/web/editor-freeform-mode.test.ts` — proved shipped Freeform HUD observability, successful canonical movement, and blocked no-write browser behavior.
- `tests/web/editor-tile-mode.test.ts` — kept the tile/group/lock baseline green while Freeform reused the same canonical frame model.
- `scripts/verify-s05-freeform-smoke.mjs` — added the shipped runtime proof for successful Freeform movement plus blocked/no-write diagnostics.
- `.gsd/REQUIREMENTS.md` — recorded new R008 evidence and validated R014.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S05 complete with built-runtime proof language.
