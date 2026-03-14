---
id: T02
parent: S03
milestone: M001
provides:
  - A real Vite browser shell that renders the canonical workspace document from `/__sfrb/bootstrap`, refetches on bridge update/error events, and exposes stable live-sync + invalid-state diagnostics for both users and tests.
key_files:
  - web/src/App.tsx
  - web/src/bridge-client.ts
  - web/src/main.tsx
  - web/index.html
  - src/bridge/server.mjs
  - tests/bridge/bridge-live-sync.test.ts
  - scripts/verify-s03-open-smoke.mjs
  - package.json
key_decisions:
  - Keep the browser shell bound to the bridge bootstrap payload instead of introducing a second client-side document shape.
  - Keep Vite in `appType: 'custom'` and serve `/` via `transformIndexHtml()` so the custom `/__sfrb/bootstrap` route stays authoritative.
  - Disable Vite dep discovery for this custom bridge server to remove shutdown-time dep-scan noise from CLI-driven integration tests.
patterns_established:
  - Browser clients consuming the local bridge should treat Vite custom events as refetch triggers and always reconcile through `/__sfrb/bootstrap`.
  - Coalesced watched-file reloads should surface `changedPaths` in custom event payloads so tests and the UI can inspect which workspace files triggered the refresh.
observability_surfaces:
  - Browser-visible bridge status, physics mode, current document/error payload, and last bridge signal in the Vite app UI
  - `/__sfrb/bootstrap` returning `200 ready` vs `409 error` bridge payloads after real file mutations
  - Vite custom events `sfrb:bridge-update` and `sfrb:bridge-error` carrying inspectable changed-path metadata
  - `tests/bridge/bridge-live-sync.test.ts` and `scripts/verify-s03-open-smoke.mjs` as reproducible live-sync inspection paths
duration: 2h
verification_result: passed
completed_at: 2026-03-14 00:24 PDT
blocker_discovered: false
---

# T02: Add the browser shell and prove live file-to-browser sync

**Added the first real SfRB browser shell, wired it to the canonical bridge payload, and proved live file-to-browser update/error propagation through the built `sfrb open` path.**

## What Happened

I replaced T01’s placeholder HTML with a real Vite-served web app under `web/`, using `web/index.html`, `web/src/main.tsx`, `web/src/bridge-client.ts`, and `web/src/App.tsx`.

The client does not invent its own document model. It fetches `/__sfrb/bootstrap`, renders the canonical document title/blocks plus physics mode straight from that payload, subscribes to `sfrb:bridge-update` and `sfrb:bridge-error`, and refetches canonical state when those events arrive.

The UI now exposes the observability promised by the task plan: a stable bridge status surface, the last bridge signal, the current workspace root/physics mode, a canonical payload preview, and an explicit invalid-state panel that shows the error name/message plus document/config paths instead of freezing stale content.

On the bridge side, I kept the runtime on the existing ESM child path from T01 but adjusted `src/bridge/server.mjs` so Vite runs in `appType: 'custom'`, `/` is served via `transformIndexHtml()`, `/__sfrb/bootstrap` stays authoritative, and custom live-update/error events now include `changedPaths` metadata for coalesced file changes. I also disabled automatic dep discovery in this custom server so CLI-driven bridge tests shut down cleanly without Vite dep-scan noise on stderr.

To prove the real path, I added `tests/bridge/bridge-live-sync.test.ts` and `scripts/verify-s03-open-smoke.mjs`. Both launch the built `dist/cli.js open` command against temp workspaces, assert initial browser-facing payload state, mutate real workspace files, observe `sfrb:bridge-update` / `sfrb:bridge-error` over the Vite websocket, and verify the resulting `/__sfrb/bootstrap` ready/error transitions.

## Verification

Passed:
- `npm run build`
- `npm test -- --run tests/bridge/bridge-live-sync.test.ts`
- `node scripts/verify-s03-open-smoke.mjs`
- `npm test -- --run tests/cli/open-command.test.ts`
- Manual slice verification: `node dist/cli.js open --cwd <invalid-workspace> --port 0 --no-open` returned a path-aware `MissingWorkspaceConfigError` naming the temp workspace’s config/document paths without leaking secrets.
- Real browser verification against `http://127.0.0.1:4181/` with explicit checks for:
  - initial rendered title/text/physics (`Browser Sync Resume`, initial block text, `document`)
  - live on-disk update with no reload (`Browser Sync Updated`, updated block text, `design`)
  - invalid-state surface after breaking `resume.sfrb.json` (`Invalid workspace state`, `DocumentParseError`, JSON parse message, document path)

Slice-level verification status after T02:
- `npm test -- --run tests/cli/open-command.test.ts` — passed
- `npm test -- --run tests/bridge/bridge-live-sync.test.ts` — passed
- `node scripts/verify-s03-open-smoke.mjs` — passed
- `sfrb open --cwd <invalid-workspace> --no-open` failure-path check — passed

## Diagnostics

Future agents can inspect this work by:
- running `node dist/cli.js open --cwd <workspace> --no-open` and visiting the served page to inspect `#bridge-status`, `#bridge-last-signal`, `#physics-mode`, `#document-title`, and the invalid-state panel ids
- fetching `http://127.0.0.1:<port>/__sfrb/bootstrap` to see `ready` vs `error` payloads directly
- subscribing to the Vite websocket and waiting for `sfrb:bridge-update` / `sfrb:bridge-error`; event payloads now include `changedPaths`
- running `npm test -- --run tests/bridge/bridge-live-sync.test.ts` or `node scripts/verify-s03-open-smoke.mjs` to reproduce the ready → updated → invalid transitions through the real CLI bridge path

## Deviations

- I kept the bridge on Vite `appType: 'custom'` and served `/` with `transformIndexHtml()` instead of switching to Vite’s SPA fallback. This was necessary because SPA fallback swallowed `/__sfrb/bootstrap`, which broke the canonical bridge route.
- I added `changedPaths` to custom bridge event payloads beyond the original T01 summary so coalesced file writes remain inspectable in the browser UI and automated tests.

## Known Issues

- In the invalid-state browser scenario, the expected `409` response from `/__sfrb/bootstrap` still appears as a network error in browser diagnostics because the bridge intentionally exposes invalid workspace state through HTTP status as well as JSON payload. This is expected behavior, not a hidden failure.

## Files Created/Modified

- `web/index.html` — added the Vite browser-shell entry HTML and inline favicon to avoid default 404 noise.
- `web/src/main.tsx` — mounted the browser app.
- `web/src/bridge-client.ts` — added canonical bootstrap fetch + Vite custom-event subscription logic.
- `web/src/App.tsx` — rendered current document/physics state, last bridge signal, payload preview, and explicit invalid-state diagnostics.
- `src/bridge/server.mjs` — switched `/` to the real Vite client shell, preserved `/__sfrb/bootstrap`, added `changedPaths` event metadata, and disabled dep discovery for deterministic test shutdown.
- `tests/bridge/bridge-live-sync.test.ts` — added built-CLI integration coverage for initial payload, live update, and invalid-state propagation.
- `scripts/verify-s03-open-smoke.mjs` — added the live-slice smoke proof against the built `sfrb open` path.
- `package.json` — added React runtime dependencies for the browser shell.
- `package-lock.json` — recorded the dependency update.
- `.gsd/milestones/M001/slices/S03/S03-PLAN.md` — marked T02 done.
- `.gsd/DECISIONS.md` — recorded the bridge HTML/bootstrap routing decision for downstream work.
- `.gsd/STATE.md` — advanced state to the next-slice handoff.
