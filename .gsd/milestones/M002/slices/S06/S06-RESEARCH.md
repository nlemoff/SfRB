# S06: Mode Reconciliation & Layout Policies — Research

**Date:** 2026-03-16

## Summary

S06 primarily owns **R012** and directly supports the remaining cross-lens portion of **R008**. It also affects the user-trust side of **R010** and must preserve the already-validated guarantees behind **R014** and **R015**. The main finding is that the codebase now has real Text, Tile, and Freeform lenses, but **mode switching itself is still almost entirely browser-local**. In `web/src/App.tsx` and `web/src/editor/engine.ts`, switching lenses currently just flips `activeLens`, normalizes Tile away in non-design workspaces, and clears tile/freeform session state. There is **no canonical reconciliation action, no persisted transition outcome, no explicit freeform re-entry choice, and no lightweight transition summary surface** yet.

The second important finding is that the existing canonical model is stricter than the slice wording might imply. `src/document/schema.ts` and `src/document/validation.ts` still enforce the M001/S02 physics boundary: **document workspaces cannot contain frames/groups**, and **design workspaces must contain a frame for every semantic block**. Freeform and Tile both operate over the same canonical `layout.frames` / `layout.frameGroups` model; Text operates over semantic blocks/sections. That means S06 cannot “rejoin document logic” by inventing hidden browser-only layout state or by casually dropping frames/groups in a design workspace. If S06 needs a canonical, CLI-visible reconciliation result for S07, it likely needs a **small new canonical action/result surface** rather than just more UI copy.

## Recommendation

Treat S06 as a **trust-contract slice first, UI slice second**.

1. **Define the minimal canonical reconciliation contract before touching the shell.**
   - Today `src/editor/actions.ts` has no transition/reconciliation action at all; `src/bridge/server.mjs` only knows `{ action }` or whole `{ document }` writes; `web/src/bridge-client.ts` only exposes content/layout mutations.
   - S07 explicitly expects real mode-transition outputs from S06, so the planner should assume S06 needs at least one shared, inspectable reconciliation primitive or diagnostic shape for transitions that matter, especially Freeform → structured re-entry.

2. **Keep lens choice browser-local, but make reconciliation outcomes explicit and inspectable.**
   - S04 already established that active lens is browser-local and separate from canonical physics; that should remain true.
   - What must become explicit is not the lens itself, but the **outcome of leaving Freeform / returning to a structured lens**: e.g. “stay locked” vs “rejoin structured layout logic,” plus a concise summary of what stayed fixed, what remains risky, and whether overflow is still present.

3. **Reuse existing observability instead of inventing a parallel subsystem.**
   - `web/src/editor/Canvas.tsx` already exposes freeform HUD state (`freeform-selected-element-*`, `freeform-placement-note`) and tile/group state.
   - `web/src/App.tsx` already owns lens buttons, save/action status, and the consultant/overflow panel.
   - `Canvas` already measures overflow for selected design frames and `App` already manages ghost previews and accept/reject flows through canonical `set_frame_box`.
   - The natural path is to extend these surfaces with a transition summary / reconciliation banner and to drive any persisted outcome through the same `/__sfrb/editor` action boundary.

4. **Choose the overflow policy by building on the existing single-frame measurement path, not by introducing a full pagination engine.**
   - There is currently no pagination/reflow engine in the codebase. The model has `layout.pages[]`, frame boxes, and margin guides, but no canonical auto-layout solver.
   - The most realistic S06 policy is to keep continuity trustworthy with explicit overflow diagnostics, a chosen “comfort zone”/overflow stance, and consultant-assisted or canonical frame adjustments — not hidden automatic page reflow magic.

## Implementation Landscape

### Key Files

- `src/editor/actions.ts` — Canonical editor action union and apply layer. Today it covers text edits, block/section structure changes, frame moves, splitting, groups, locking, and locked-group translation. It has **no mode-transition/reconciliation action** yet, but it is the only honest place to add one if S07 must later invoke the same outcome from the CLI.
- `web/src/bridge-client.ts` — Browser-side contract mirror for `/__sfrb/editor`. It exposes all current action helpers plus `inspectBridgeFrameMoveTarget()`. If S06 adds a canonical reconciliation action or richer transition diagnostics, this file must mirror them.
- `src/bridge/server.mjs` — `/__sfrb/editor` currently accepts either `{ action }` or `{ document }`, validates through `resolveMutationDocument()`, writes the canonical file, and returns `actionKind`. This is the bridge seam for any new canonical reconciliation result or diagnostic payload.
- `web/src/editor/engine.ts` — Current browser-local interaction state. `setActiveLens()` only flips local lens state; leaving Tile/Freeform clears tile state via `clearTileState()`. There is no remembered transition summary, no explicit Freeform exit flow, and no canonical reconciliation request.
- `web/src/App.tsx` — Owns the lens buttons, shell-level status, consultant panel, bootstrap sync, and default-lens logic. This is the natural seam for an explicit “leaving Freeform” choice surface and a lightweight transition summary banner/card.
- `web/src/editor/Canvas.tsx` — Owns the actual Text/Tile/Freeform rendering plus the existing tile toolbar, freeform HUD, and overflow measurement pipeline. Best place to expose post-transition state such as “locked composition preserved,” “rejoined structured layout,” “risky placement remains,” or “overflow still unresolved.”
- `src/document/schema.ts` — Hard boundary: only pages, frames, frame groups, semantic sections, and semantic blocks exist canonically right now. There is **no canonical pagination/reconciliation record** yet.
- `src/document/validation.ts` — Hard boundary: document physics forbids frames/groups; design physics requires a frame per semantic block. Any reconciliation path must preserve those invariants.
- `tests/document/editor-actions.test.ts` — Existing action-layer proof. Extend here first if S06 adds reconciliation actions or new no-write diagnostics.
- `tests/bridge/bridge-editor-contract.test.ts` — Existing bridge truth test for action persistence and invalid-action no-write behavior. This should cover any new canonical transition/reconciliation action before browser work starts.
- `tests/web/editor-first-run-guidance.test.ts` — Already proves lens availability/defaults. Useful place to assert any new shell-level summary or explicit exit choice wiring.
- `tests/web/editor-text-mode.test.ts` — Regression guard for Text semantics; should stay green while S06 adds transition logic.
- `tests/web/editor-tile-mode.test.ts` — Regression guard for split/group/lock/translate invariants.
- `tests/web/editor-freeform-mode.test.ts` — Regression guard for Freeform selection, blocked moves, and canonical frame movement. Likely base for new Freeform → structured transition assertions.
- `tests/web/editor-layout-consultant.test.ts` — Existing overflow/ghost-preview trust test. Best existing proof point for choosing and preserving the S06 overflow continuity policy.
- `scripts/verify-s04-editor-smoke.mjs` — Built-runtime regression guard for Text.
- `scripts/verify-s05-freeform-smoke.mjs` — Built-runtime regression guard for Freeform.
- `tests/utils/bridge-browser.ts` — Existing temp-workspace/open/bootstrap utilities. Reuse for S06 browser/bridge coverage.

### Build Order

1. **Lock the canonical S06 contract first.**
   - Decide the minimum inspectable transition outcome that S07 can later call from the CLI.
   - Most likely output: a shared reconciliation action and/or shared reconciliation diagnostic/result payload for Freeform → structured transitions.
   - Prove it in `src/editor/actions.ts` + `tests/document/editor-actions.test.ts` + `tests/bridge/bridge-editor-contract.test.ts` before changing UI flow.

2. **Add explicit Freeform exit / structured re-entry flow in `web/src/App.tsx` + `web/src/editor/engine.ts`.**
   - Current lens buttons switch immediately. S06 needs a guarded path when leaving Freeform and there is a meaningful placement/reconciliation decision to make.
   - Keep the lens itself browser-local, but route the user through an explicit choice when required.

3. **Surface lightweight transition summaries in `web/src/App.tsx` + `web/src/editor/Canvas.tsx`.**
   - Reuse the save/action surface, freeform HUD, and/or a new summary banner near the lens controls.
   - Show what policy was applied, what remained locked, whether placement is risky, and whether overflow remains unresolved.

4. **Choose and encode the overflow continuity policy using the existing consultant/measurement pipeline.**
   - Avoid full pagination/reflow scope creep.
   - Extend `Canvas`/`App` tests so the chosen policy is explicit and inspectable when switching between Tile and Freeform, especially after geometry changes that produce overflow or out-of-margin placement.

5. **Close with shipped-runtime proof.**
   - Add an S06 verifier (likely a new `scripts/verify-s06-*.mjs`) instead of overloading S04/S05 smoke scripts.
   - Re-prove that the built runtime shows explicit transition outcomes and no-write failure behavior where appropriate.

### Verification Approach

Use the existing layered proof pattern from S04/S05.

**Contract / action layer**
- `npm test -- --run tests/document/editor-actions.test.ts`
- Add cases for any new reconciliation action/result, including invalid/blocked paths and no-write guarantees.

**Bridge contract**
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- Verify `/__sfrb/editor` persists any new reconciliation action, returns `actionKind`, and preserves bootstrap/disk stability on invalid choices.

**Browser integration**
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-text-mode.test.ts`
- `npm test -- --run tests/web/editor-tile-mode.test.ts`
- `npm test -- --run tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- Likely add a dedicated `tests/web/editor-mode-reconciliation.test.ts` for:
  - Freeform → Text / Tile explicit choice flow
  - “stay locked” vs “rejoin structured logic” summaries
  - visible risky/overflow continuity after mode switches
  - no silent jump / no hidden rewrite assertions

**Built runtime**
- `npm run build`
- `node scripts/verify-s04-editor-smoke.mjs`
- `node scripts/verify-s05-freeform-smoke.mjs`
- Add a new S06 smoke verifier to prove the shipped `dist/cli.js open` loop shows transition summaries and the chosen reconciliation/overflow policy through:
  - `#editing-lenses` / `#shell-active-lens`
  - summary/choice UI testids added by S06
  - `#editor-last-action-kind`
  - `/__sfrb/bootstrap`
  - `resume.sfrb.json`

## Constraints

- `src/document/validation.ts` still forbids frames/groups in `document` physics and requires a frame for every semantic block in `design` physics. Reconciliation cannot violate those workspace invariants.
- `web/src/App.tsx` and `web/src/editor/engine.ts` currently keep lens state browser-local by design (S04 decision). S06 should not collapse lens selection back into canonical physics.
- There is no general auto-layout or pagination engine in the current model. The codebase has page sizes, frame boxes, margin guides, and overflow measurement, but not a canonical reflow solver.
- Freeform and Tile both operate over the same canonical frames/groups. Any “stay locked” policy should preserve that shared model rather than introducing freeform-only element state.

## Common Pitfalls

- **Confusing lens switching with reconciliation** — today `setActiveLens()` just flips local state and clears session-local tile/freeform selection. If S06 only adds UI text around that, it will still fail R012 because no explicit outcome is recorded or inspectable.
- **Violating design/document physics while “rejoining”** — a design workspace cannot silently drop frames/groups to mimic document mode. Any rejoin policy must keep the design document valid.
- **Over-scoping into a layout engine** — the repo has overflow measurement and consultant-assisted resize, not full pagination/reflow. Choose a trustworthy continuity policy the current model can actually prove.
- **Breaking existing gesture assumptions** — preserve the S05 drag-threshold behavior for Freeform and the S04 focus/blur guards for Text controls; those are already recorded as fragile knowledge.

## Open Risks

- The phrase “rejoin document logic” is product-clear but technically ambiguous in the current model because there is no existing canonical relayout solver. Planning should decide the smallest honest meaning that S07 can later expose from the CLI.
- The slice context prefers an explicit user choice on Freeform re-entry, but it is still unsettled whether that choice is always asked or can be reused safely across repeated transitions.
- Overflow continuity may require choosing between “keep geometry and surface overflow risk” vs “nudge geometry through an explicit proposal/action.” Both are viable with current primitives; only one should ship as the default trust posture.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend UI/polish | `frontend-design` | available |
| Test strategy / Vitest alignment | `test` | available |
| React patterns | `vercel-labs/agent-skills@vercel-react-best-practices` | discoverable |
| Playwright browser testing | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | discoverable |
