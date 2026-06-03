---
id: T02
parent: S05
milestone: M001
provides:
  - Design-mode overflow diagnostics, a bridge-backed consultant request/apply flow, and a rejectable ghost preview layer that stays separate from canonical frame overrides until accept.
key_files:
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - web/src/ui/GhostPreview.tsx
  - tests/web/editor-layout-consultant.test.ts
key_decisions:
  - D022: keep overflow measurement in Canvas against the rendered frame body and let App own consultant request/apply state so preview geometry never enters engine frameBoxOverrides before accept.
patterns_established:
  - The browser measures selected design-frame body overflow locally, requests consultant proposals only from that measured issue payload, renders ghost geometry as a page overlay, and only writes the candidate document through `/__sfrb/editor` on explicit accept.
observability_surfaces:
  - `#consultant-panel`, `#consultant-status`, `#consultant-overflow-status`, `#consultant-preview-state`, `#consultant-rationale`, and `#consultant-error`
  - `tests/web/editor-layout-consultant.test.ts`
duration: 1h+
verification_result: partial
completed_at: 2026-03-14T04:35:00-07:00
blocker_discovered: false
---

# T02: Detect overflow locally and render a rejectable ghost preview in design mode

**Added design-mode overflow detection plus a bridge-backed ghost-preview workflow that stays preview-only until accept, with one remaining happy-path browser-test timeout after accept still needing stabilization.**

## What Happened

I extended the browser shell with a dedicated consultant panel in `web/src/App.tsx`. It now tracks consultant state (`idle` / `detecting` / `requesting` / `preview` / `applying` / `error` / `unavailable`), overflow diagnostics, active proposal frame identity, preview-visible state, rationale/error text, and explicit request/accept/reject controls with stable ids/testids.

I rewired `web/src/editor/Canvas.tsx` so design mode measures overflow from the rendered frame body rather than the outer frame box. Measurement is debounced and suppressed into a `settling` state while the selected frame is being edited or dragged, which keeps active-edit/layout churn from producing noisy false positives. Canvas also owns the ghost overlay mount point and renders preview geometry through the new `web/src/ui/GhostPreview.tsx` helper, independent from canonical frame geometry.

To preserve the non-destructive preview contract, I kept preview state out of engine `frameBoxOverrides`. Accept composes a candidate document from canonical payload + preview box and persists it through `/__sfrb/editor`; reject only clears local preview state. I exported `composeFrameResizeCandidate()` from `web/src/editor/engine.ts` so App can build the accept payload without mutating engine-local working overrides.

For test coverage, I added `tests/web/editor-layout-consultant.test.ts`. The stale-preview invalidation flow passes: request preview, mutate canonical geometry underneath it, and verify the preview clears with inspectable diagnostics. The main happy-path test covers overflow detection, preview rendering, reject/no-write, and accept/persist intent, but currently times out after accept rather than finishing cleanly.

## Verification

Passed:
- `npm run build -- --mode production`
  - TypeScript + bridge runtime build completed with the new consultant UI wiring.
- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
  - `invalidates a stale preview after canonical changes under it` passed.
  - The happy-path test reached the new overflow/request/preview flow but timed out before completing the accept path assertions.

Previously still valid from T01 and not rerun during recovery:
- `npm test -- --run tests/bridge/bridge-layout-consultant-contract.test.ts`

Not yet available in this task:
- `node scripts/verify-s05-layout-consultant.mjs` (owned by T03)
- Built-path failure browser proof from the slice plan (owned by T03)

## Diagnostics

Later agents can inspect the shipped consultant UI via:
- `#consultant-panel[data-consultant-state][data-consultant-code]`
- `#consultant-overflow-status[data-overflow-status]`
- `#consultant-measurements[data-overflow-px]`
- `#consultant-preview-state[data-preview-visible]`
- `#consultant-frame-id[data-frame-id]`
- `#consultant-rationale`
- `#consultant-error`
- Ghost overlay nodes like `[data-testid="consultant-ghost-preview-summaryFrame"]`

The passing stale-preview test in `tests/web/editor-layout-consultant.test.ts` is also the current executable proof that preview invalidation is keyed to canonical payload changes instead of engine-local overrides.

## Deviations

- I introduced a small `web/src/ui/GhostPreview.tsx` DOM helper to keep overlay rendering isolated from the main Canvas file while staying consistent with the task’s expected outputs.
- I recorded verification as partial instead of passed because the accept-path browser proof still times out.

## Known Issues

- `tests/web/editor-layout-consultant.test.ts` still has one failing test: the happy-path `detects overflow, renders a rejectable ghost preview, rejects without writing, and accepts through the canonical editor route` times out after the accept portion instead of finishing deterministically.
- Because of that timeout, slice-level verification is not yet complete for S05. T03 (or a short T02 stabilization follow-up) needs to finish the accept-path timing/debug loop before the slice can be considered fully proven end-to-end.

## Files Created/Modified

- `web/src/App.tsx` — added consultant state/diagnostics UI, request/apply/reject wiring, and stale-preview invalidation keyed to canonical payload changes.
- `web/src/editor/Canvas.tsx` — added design-mode overflow measurement, settle/debounce behavior, and ghost-preview overlay mounting.
- `web/src/editor/engine.ts` — exported `FrameBox` and `composeFrameResizeCandidate()` so accept can build a canonical candidate document without contaminating preview-only state.
- `web/src/ui/GhostPreview.tsx` — new page overlay renderer for translucent proposal geometry and rationale badges.
- `tests/web/editor-layout-consultant.test.ts` — added browser coverage for overflow diagnostics, preview visibility, reject/no-write intent, accept-path intent, and stale-preview invalidation.
