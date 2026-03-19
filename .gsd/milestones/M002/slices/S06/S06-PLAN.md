# S06: Mode Reconciliation & Layout Policies

**Goal:** Ship explicit, trustworthy mode-reconciliation behavior so users can move between Text, Tile, and Freeform without hidden rewrites, while keeping the active lens browser-local and making the important layout outcomes canonical, inspectable, and later CLI-invokable.
**Demo:** In the shipped `dist/cli.js open` runtime, a user edits a design resume in Freeform, chooses whether a changed composition should stay locked or rejoin structured layout logic when leaving Freeform, sees a concise transition summary that explains what was preserved and what remains risky, and can verify the outcome through `Last action`, `/__sfrb/bootstrap`, and `resume.sfrb.json` without silent geometry jumps or no-write ambiguity.

S06 is the trust-contract slice for M002. The risky part is not adding a fourth editing surface; it is making cross-lens behavior honest enough that S07 can later invoke the same outcomes from the CLI. The plan therefore starts at the canonical action boundary, because the research shows lens switching itself should remain browser-local while the meaningful reconciliation outcome must become persisted and inspectable. From there the work moves outward: first define the minimal transition action/result and no-write diagnostics, then add the explicit Freeform exit flow and shell summary, then encode the chosen overflow continuity policy using the existing consultant/measurement path instead of inventing pagination, and finally re-prove everything through the built runtime. This directly advances **R012** as the owned requirement, closes the remaining cross-lens portion of **R008**, supports the trust side of **R010**, and preserves the already-validated tile/freeform guarantees from **R014** and **R015** by making their outcomes visible rather than implicit.

## Must-Haves

- Mode switching keeps the active lens browser-local, but any meaningful reconciliation outcome is explicit, inspectable, and persisted through the shared editor/bridge boundary rather than hidden in browser session state.
- Leaving Freeform for Text or Tile uses an explicit policy path for compositions that changed: at minimum the user can intentionally keep a composition locked or rejoin structured layout logic, and the result is summarized in product language instead of silent geometry jumps.
- The shipped overflow/layout continuity policy is honest and bounded: it reuses the existing measurement/consultant pipeline, preserves continuity across lens switches, and surfaces unresolved overflow/risky placement instead of pretending a full auto-pagination engine exists.
- Browser, bridge, and built-runtime proof cover success and failure paths, including no-write diagnostics for invalid reconciliation choices and stable observability for a future agent to inspect what policy was applied.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- `npm test -- --run tests/web/editor-mode-reconciliation.test.ts`
- `npm run build`
- `node scripts/verify-s04-editor-smoke.mjs`
- `node scripts/verify-s05-freeform-smoke.mjs`
- `node scripts/verify-s06-mode-reconciliation-smoke.mjs`
- Failure-path check: submit an invalid or blocked reconciliation action through `/__sfrb/editor` and verify the returned diagnostics are visible while `/__sfrb/bootstrap` and `resume.sfrb.json` remain unchanged.

## Observability / Diagnostics

- Runtime signals: active lens, pending transition target, reconciliation policy choice, reconciliation summary/outcome, last canonical action kind, and overflow/risky-placement state after mode changes.
- Inspection surfaces: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, `src/editor/actions.ts`, `web/src/bridge-client.ts`, `/__sfrb/editor`, `/__sfrb/bootstrap`, `resume.sfrb.json`, `#editing-lenses`, `#shell-active-lens`, `#editor-last-action-kind`, and stable S06 summary/choice testids added in browser tests and the new smoke script.
- Failure visibility: a future agent can tell whether reconciliation was never requested, rejected at the canonical boundary, completed with stay-locked vs rejoin behavior, or completed while leaving unresolved overflow/risky placement visible.
- Redaction constraints: diagnostics may expose canonical frame ids, group ids, block ids, starter metadata, and workspace-relative paths, but must not reveal secrets or unrelated local environment values.

## Integration Closure

- Upstream surfaces consumed: S02 editor action/apply contract and bridge seam, S03 tile grouping/locking invariants, S04 browser-local lens shell and text semantics, S05 freeform selection/move HUD state, existing overflow measurement in `Canvas`, and the consultant/ghost-preview flow in `App`.
- New wiring introduced in this slice: canonical reconciliation action/result and diagnostics → bridge client/server persistence → guarded Freeform-exit flow in the shell → transition summary + overflow continuity messaging in the canvas/shell → browser and built-runtime verification of success and no-write failure paths.
- What remains before the milestone is truly usable end-to-end: S07 still needs direct CLI invocation parity for the canonical action surface and the final round of product polish, but S06 should leave the reconciliation contract and trust posture complete enough for that work to be wiring rather than redesign.

## Tasks

- [x] **T01: Define the canonical reconciliation action and no-write diagnostics** `est:2h`
  - Why: S06 fails its core requirement if mode reconciliation remains a browser-only lens flip; this task establishes the minimal persisted contract that S07 can later invoke from the CLI.
  - Files: `src/editor/actions.ts`, `web/src/bridge-client.ts`, `src/bridge/server.mjs`, `tests/document/editor-actions.test.ts`, `tests/bridge/bridge-editor-contract.test.ts`
  - Do: Add the smallest honest reconciliation action/result surface to the shared editor contract for leaving Freeform and returning to structured behavior; keep the active lens itself browser-local; encode explicit policy choices for keeping a composition locked versus rejoining structured layout logic without violating design/document validation rules; return actionable diagnostics and no-write outcomes for invalid targets or unsupported choices; and mirror the payload/result shape through the browser bridge so later UI work can rely on one canonical contract. Relevant skill to load before implementation: `test`.
  - Verify: `npm test -- --run tests/document/editor-actions.test.ts && npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
  - Done when: the canonical action layer can persist and report an inspectable reconciliation outcome, invalid reconciliation requests fail without writing, and the bridge exposes the same payload/result shape to browser and future CLI callers.
- [x] **T02: Add an explicit Freeform exit flow and transition summary UI** `est:3h`
  - Why: Users need a visible, understandable decision point when leaving Freeform; otherwise the slice would still hide the most trust-sensitive behavior behind a lens button.
  - Files: `web/src/App.tsx`, `web/src/editor/engine.ts`, `web/src/editor/Canvas.tsx`, `tests/web/editor-first-run-guidance.test.ts`, `tests/web/editor-freeform-mode.test.ts`, `tests/web/editor-mode-reconciliation.test.ts`
  - Do: Guard the Text/Tile lens buttons when Freeform has reconciliation-relevant state, present an explicit stay-locked vs rejoin choice, call the new canonical action before completing the lens switch, and surface a lightweight transition summary banner/card in product language that explains what changed and what remained fixed; preserve the browser-local lens model and S04/S05 interaction assumptions; and add stable testids for pending target lens, selected policy, and the last reconciliation summary. Relevant skills to load before implementation: `frontend-design`, `test`.
  - Verify: `npm test -- --run tests/web/editor-first-run-guidance.test.ts && npm test -- --run tests/web/editor-freeform-mode.test.ts && npm test -- --run tests/web/editor-mode-reconciliation.test.ts`
  - Done when: leaving Freeform no longer silently flips lenses when reconciliation matters, the browser shows an explicit choice plus summary, and the posted reconciliation outcome matches the bridge contract from T01.
- [x] **T03: Encode the overflow continuity policy and prove cross-lens layout behavior** `est:3h`
  - Why: R012 is not actually retired until the user can trust what happens to overflow and risky placement across mode switches; this task chooses the honest policy the current model can prove.
  - Files: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, `tests/web/editor-layout-consultant.test.ts`, `tests/web/editor-mode-reconciliation.test.ts`, `tests/utils/bridge-browser.ts`
  - Do: Build S06 on the existing frame-measurement and consultant path instead of inventing pagination; keep geometry continuity by default, surface unresolved overflow/risky placement in the transition summary/HUD, and wire any explicit nudge or consultant proposal messaging through the same observability surfaces already used for ghost previews and overflow notes; verify both stay-locked and rejoin paths preserve S03/S05 invariants and do not silently rewrite layout. Relevant skills to load before implementation: `frontend-design`, `test`.
  - Verify: `npm test -- --run tests/web/editor-layout-consultant.test.ts && npm test -- --run tests/web/editor-mode-reconciliation.test.ts`
  - Done when: the chosen overflow policy is explicit in the product and tests, cross-lens transitions preserve continuity without pretending to auto-paginate, and unresolved layout risk remains inspectable after the switch.
- [x] **T04: Add shipped-runtime reconciliation proof and record slice evidence** `est:2h`
  - Why: S06 is only complete when the built `dist/cli.js open` loop proves the trust contract on a real workspace rather than only inside Vitest.
  - Files: `scripts/verify-s06-mode-reconciliation-smoke.mjs`, `tests/utils/bridge-browser.ts`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, `.gsd/milestones/M002/slices/S06/S06-SUMMARY.md`
  - Do: Add a dedicated S06 smoke verifier that opens a design workspace through the built runtime, enters Freeform, makes a reconciliation-relevant move, exercises both a successful explicit policy path and an invalid/no-write path, and re-checks `#editor-last-action-kind`, `/__sfrb/bootstrap`, and `resume.sfrb.json`; then update requirement and roadmap evidence plus the slice summary with the final proof trail and any known verification caveats. Relevant skill to load before implementation: `test`.
  - Verify: `npm run build && node scripts/verify-s04-editor-smoke.mjs && node scripts/verify-s05-freeform-smoke.mjs && node scripts/verify-s06-mode-reconciliation-smoke.mjs`
  - Done when: the built runtime proves explicit reconciliation outcomes and overflow continuity on a real workspace, no-write failures stay inspectable, and the slice records evidence that can advance requirement/roadmap status.

## Files Likely Touched

- `src/editor/actions.ts`
- `web/src/bridge-client.ts`
- `src/bridge/server.mjs`
- `web/src/App.tsx`
- `web/src/editor/Canvas.tsx`
- `web/src/editor/engine.ts`
- `tests/document/editor-actions.test.ts`
- `tests/bridge/bridge-editor-contract.test.ts`
- `tests/web/editor-first-run-guidance.test.ts`
- `tests/web/editor-freeform-mode.test.ts`
- `tests/web/editor-layout-consultant.test.ts`
- `tests/web/editor-mode-reconciliation.test.ts`
- `tests/utils/bridge-browser.ts`
- `scripts/verify-s06-mode-reconciliation-smoke.mjs`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M002/M002-ROADMAP.md`
- `.gsd/milestones/M002/slices/S06/S06-SUMMARY.md`
