---
estimated_steps: 4
estimated_files: 6
---

# T03: Encode the overflow continuity policy and prove cross-lens layout behavior

**Slice:** S06 — Mode Reconciliation & Layout Policies
**Milestone:** M002

## Description

S06 also has to settle what “trustworthy layout continuity” means without inventing a pagination engine. This task should choose and implement the honest overflow policy the current model can support: preserve continuity across lens switches, surface unresolved overflow or risky placement through the existing consultant/measurement path, and avoid silent relayout magic.

Relevant skills to load before implementation: `frontend-design`, `test`.

## Steps

1. Inspect the existing overflow-measurement, ghost-preview, and consultant surfaces in `web/src/App.tsx` and `web/src/editor/Canvas.tsx`, along with the related browser tests, to anchor S06 on the already-shipped layout diagnostics path.
2. Wire the chosen S06 trust posture into the transition summary/HUD: keep geometry continuity by default, show unresolved overflow or risky placement explicitly after a stay-locked or rejoin transition, and reuse consultant language/proposals where the user needs help nudging layout back into a comfortable state.
3. Preserve S03/S05 invariants while proving that switching between Tile and Freeform after layout changes does not silently rewrite lock/group state or hide overflow simply because the lens changed.
4. Extend browser tests to cover the selected overflow policy, including a case where risk remains visible after the mode switch and a case where a consultant-assisted path updates the user-facing summary cleanly.

## Must-Haves

- [ ] S06 does not introduce a fake auto-pagination/reflow engine; it builds on the existing overflow/consultant measurement path.
- [ ] Cross-lens transitions preserve geometry and lock/group invariants unless the user explicitly chooses a canonical reconciliation policy that changes them.
- [ ] Unresolved overflow or risky placement remains visible and inspectable after the switch instead of disappearing with the old lens.

## Verification

- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- `npm test -- --run tests/web/editor-mode-reconciliation.test.ts`

## Observability Impact

- Signals added/changed: post-transition overflow/risk summary, consultant continuity messaging, and any policy-specific warning state retained across lenses.
- How a future agent inspects this: use the layout consultant test, the mode-reconciliation test, and the relevant summary/HUD selectors in the browser UI.
- Failure state exposed: hidden overflow after switching lenses, silent lock/group resets, or summary text that conflicts with actual consultant state becomes directly diagnosable.

## Inputs

- `web/src/App.tsx` and `web/src/editor/Canvas.tsx` — current overflow measurement, consultant panel, ghost-preview, and placement-note surfaces.
- `web/src/editor/engine.ts` — local state that coordinates lens changes and summaries.
- `tests/web/editor-layout-consultant.test.ts` — existing proof for overflow/consultant trust behavior.
- `tests/web/editor-mode-reconciliation.test.ts` — new S06-focused browser coverage introduced in T02.
- `S06-RESEARCH.md` — guidance to avoid full pagination scope creep and choose an honest continuity policy the model can actually prove.

## Expected Output

- `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, and `web/src/editor/engine.ts` — explicit overflow/risk continuity behavior tied into the S06 transition summary.
- `tests/web/editor-layout-consultant.test.ts` and `tests/web/editor-mode-reconciliation.test.ts` — proof that layout risk remains visible and group/geometry invariants survive lens changes.
- `tests/utils/bridge-browser.ts` — any helper additions needed to exercise the new transition/consultant paths consistently in browser tests.
