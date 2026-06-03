# S04: Text Mode as Real Writing Surface — Research

**Date:** 2026-03-16

## Summary

S04 primarily supports **R008** and contributes implementation pressure toward **R011** and **R012**. The codebase already has one important foundation in place: all text edits in both current workspace physics modes flow through the canonical `replace_block_text` editor action and persist through `/__sfrb/editor` back into `resume.sfrb.json`. That behavior is implemented in `web/src/editor/engine.ts`, validated at the bridge boundary in `src/editor/actions.ts`, and covered by browser/runtime tests in `tests/web/editor-document-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, and `tests/web/editor-first-run-guidance.test.ts`.

What is missing is an actual **text lens**. Today the app only exposes static guidance cards in `web/src/App.tsx`; there is no mode-switch state, no dedicated text-surface chrome, and no alternate rendering path beyond workspace physics. `Canvas.tsx` renders either a document-flow view (`physics === 'document'`) or a page/frame view (`physics === 'design'`), and editing is still block-by-block via a single inline textarea (`#editor-active-textarea`). That means the shipped product currently has “text editing exists” but not “text mode feels like a real writing surface.”

The highest-value path is to introduce a **browser-local lens state** for text mode while keeping **document content canonical** and continuing to save actual mutations through the existing editor-action route. Selection/focus/chrome can stay session-local, following the precedent in D032 for non-canonical interaction state. The main architectural gap is structural editing: the current action model supports `replace_block_text` plus layout/tile actions, but it does **not** support text-structure actions such as splitting/merging/reordering blocks or sections. If S04 is intended to be “real writing surface” only for faster rewriting, existing actions are enough; if it must include text-structure manipulation, S04 will need new canonical action kinds that also respect design-mode frame invariants.

## Recommendation

Build S04 in two layers:

1. **Introduce a real text-lens UI first** in the browser (`web/src/App.tsx` + `web/src/editor/Canvas.tsx`), independent of workspace physics.
   - Add explicit local lens selection/state in the app shell.
   - Let text mode render semantic content as a writing-first surface even for design workspaces.
   - Preserve the existing canonical save route by reusing `replace_block_text` through `createDocumentEditorEngine`.
   - Keep lens selection, focus, and text-surface affordances browser-local unless/until S06 requires mode reconciliation to be persisted/inspectable.

2. **Decide early whether S04 includes structural text transforms.**
   - If scope is rewrite/focus/flow only, avoid widening the action model yet.
   - If scope includes operations like paragraph/block split, merge, move, or section reordering, add them in `src/editor/actions.ts` and mirror them in `web/src/bridge-client.ts` and `web/src/editor/engine.ts` before polishing UI. This is the real architecture fork because design workspaces require every semantic block to retain a linked frame (`src/document/validation.ts`).

This order de-risks the slice: it proves the missing product behavior quickly, preserves S02’s canonical action seam, and exposes whether the current semantic model is enough before deeper reconciliation work in S06.

## Implementation Landscape

### Key Files

- `web/src/App.tsx` — Current browser shell. It renders the first-run guidance cards for text/tile/freeform, mounts the editor engine/canvas, and syncs bridge/bootstrap/save diagnostics. There is **no actual mode-switch state** here yet; the “lenses” are descriptive cards only.
- `web/src/editor/Canvas.tsx` — Current editor surface. It chooses between `renderDocumentMode()` and `renderDesignMode()` strictly from `payload.physics`, uses one inline textarea editor, and shows the tile toolbar only in design mode. This is the main seam for a new text-surface rendering path.
- `web/src/editor/engine.ts` — Canonical browser-side interaction model. Already handles selection, drafting, debounced commit, and submission of `replace_block_text`, `set_frame_box`, and tile/group actions. This is the place to add any text-lens-local selection/focus state or future text-structure actions.
- `web/src/bridge-client.ts` — Shared client action definitions and submit helpers. Today `BridgeEditorAction` includes `replace_block_text`, `set_frame_box`, and tile/group actions only. Any new text-structure action must be added here.
- `src/editor/actions.ts` — Canonical action parser and application layer for `/__sfrb/editor`. This is the authoritative place for any new text-mode mutations beyond simple text replacement.
- `src/document/validation.ts` — Hard workspace-physics rules. `document` physics forbids frames/groups; `design` physics requires every semantic block to have a linked frame. This constrains any structural text editing in design workspaces.
- `src/document/schema.ts` — Canonical document shape. Semantic text is block/section based, not stored as one monolithic document string. Structural text mode work must preserve section/block references and split provenance.
- `tests/web/editor-document-mode.test.ts` — Existing proof that inline text editing in document physics persists through canonical action payloads and keeps textarea focus through save/refetch.
- `tests/web/editor-design-mode.test.ts` — Existing proof that design workspaces still support linked text editing via `replace_block_text` after frame interaction.
- `tests/web/editor-first-run-guidance.test.ts` — Confirms current lens UI is only guidance plus inline editing; good base to extend with explicit text-mode activation expectations.
- `tests/utils/bridge-browser.ts` — Existing helpers for temp workspaces, bridge startup, and browser-driven verification. Reuse this pattern for S04 browser/runtime coverage.

### Build Order

1. **Define S04 scope against the action surface first.**
   - Inspect and decide whether “real writing surface” means only better text UX or also structural mutations.
   - This choice determines whether work stays mostly in `App.tsx`/`Canvas.tsx` or must widen the action contract in `src/editor/actions.ts`.

2. **Add explicit lens state in `web/src/App.tsx`.**
   - Build actual text/tile/freeform mode selection instead of static cards.
   - Keep lens choice separate from `payload.physics`; physics still describes canonical workspace constraints, not the active UI lens.

3. **Add a text-lens render path in `web/src/editor/Canvas.tsx`.**
   - For design workspaces, render semantic sections/blocks as a writing-first surface instead of requiring frame-centric interaction.
   - Preserve current design/tile behaviors for the tile lens.
   - Make observability explicit with new stable test ids/data attributes for active lens, active block, and text-surface state.

4. **Extend `web/src/editor/engine.ts` only as needed for text-surface behavior.**
   - Reuse existing draft/commit behavior for rewrite-only scope.
   - If structural operations are in scope, add engine methods only after canonical actions exist.

5. **If structural text edits are required, widen the canonical action seam next.**
   - Add new action kinds to `src/editor/actions.ts` and `web/src/bridge-client.ts`.
   - Ensure application logic preserves section order and, in design workspaces, linked frame invariants from `src/document/validation.ts`.

6. **Finish with browser/runtime proof.**
   - Extend existing web tests and, if needed, add a new S04 smoke verifier script alongside the current runtime verifiers.

### Verification Approach

- Unit/contract:
  - `npm test -- tests/document/editor-actions.test.ts`
  - `npm test -- tests/bridge/bridge-editor-contract.test.ts`
  - Add/extend cases if S04 introduces new editor actions.
- Browser/runtime:
  - `npm test -- tests/web/editor-document-mode.test.ts`
  - `npm test -- tests/web/editor-design-mode.test.ts`
  - `npm test -- tests/web/editor-first-run-guidance.test.ts`
  - Add a dedicated S04 browser test for switching into text mode in a **design** workspace and proving edits still submit `replace_block_text` through `/__sfrb/editor` while presenting non-frame-centric UI.
- Full build/smoke:
  - `npm run build`
  - Existing smoke pattern is `scripts/verify-s04-editor-smoke.mjs` / `scripts/verify-s05-layout-consultant.mjs`; if S04 changes runtime behavior materially, add or extend a verifier script rather than relying only on unit tests.
- Observable behaviors to assert:
  - Explicit active lens indicator distinct from `#physics-mode`
  - Text lens available in both document and design workspaces
  - No drag/tile affordances shown while text lens is active
  - Editing keeps focus through save/refetch
  - `Last action` stays canonical (`replace_block_text` or new approved text action kinds)
  - `resume.sfrb.json` stays authoritative after bridge refresh

## Constraints

- `src/document/validation.ts` makes workspace physics a hard boundary: document workspaces cannot persist frames/groups, and design workspaces must maintain a frame for every semantic block.
- `web/src/editor/Canvas.tsx` currently binds surface rendering directly to `payload.physics`; S04 needs a UI lens layer without confusing it with canonical physics.
- The semantic model in `src/document/schema.ts` is block/section based, so any “single writing surface” UI is an editing projection over structured content, not a freeform plain-text file.
- The current action contract in `web/src/bridge-client.ts` / `src/editor/actions.ts` has no text-structure actions beyond `replace_block_text`.

## Common Pitfalls

- **Confusing lens state with workspace physics** — `physics` is canonical document/layout capability, not the same thing as the active editing lens. Keep text/tile/freeform selection browser-local unless there is an explicit requirement to persist it.
- **Adding browser-only structural edits** — If text mode can do more than rewrite block text, those operations must become canonical editor actions; otherwise S02/S07 parity breaks.
- **Breaking design-mode invariants during text restructuring** — In a design workspace, adding/removing/reordering semantic blocks may also require linked frame updates or new frame generation to satisfy validation.
- **Regressing existing focus/save behavior** — Current tests explicitly protect textarea focus during save/refetch. Reuse that pattern when replacing inline block editing with a richer text surface.

## Open Risks

- The slice wording suggests a more fluid writer experience than the current block model naturally provides; the team may discover that “real writing surface” needs structural actions, not just better chrome.
- If text lens must work equally well in design workspaces, the planner should expect follow-on reconciliation complexity for S06 because text edits may diverge from existing frame/tile compositions.
- Product feel matters here: the `frontend-design` skill reinforces using a deliberate, non-generic visual direction. S04 should not stop at functional mode switching; the writing surface needs calmer, more editorial UI than the current diagnostics-heavy shell.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend UI polish | `frontend-design` | available |
| React | `vercel-labs/agent-skills@vercel-react-best-practices` | none found locally; discoverable via `npx skills find "react"` |
