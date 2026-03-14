---
estimated_steps: 4
estimated_files: 7
---

# T02: Add the browser shell and prove live file-to-browser sync

**Slice:** S03 — Local Web Bridge
**Milestone:** M001

## Description

Finish the slice at the user-visible boundary. This task adds the first minimal browser app for SfRB, keeps it bound to the canonical workspace payload coming from T01, and proves that local file changes propagate through the real bridge path instead of requiring a restart or ad hoc refresh logic.

## Steps

1. Add the minimal Vite client scaffold (`web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`) and render the current workspace document plus physics mode from the bridge bootstrap payload with no alternate client-side document model.
2. Implement `web/src/bridge-client.ts` so the app can fetch the current bridge payload, subscribe to the custom Vite update/error events from T01, and refetch state when `resume.sfrb.json` or `sfrb.config.json` changes.
3. Render an explicit invalid-state/error surface in the app so a broken workspace shows actionable diagnostics rather than silently freezing stale content.
4. Add `tests/bridge/bridge-live-sync.test.ts` and `scripts/verify-s03-open-smoke.mjs` to launch the bridge against temp workspaces, assert the initial browser-facing payload, mutate real workspace files, and prove live update plus invalid-state behavior through the built `sfrb open` path.

## Must-Haves

- [ ] The browser app renders the current document and physics mode from the bridge payload served by T01.
- [ ] Live updates are driven by custom bridge events plus refetch, not by hard reloads or a second realtime server.
- [ ] Invalid workspace state becomes visible to the browser user and test harness in a stable, inspectable form.
- [ ] Automated verification covers both initial load and at least one real file-change transition through the running bridge.

## Verification

- `npm test -- --run tests/bridge/bridge-live-sync.test.ts`
- `node scripts/verify-s03-open-smoke.mjs`

## Observability Impact

- Signals added/changed: browser-visible bridge status, last bridge error/update state, and testable update/error events after watched file changes.
- How a future agent inspects this: run the bridge live-sync test or smoke script, then inspect the browser-facing payload/error state and emitted event names instead of guessing whether the watcher fired.
- Failure state exposed: whether the client failed to load the initial payload, missed a bridge update, or received a validation error after a real workspace mutation.

## Inputs

- `src/bridge/server.mjs` — bridge runtime and custom event contract from T01.
- `src/commands/open.ts` — real CLI entrypoint that should already launch the bridge.
- `src/document/store.ts` — canonical document payload shape and validation boundary from S02.
- `package.json` — dependency surface for Vite and the client runtime.
- T01 output — the bridge bootstrap payload and custom update/error events must already exist before the client subscribes to them.

## Expected Output

- `web/src/App.tsx` — minimal browser shell showing the current workspace document and bridge/error state.
- `web/src/bridge-client.ts` — shared client-side bridge subscription/fetch logic.
- `tests/bridge/bridge-live-sync.test.ts` — integration coverage for initial payload, live file update, and invalid-state propagation.
- `scripts/verify-s03-open-smoke.mjs` — end-to-end proof against the built `sfrb open` path in a temp workspace.
