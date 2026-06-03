# T03: Encode the overflow continuity policy and prove cross-lens layout behavior

Added honest overflow/risk continuity across Tile and Freeform by carrying existing measurement state into shell/canvas HUDs, keeping geometry/lock state explicit, and proving the behavior in browser plus shipped-runtime checks.

## Highlights

- Added `selectedFramePlacementState` to `web/src/editor/engine.ts` so placement-risk observability comes from one derived source.
- Extended `web/src/App.tsx` with shell-level continuity selectors for carried overflow, placement, consultant state, and continuity messaging.
- Extended `web/src/editor/Canvas.tsx` with mirrored transition-strip selectors plus `#freeform-overflow-note` so overflow stays inspectable after Tile → Freeform.
- Added browser diagnostics helper coverage in `tests/utils/bridge-browser.ts` and proved both consultant continuity and overflow continuity in `tests/web/editor-layout-consultant.test.ts` and `tests/web/editor-mode-reconciliation.test.ts`.
- Added `scripts/verify-s06-mode-reconciliation-smoke.mjs` so the slice verification stack now has a shipped-runtime S06 verifier.

## Verification

- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- `npm test -- --run tests/web/editor-mode-reconciliation.test.ts`
- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-freeform-mode.test.ts`
- `npm run build`
- `node scripts/verify-s04-editor-smoke.mjs`
- `node scripts/verify-s05-freeform-smoke.mjs`
- `node scripts/verify-s06-mode-reconciliation-smoke.mjs`
