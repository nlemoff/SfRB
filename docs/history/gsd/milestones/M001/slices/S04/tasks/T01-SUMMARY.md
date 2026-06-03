---
id: T01
parent: S04
milestone: M001
provides:
  - Canonical bridge editor write contract with schema+physics validation, richer bootstrap payload, reusable browser/runtime test helpers, and explicit downstream placeholder verification surfaces for T02/T03.
key_files:
  - src/bridge/server.mjs
  - web/src/bridge-client.ts
  - web/src/App.tsx
  - tests/utils/bridge-browser.ts
  - tests/bridge/bridge-editor-contract.test.ts
  - tests/web/editor-document-mode.test.ts
  - tests/web/editor-design-mode.test.ts
  - scripts/verify-s04-editor-smoke.mjs
key_decisions:
  - Keep `/__sfrb/bootstrap` as the only canonical inspection surface and use a separate `/__sfrb/editor` mutation route for validated browser writes.
  - Mirror idle/saving/error in browser status hooks from mutation responses instead of storing a second client-side document source of truth.
patterns_established:
  - Validate browser-submitted documents with the canonical parser first, then `validateDocumentForPhysics()`, then persist with `writeDocument()` only after both pass.
  - Prove bridge behavior through the built `dist/cli.js open` path using shared HTTP/WebSocket helpers instead of mocked bridge internals.
observability_surfaces:
  - `/__sfrb/bootstrap`
  - `/__sfrb/editor` success/error JSON responses with `code`, `name`, `issues`, paths, and `canonicalBootstrapPath`
  - `#editor-save-status` / `#editor-save-error`
  - `tests/bridge/bridge-editor-contract.test.ts`
  - `tests/utils/bridge-browser.ts`
duration: 1h 25m
verification_result: passed
completed_at: 2026-03-14T00:54:29-07:00
blocker_discovered: false
---

# T01: Add the canonical editor write contract and browser test harness

**Added the validated browser write boundary, widened the bootstrap/editor payload to full layout geometry, and shipped the shared bridge/browser harness that later S04 interaction tests will build on.**

## What Happened

I widened the browser contract in `web/src/bridge-client.ts` so the ready payload now carries full page size, margins, frame geometry, z-index, and frame↔block linkage instead of the narrowed preview-only shape. I also added a dedicated `/__sfrb/editor` route in `src/bridge/server.mjs` that accepts candidate document updates, validates them with the canonical document parser plus workspace physics validation, and only writes `resume.sfrb.json` when both checks pass.

To keep S03 reconciliation intact, successful writes do not become a second canonical payload: the bridge still treats file-watch events as invalidation signals and the browser still refetches `/__sfrb/bootstrap` for authoritative post-write state. Mutation failures now return stable, path-aware diagnostics (`code`, `name`, `issues`, document/config paths, and `canonicalBootstrapPath`) without exposing secret values.

I added `createBridgeEditorStatusStore()` and mutation result types in `web/src/bridge-client.ts`, then surfaced the initial stable save-status hooks in `web/src/App.tsx` via `#editor-save-status` and `#editor-save-error` so T02/T03 can report idle/saving/error against the same bridge response contract.

For verification reuse, I created `tests/utils/bridge-browser.ts`, which builds the app, creates temp workspaces, starts the real `dist/cli.js open` bridge, connects to the Vite websocket, posts editor mutations, polls `/__sfrb/bootstrap`, and tears the runtime down cleanly. `tests/bridge/bridge-editor-contract.test.ts` uses that harness to prove valid writes persist, schema-invalid writes fail with issue paths, physics-invalid writes fail path-safely, and bootstrap remains the canonical post-write inspection surface.

Because this is the first task in the slice, I also created explicit pending verification placeholders for later slice checks: `tests/web/editor-document-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, and `scripts/verify-s04-editor-smoke.mjs`.

## Verification

Passed:
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm run build`
- Built-path observability check via a real `dist/cli.js open --cwd <temp> --port 0 --no-open` run, a physics-invalid POST to `/__sfrb/editor`, and a follow-up `/__sfrb/bootstrap` fetch. Confirmed:
  - mutation response `status: 409`
  - `code: physics_invalid`
  - `name: DocumentPhysicsValidationError`
  - issue path `layout.frames.0`
  - bootstrap remained `200` with the last good frame-free canonical document
  - no stderr noise

Expected partial slice-status failures recorded for downstream work:
- `npm test -- --run tests/web/editor-document-mode.test.ts` → fails with explicit T02 placeholder message
- `npm test -- --run tests/web/editor-design-mode.test.ts` → fails with explicit T03 placeholder message
- `node scripts/verify-s04-editor-smoke.mjs` → exits non-zero with explicit pending smoke message

## Diagnostics

Future agents can inspect the shipped contract by:
- fetching `/__sfrb/bootstrap` to inspect the canonical ready/error payload
- POSTing `{ "document": ... }` to `/__sfrb/editor` and checking `ok/status/saveState/code/name/issues/canonicalBootstrapPath`
- watching `sfrb:bridge-update` / `sfrb:bridge-error` for refetch triggers
- reading browser save-state hooks at `#editor-save-status[data-save-state]` and `#editor-save-error`
- running `tests/bridge/bridge-editor-contract.test.ts` for accepted vs rejected write behavior

## Deviations

- Added explicit placeholder files for `tests/web/editor-document-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, and `scripts/verify-s04-editor-smoke.mjs` during T01 so the slice’s later verification surfaces exist now and fail loudly until T02/T03 replace them with real proofs.

## Known Issues

- The actual DOM editor interactions are not implemented yet; T02 and T03 placeholders intentionally fail until inline editing, design-mode dragging, and the real smoke path land.

## Files Created/Modified

- `src/bridge/server.mjs` — added `/__sfrb/editor`, full error issue propagation, schema+physics validation on writes, and stable mutation response shapes.
- `web/src/bridge-client.ts` — widened the editor-ready payload types and added mutation/save-status helpers.
- `web/src/App.tsx` — exposed stable browser save-status hooks and rendered full page/frame geometry from the canonical payload.
- `tests/utils/bridge-browser.ts` — added shared built-runtime helpers for HTTP/WebSocket bridge tests.
- `tests/bridge/bridge-editor-contract.test.ts` — added valid-write, schema-invalid, physics-invalid, and bootstrap-reconciliation coverage.
- `tests/web/editor-document-mode.test.ts` — added explicit T02 placeholder coverage surface.
- `tests/web/editor-design-mode.test.ts` — added explicit T03 placeholder coverage surface.
- `scripts/verify-s04-editor-smoke.mjs` — added explicit pending smoke verification surface for later replacement.
- `.gsd/DECISIONS.md` — recorded the bridge write/reconciliation contract decision.
- `.gsd/milestones/M001/slices/S04/S04-PLAN.md` — marked T01 complete.
- `.gsd/STATE.md` — advanced slice state to T02.
