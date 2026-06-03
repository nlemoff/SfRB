# S03: Tile Engine & Group Locking — Research

**Date:** 2026-03-16

## Summary

S03 primarily owns **R015** and materially supports **R007** and **R012**. The current codebase does **not** have a real tile engine yet: the browser shell only advertises a “Tile lens” in copy, while the actual runtime still exposes two physical document shapes through `workspace.physics` (`document` and `design`). In practice, today’s “tile-capable” path is just design mode: one semantic block maps to one layout frame, the editor engine selects one frame at a time, and the only persisted geometry action is `set_frame_box`.

The good news is that S02 left the exact seam S03 needs. The bridge already accepts canonical actions through `/__sfrb/editor`, `src/editor/actions.ts` is intentionally extensible, and the design canvas already persists committed geometry through the action path. The cleanest S03 direction is to keep tile behavior inside that existing canonical document/action loop rather than inventing browser-only fragment state.

The strongest recommendation is to treat the **first canonical tile primitive as the existing block+frame pair**, then make splitting/grouping/locking explicit extensions of that model. In other words: splitting should rewrite canonical semantic blocks plus linked frames; grouping/locking should be first-class canonical layout metadata; locked movement should be one meaningful group action, not a burst of per-frame best-effort writes. That stays aligned with S02, avoids a third persisted “tile physics” mode, and keeps later text/freeform work grounded in one inspectable document.

## Recommendation

Build S03 as a **design-lens extension over the existing canonical document**, not as a new persisted physics mode.

1. **Do not add `tile` to `workspace.physics`.** `src/config/schema.ts` only allows `document | design`, and `web/src/App.tsx` already treats tile availability as “design-capable workspace”. Keep tile mode as a browser/editor lens over design-backed documents.
2. **Use canonical block/frame pairs as tiles.** Today each semantic block has at most one frame, and design physics already requires every block to be framed. The least-disruptive split model is: one block becomes many smaller blocks, section `blockIds` are rewritten in order, the old frame is replaced with one frame per new block, and the new units become the tiles.
3. **Add first-class group metadata under layout.** Grouping/locking is a layout concern, not a transient selection concern. A group object is easier to validate than sprinkling group flags onto individual frames.
4. **Represent locked movement as a canonical group action.** The current bridge accepts one action per request; a locked-group drag should persist as one intent-level action such as `translate_frame_group`, not as N independent `set_frame_box` calls.
5. **Upgrade the template starter to ship assembled groups.** S03 supports R007, and the shipped template should start life as an already-assembled resume composition rather than a loose pile of frames.

A practical initial document/action shape for planning:

- `layout.frameGroups: Array<{ id, pageId, frameIds, locked }>`
- new actions in `src/editor/actions.ts` such as:
  - `split_block_into_lines` (or a more general `split_block` with `strategy: 'lines'`)
  - `create_frame_group`
  - `remove_frame_group`
  - `set_frame_group_locked`
  - `translate_frame_group`

If planners want the narrowest viable first version, `remove_frame_group` can be deferred if explicit unlock + regroup is enough for slice proof, but `split`, `group`, `lock`, and locked movement all need canonical representations.

## Implementation Landscape

### Key Files

- `src/config/schema.ts` — hard constraint: `workspace.physics` is only `document | design`. This strongly argues that S03 tile mode should be an editor lens, not a third persisted workspace physics.
- `src/document/schema.ts` — current canonical document shape has only sections, blocks, pages, and frames. It also enforces one frame per block. This is the main schema seam for adding persisted group/lock state and any split-related metadata.
- `src/document/validation.ts` — design physics currently requires every semantic block to have a frame. Any split action that creates new blocks must also create corresponding frames before persistence.
- `src/document/starters.ts` — template starter currently emits five blocks/five frames with no grouping metadata. This is where starter groups should be materialized so the shipped template opens as an assembled composition.
- `src/editor/actions.ts` — current canonical action union only covers `replace_block_text` and `set_frame_box`. This is the right place to add split/group/lock/translate-group actions plus pure application logic.
- `src/bridge/server.mjs` — bridge route already reads current document, applies one action, validates, and persists. S03 should extend this path, not add a new tile-specific mutation endpoint.
- `web/src/bridge-client.ts` — browser-facing action typings/helpers mirror the shared action union. This file will need the new group/tile action types and submit helpers.
- `web/src/editor/engine.ts` — current browser engine only tracks single block/frame selection, one draft text edit, and dirty frame ids. This is the key seam for local multi-select/group selection state and for switching drag commits from single-frame to group actions when appropriate.
- `web/src/editor/Canvas.tsx` — all current tile-adjacent interaction lives here: design-frame DOM, drag handles, selection, inline text editing, and render structure keys. This will carry the actual tile lens UI, split affordances, group visuals, and locked-group dragging.
- `web/src/App.tsx` — browser shell currently advertises tile lens availability based only on design physics. This should evolve to expose real tile guidance/state once S03 ships, while still keeping the primary user-facing messaging calm and non-technical.
- `tests/document/editor-actions.test.ts` — existing action contract proof. Either extend this file or add a dedicated tile/group action test file for split/group/lock application and invalid cases.
- `tests/document/starter-documents.test.ts` — starter validation proof. Needs new expectations once template starters ship grouped tiles.
- `tests/bridge/bridge-editor-contract.test.ts` — best bridge-level proof for new action kinds and no-write failure paths.
- `tests/web/editor-design-mode.test.ts` — current geometry/browser regression. Useful baseline, but S03 likely deserves a new tile-focused browser test rather than overloading this one.
- `tests/utils/bridge-browser.ts` — shared built-runtime helpers for temp workspaces, bridge posts, and bootstrap polling. Reuse this instead of hand-rolling new smoke harnesses.
- `scripts/verify-s03-open-smoke.mjs` — already exists, but it is an older bridge-open/live-sync smoke and not tile-specific. S03 should add a new verifier or rename carefully rather than quietly repurposing this script.

### Natural Seams

1. **Canonical tile/group model**
   - Extend `src/document/schema.ts` with persisted group/lock state.
   - Decide whether split provenance needs extra metadata now or can wait.

2. **Action contract + pure apply layer**
   - Extend `src/editor/actions.ts` with split/group/lock/translate semantics.
   - Add deterministic id generation helpers for new blocks/frames/groups.

3. **Starter/template materialization**
   - Update `src/document/starters.ts` so template resumes open already assembled.
   - Keep blank starter simple but compatible.

4. **Browser engine + tile canvas UI**
   - Expand `web/src/editor/engine.ts` for group-aware selection/dragging.
   - Expand `web/src/editor/Canvas.tsx` for split affordances, multi-select/group visuals, and lock indicators.

5. **Verification refresh**
   - Add direct action tests, bridge tests, a browser tile test, and a built-runtime S03 smoke verifier.

### Build Order

1. **Model and validate the canonical persistence shape first.**
   - S03’s real risk is not drag UI; it is whether split/group/lock state can cross the document boundary cleanly.
   - Decide the persisted `layout.frameGroups`-style shape and action semantics before touching browser interactions.

2. **Add and test pure split/group/lock actions next.**
   - Once action application is real, bridge and browser work can build on stable canonical semantics instead of inventing temporary rules.

3. **Update starters before the UI polish pass.**
   - Template group defaults affect what the browser should show as the initial calm/assembled state.

4. **Then wire the browser engine/canvas.**
   - After the model is stable, implement multi-select, explicit group command, lock toggle, and locked dragging against the action route.

5. **Finish with built-runtime verification.**
   - The slice is only retired when split/group/lock behavior survives `/__sfrb/editor`, bootstrap reload, and disk state.

### Verification Approach

Contract-level:
- Add focused tests for new tile/group actions, either in `tests/document/editor-actions.test.ts` or a sibling file.
- Prove:
  - splitting one block into multiple canonical blocks preserves section order
  - each new block gets a linked frame in design physics
  - group creation records only valid frame ids
  - a frame cannot belong to multiple groups if that invariant is chosen
  - locked group translation preserves relative deltas
  - invalid split/group payloads fail loudly with localized issues

Bridge-level:
- Extend `tests/bridge/bridge-editor-contract.test.ts` to POST new actions and verify bootstrap/disk round-trip.
- At minimum:
  - split action persists and bootstrap exposes the expanded blocks/frames
  - group creation + lock toggle persist canonically
  - locked group translation updates all member frames together
  - invalid group membership or invalid split leaves disk unchanged

Browser/runtime:
- Keep `tests/web/editor-design-mode.test.ts` as regression proof for single-frame editing.
- Add a new browser test for tile behavior, likely `tests/web/editor-tile-mode.test.ts`, that proves:
  - a multi-line block can be split into multiple visible tiles
  - several tiles can be selected/grouped explicitly
  - a locked group moves as one during drag
  - resulting `/__sfrb/editor` payloads are canonical actions, not whole documents

Operational:
- Add a new built-runtime verifier rather than overloading the old open-smoke script; e.g. `scripts/verify-s03-tile-engine.mjs`.
- Use the existing `tests/utils/bridge-browser.ts` patterns.
- Suggested flow:
  1. build project
  2. create a design workspace from template starter
  3. POST split/group/lock actions through the running bridge
  4. confirm `/__sfrb/bootstrap` and `resume.sfrb.json` both reflect the result
  5. submit one invalid tile/group action and prove no-write behavior

## Constraints

- `workspace.physics` is currently restricted to `document | design` in `src/config/schema.ts`.
- `src/document/schema.ts` is strict-object based; any new group/tile fields must be explicitly added everywhere they appear.
- Current schema invariant: each semantic block can have only one layout frame. Splitting by creating more blocks fits this; introducing multiple frames for one block does not.
- `validateDocumentForPhysics(..., 'design')` requires every semantic block to have a layout frame. Split actions must produce both new blocks and new frames atomically.
- `/__sfrb/editor` applies one action per request. Group movement should therefore be represented as one action if it is meant to be one meaningful edit.
- `web/src/editor/Canvas.tsx` rebuilds its DOM from a `structureKey` that currently only tracks sections/pages/frames. Group membership and split structure must be included, or the tile UI will go stale even when canonical state changed.
- The loaded `frontend-design` skill reinforces an important product constraint here: line-level power cannot turn the interface into a noisy fragment board. The first tile surface needs explicit, calm affordances.

## Common Pitfalls

- **Making tiles DOM-only fragments** — if split pieces or groups live only in `Canvas.tsx`, S07 CLI parity and later mode reconciliation both break. Persist them canonically.
- **Using repeated `set_frame_box` writes for locked group movement** — that turns one user action into partial state and weakens CLI parity. Prefer one group-level action.
- **Forgetting starter assembly** — S03 supports R007, so the template starter should not stay as an ungrouped set of frames once group metadata exists.
- **Missing structure-key updates in `Canvas.tsx`** — split/group changes can silently fail to rerender if the DOM rebuild key only tracks frame ids/z-index.
- **Ad hoc id generation** — split/group actions create new stable ids, but the repo currently has no shared id generator. Add one deterministic helper instead of inventing ids in UI code.

## Open Risks

- Splitting a block into line-level blocks is the simplest canonical move, but it may make later S04/S06 text/reconciliation work noisier unless provenance of the original block is preserved somewhere inspectable.
- The “right” default starter grouping is partly product judgment. Too many raw line tiles will feel chaotic; too much pre-grouping will hide the feature.
- Multi-select gesture design is still open. The browser can keep gesture details local, but the resulting operations must collapse to explicit canonical intents.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend UI / browser interaction | `frontend-design` | installed and loaded |
| React | `vercel-labs/agent-skills@vercel-react-best-practices` | available via `npx skills add`; not installed |
| Vite | `antfu/skills@vite` | available via `npx skills add`; not installed |
| Zod | `pproenca/dot-skills@zod` | available via `npx skills add`; not installed |
