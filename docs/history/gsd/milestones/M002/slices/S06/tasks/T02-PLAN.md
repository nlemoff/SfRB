---
estimated_steps: 4
estimated_files: 6
---

# T02: Add an explicit Freeform exit flow and transition summary UI

**Slice:** S06 — Mode Reconciliation & Layout Policies
**Milestone:** M002

## Description

Make the trust-sensitive choice visible to the user. After T01 establishes the shared contract, this task should turn leaving Freeform into an explicit, understandable flow that asks the user how to reconcile changed layout state before switching into Text or Tile, then shows a concise summary of the result in product language.

Relevant skills to load before implementation: `frontend-design`, `test`.

## Steps

1. Inspect the current lens-switching path in `web/src/App.tsx` and `web/src/editor/engine.ts`, plus the existing S05 Freeform HUD/testids in `Canvas`, to find where leaving Freeform currently happens silently.
2. Add a guarded Freeform-exit flow that intercepts a Text/Tile switch when reconciliation-relevant state exists, presents explicit stay-locked vs rejoin choices, and only completes the lens change after posting the canonical reconciliation action from T01.
3. Add stable shell/canvas observability for the pending target lens, selected reconciliation policy, and the last transition summary so browser tests and future agents can inspect what happened without reading developer logs.
4. Update browser tests to prove the explicit choice flow, visible summary language, and successful lens completion for both normal and rejected/no-write reconciliation cases.

## Must-Haves

- [ ] Freeform no longer silently exits to Text/Tile when a reconciliation-relevant choice is required.
- [ ] The browser surfaces a lightweight, product-language summary that explains what policy was applied and what remained fixed or risky.
- [ ] The UI wiring reuses the canonical bridge action from T01 instead of inventing a browser-only shortcut or hidden state.

## Verification

- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run tests/web/editor-mode-reconciliation.test.ts`

## Observability Impact

- Signals added/changed: pending target lens, chosen reconciliation policy, last reconciliation summary, and any rejected transition state.
- How a future agent inspects this: use stable testids/selectors in `App`/`Canvas` and the web tests for the explicit exit flow.
- Failure state exposed: silent lens flips, missing summary copy, or rejected reconciliation that never returns feedback become directly inspectable in-browser.

## Inputs

- `web/src/App.tsx` — shell lens controls, status surfaces, and consultant panel wiring.
- `web/src/editor/engine.ts` — browser-local lens and interaction state that should remain non-canonical.
- `web/src/editor/Canvas.tsx` — existing Freeform HUD state and S05 observability surfaces.
- `web/src/bridge-client.ts` — new reconciliation call/result from T01.
- `tests/web/editor-first-run-guidance.test.ts` and `tests/web/editor-freeform-mode.test.ts` — current shell/freeform expectations to preserve.

## Expected Output

- `web/src/App.tsx`, `web/src/editor/engine.ts`, and `web/src/editor/Canvas.tsx` — an explicit Freeform exit flow plus transition summary UI using the canonical reconciliation action.
- `tests/web/editor-mode-reconciliation.test.ts` — focused browser coverage for explicit policy choice, rejected/no-write behavior, and visible summary output.
- Updated `tests/web/editor-first-run-guidance.test.ts` and/or `tests/web/editor-freeform-mode.test.ts` — regression protection for lens availability and Freeform HUD behavior after the new exit flow lands.
