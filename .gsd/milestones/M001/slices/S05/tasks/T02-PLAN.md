---
estimated_steps: 5
estimated_files: 6
---

# T02: Detect overflow locally and render a rejectable ghost preview in design mode

**Slice:** S05 — AI Layout Consultant
**Milestone:** M001

## Description

Turn the bridge contract into a user-visible consultant workflow inside the DOM-first editor. This task should detect overflow from the actual rendered frame body in design mode, request a consultant proposal only when needed, and render a translucent preview layer plus accept/reject controls that stay separate from canonical engine overrides until the user accepts.

## Steps

1. Add design-mode overflow measurement tied to the rendered frame text region, with debounce/settling rules so active edits and layout churn do not produce noisy false positives.
2. Extend the app/editor state model with consultant status, overflow diagnostics, and stale-preview invalidation keyed to the canonical payload/frame identity.
3. Render a ghost preview overlay component that shows the proposed resized frame independently of canonical geometry, along with rationale text and explicit accept/reject controls.
4. Wire proposal requests through the typed consultant client helper and keep failure, unavailable, and preview-ready states visible through stable ids/testids.
5. On accept, compose a candidate document and persist through `/__sfrb/editor`; on reject, clear preview state only and verify no canonical write occurs.

## Must-Haves

- [ ] Overflow detection runs only for design physics and measures the content area rather than the outer frame box.
- [ ] Preview box state is separate from `frameBoxOverrides` so reject remains non-destructive.
- [ ] Accept/reject controls and consultant status are inspectable through stable browser diagnostics.

## Verification

- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- Confirm the test covers overflow detection, proposal preview visibility, reject/no-write, accept/persist, and preview invalidation after canonical changes.

## Observability Impact

- Signals added/changed: overflow status, consultant state machine, proposal frame id, preview-visible state, and consultant error message.
- How a future agent inspects this: stable UI ids/testids in the browser shell and the named browser test.
- Failure state exposed: overflow detected but no proposal, provider failure, stale preview cleared, or accept path save failure.

## Inputs

- `web/src/editor/Canvas.tsx` — existing design-mode frame rendering and text-editing surface.
- `web/src/editor/engine.ts` — existing composed working-document logic that must remain distinct from preview-only state.
- `src/agent/LayoutConsultant.ts` / `web/src/bridge-client.ts` — structured consultant request contract from T01.

## Expected Output

- `web/src/editor/Canvas.tsx` — overflow detection hooks plus preview overlay mounting.
- `web/src/ui/GhostPreview.tsx` — distinct consultant preview renderer.
- `web/src/App.tsx` and/or `web/src/editor/engine.ts` — consultant state, diagnostics, and accept/reject wiring.
- `tests/web/editor-layout-consultant.test.ts` — browser proof of the visible ghost-preview workflow.
