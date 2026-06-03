# S05: Freeform Element Editor — Research

**Date:** 2026-03-16

## Summary

S05 is a **targeted-but-nontrivial** slice. The browser shell already exposes a Freeform lens, but it is only a placeholder: `web/src/App.tsx` still labels it “Preview only,” and `web/src/editor/Canvas.tsx` renders a static panel instead of an editing surface. The existing engine and bridge seams are good news: the canonical mutation path is already shared through `src/editor/actions.ts` → `src/bridge/server.mjs` → `web/src/bridge-client.ts`, and the design canvas already knows how to select, drag, and persist positioned objects. The main gap is that all of that behavior is currently hard-gated to the Tile lens.

The key architectural constraint is that the canonical document model does **not** yet have a generic “page element” type. `src/document/schema.ts` only persists positioned `layout.frames`, each tied 1:1 to a semantic block, plus `frameGroups`. That means the most credible first S05 release is a freeform editor over the **real positioned objects that already exist canonically**: framed headings/paragraphs/facts/bullets, plus smaller line-level pieces created via the existing `split_block` action from S03. If S05 tries to ship true divider/line primitives immediately, it becomes a schema-expansion slice, not just a UI/editor slice.

## Recommendation

Ship S05 in two layers, with the first one explicitly scoped to **block-backed and split-line-backed page elements**:

1. **Promote Freeform from preview to real lens** by reusing the design-page rendering path in `web/src/editor/Canvas.tsx`, but swap the tile-oriented chrome for a cleaner Figma/Acrobat-style selection surface with explicit geometry readouts and visible “risky state” feedback.
2. **Extend the engine so frame selection + drag commits work in Freeform as well as Tile**, instead of adding a second persistence path. The cheapest honest persistence model is still `set_frame_box` for individual elements, with existing `split_block` producing smaller movable pieces when the user needs finer granularity than a whole text box.
3. **Treat non-block decorative primitives (true dividers/lines) as a deliberate follow-on only if planning chooses a schema expansion.** There is currently no canonical slot for them in `src/document/schema.ts`, no bridge action for them, and no runtime rendering model for them.

This approach retires the current product gap behind R014 without destabilizing S02/S03/S04. It also leaves S06 a clean input: persisted freeform geometry still lives in the canonical document, and reconciliation can later decide what happens when those free-moved pieces re-enter structured lenses.

## Implementation Landscape

### Key Files

- `src/document/schema.ts` — Canonical document boundary. Today it only knows `layout.pages`, `layout.frames`, and `layout.frameGroups`; there is no generic `layout.elements` collection and no divider/line primitive.
- `src/editor/actions.ts` — Canonical action union and apply layer. Current geometry actions are `set_frame_box`, `split_block`, `create_frame_group`, `set_frame_group_locked`, and `translate_frame_group`. There is no freeform-specific or element-id-based action yet.
- `src/bridge/server.mjs` — `/__sfrb/editor` already resolves `{ action }` by calling `parseEditorAction()` + `applyEditorAction()` and writing the validated result. If S05 can stay inside the existing action model, bridge changes stay minimal.
- `web/src/bridge-client.ts` — Browser-side mirror of the action union and submit helpers. Any new canonical action must be added here, but existing `submitBridgeFrameBoxAction()` is already a viable commit path for individual freeform element moves.
- `web/src/editor/engine.ts` — Main interaction seam. Important current limitation: `selectFrame()`, `beginFrameDrag()`, `previewDrag()`, `commitDrag()`, `getNextPendingAction()`, group lookup, and split affordances are all effectively gated to `activeLens === 'tile'`. `DocumentEditorSnapshot` also has no freeform-specific selected-element or risk-state fields.
- `web/src/editor/Canvas.tsx` — Main browser rendering seam. `renderDesignMode()` already builds positioned frame DOM with pointer drag handles, badges, geometry data attrs, and editable block bodies. `renderFreeformMode()` is currently only a static “Not shipped yet” panel.
- `web/src/App.tsx` — Shell copy/state. Freeform still says “Preview the next surface” / “Preview only”; finishing S05 requires updating this user-facing promise and the availability text.
- `src/document/starters.ts` — Current starter template already gives multiple independent block-backed page objects, including `bullet` blocks. This is the strongest existing source of “real page elements” without schema expansion.
- `tests/web/editor-first-run-guidance.test.ts` — Currently asserts Freeform is “Preview only”; this becomes a required regression update when the lens ships.
- `tests/web/editor-design-mode.test.ts` — Existing single-frame drag persistence proof. Useful baseline for Freeform because it already captures `/__sfrb/editor` requests and asserts `set_frame_box` commits.
- `tests/web/editor-tile-mode.test.ts` — Existing split/group/lock proof. Important if S05 uses split-line fragments as its first fine-grained freeform elements.
- `scripts/verify-s05-layout-consultant.mjs` — Despite the name, this is a layout-consultant smoke verifier, not a freeform verifier. S05 currently has no dedicated freeform smoke script.

### Build Order

1. **Decide and document the first shipped freeform element set.**
   - Lowest-risk choice: block-backed frames + bullet blocks + split-line fragments.
   - Higher-cost choice: add true divider/line element types to the schema/action model.
   - This is the slice’s biggest planning fork.
2. **Make Freeform a real lens in the engine, not just a Canvas-only rendering trick.**
   - Remove tile-only gating where frame selection/drag/commit should also work in Freeform.
   - Add snapshot fields/testids for selected freeform element id, geometry, and any visible risk state.
3. **Replace `renderFreeformMode()` placeholder with an actual positioned page surface.**
   - Reuse `renderDesignMode()` page/frame construction patterns.
   - Keep freeform chrome distinct from Tile: less group-toolbar emphasis, clearer selection box/geometry HUD, explicit “unusual placement” messaging instead of silent correction.
4. **Only then decide whether canonical action/schema expansion is needed.**
   - If the chosen scope is existing frames/split fragments, `set_frame_box` may be sufficient.
   - If planning insists on true dividers/lines, extend `src/document/schema.ts`, `src/editor/actions.ts`, `web/src/bridge-client.ts`, rendering, and validation together.
5. **Add browser/runtime verification and a dedicated S05 smoke path.**
   - Update first-run guidance expectations.
   - Add at least one built-runtime proof that a freeform element move persists through `dist/cli.js open` → `/__sfrb/editor` → `/__sfrb/bootstrap` → `resume.sfrb.json`.

### Verification Approach

- Contract layer:
  - `npm test -- tests/document/editor-actions.test.ts tests/bridge/bridge-editor-contract.test.ts`
  - Add/extend cases only if S05 introduces new canonical actions or schema fields.
- Browser integration:
  - `npm test -- tests/web/editor-first-run-guidance.test.ts tests/web/editor-design-mode.test.ts tests/web/editor-tile-mode.test.ts`
  - Add a new `tests/web/editor-freeform-mode.test.ts` that proves:
    - Freeform is no longer “Preview only”
    - a positioned element can be selected in Freeform
    - dragging emits the expected canonical action payload
    - `/__sfrb/bootstrap` and `resume.sfrb.json` reflect the moved geometry
    - visible freeform observability surfaces expose selected element identity + geometry
- Runtime smoke:
  - Add a new `scripts/verify-s05-freeform-smoke.mjs` instead of reusing the misleading consultant script.
  - Expected proof shape should match prior slices: build once, open via `dist/cli.js open`, automate Chromium, assert disk + bootstrap + browser parity.

## Constraints

- `src/document/schema.ts` enforces a 1:1 relationship between semantic blocks and layout frames. Freeform can move existing positioned objects, but it cannot honestly persist brand-new non-block element kinds without a schema change.
- `web/src/editor/engine.ts` currently treats frame selection, drag preview, and drag commit as Tile-only behavior. Freeform work that ignores this will render a surface that looks editable but cannot persist.
- `tests/web/editor-first-run-guidance.test.ts` currently hard-codes Freeform as preview-only. Any shipped Freeform lens must update shell copy and tests together.
- The existing smoke command (`npm run verify:smoke`) does not cover freeform editing. S05 needs its own runtime verifier if it is to be retired with the same built-path standard as S03/S04.

## Common Pitfalls

- **Calling frames “elements” without changing behavior** — the current code already moves frames in Tile mode. S05 only becomes meaningful if Freeform gets its own real lens behavior, observability, and product framing rather than rebranding the Tile surface.
- **Assuming the model already supports lines/dividers** — it does not. Bullets exist as semantic blocks; finer text pieces can come from `split_block`; true decorative primitives would require canonical model work.
- **Adding browser-only freeform state** — S05 consumes S02’s action contract. Selection chrome can stay session-local, but meaningful geometry changes must still round-trip through `/__sfrb/editor` and `resume.sfrb.json`.
- **Breaking S03 lock/group invariants accidentally** — locked group movement currently has explicit tile semantics via `translate_frame_group`. If Freeform allows member-level movement inside locked groups, that needs an intentional visible rule, not accidental bypass.

## Open Risks

- The biggest unresolved planning choice is whether S05 should be scoped to existing block-backed elements or expanded to introduce true non-text page primitives. The former is much cheaper and aligns with current schema reality; the latter broadens the slice materially.
- Locked groups from S03 create a semantic question for Freeform: can an individual member be pulled free, does the group block that move, or does Freeform surface an explicit breakaway state? S06 owns reconciliation, but S05 still needs a visible immediate stance.
- Risk-state UX is still open. The current codebase has strong patterns for visible geometry feedback (`data-frame-*`, selection badges, consultant ghost previews, margin guides), but no shipped treatment yet for “this freeform placement is unusual but preserved.”

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend/editor UI | `frontend-design` | available |
| React patterns | `vercel-labs/agent-skills@vercel-react-best-practices` | none found locally; suggested by `npx skills find "react"` |
| Playwright testing | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | none found locally; suggested by `npx skills find "playwright"` |
