---
id: S03
parent: M001
milestone: M001
provides:
  - A real `sfrb open` runtime that launches a local Vite-backed bridge, serves the canonical workspace document through `/__sfrb/bootstrap`, and keeps the browser shell synchronized with on-disk workspace changes.
requires:
  - slice: S02
    provides: The validated SfRB document model, schema-driven parsing, and workspace physics validation consumed through `readWorkspaceDocument()`.
affects:
  - S04
key_files:
  - src/commands/open.ts
  - src/bridge/server.mjs
  - web/index.html
  - web/src/main.tsx
  - web/src/App.tsx
  - web/src/bridge-client.ts
  - tests/cli/open-command.test.ts
  - tests/bridge/bridge-live-sync.test.ts
  - scripts/verify-s03-open-smoke.mjs
  - .gsd/milestones/M001/M001-ROADMAP.md
key_decisions:
  - Keep the CLI/bridge boundary as CommonJS parent → ESM Vite child, with deterministic IPC readiness/failure messages for automation.
  - Keep `/__sfrb/bootstrap` as the authoritative browser payload and treat `sfrb:bridge-update` / `sfrb:bridge-error` as refetch triggers rather than a second state source.
  - Keep the browser shell dependency-light so it runs cleanly inside the custom Vite bridge server while still surfacing live diagnostics.
patterns_established:
  - ESM-only browser runtimes can ship beside the CommonJS CLI as separate `.mjs` artifacts launched through an explicit process boundary.
  - Browser clients should always re-read canonical workspace state from the bridge after transport events instead of mutating client-local document copies.
  - Bridge events should carry changed-path metadata so file-triggered state transitions remain inspectable in tests and the UI.
observability_surfaces:
  - `sfrb open` stdout/stderr readiness and failure output, including workspace root, URL, bootstrap endpoint, and path-aware validation errors
  - `/__sfrb/bootstrap` returning `200 ready` or `409 error` payloads from the canonical workspace boundary
  - Vite custom events `sfrb:bridge-update` and `sfrb:bridge-error` carrying `changedPaths` metadata
  - Browser-visible status surfaces: `#bridge-status`, `#bridge-last-signal`, `#physics-mode`, `#document-title`, and the invalid-state panel ids
  - Reproducible inspection via `tests/cli/open-command.test.ts`, `tests/bridge/bridge-live-sync.test.ts`, and `scripts/verify-s03-open-smoke.mjs`
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
duration: 4h
verification_result: passed
completed_at: 2026-03-14 00:33 PDT
---

# S03: Local Web Bridge

**Shipped a real `sfrb open` bridge that launches from the CLI, serves canonical workspace state to the browser, live-syncs document/config changes, and exposes explicit invalid-state diagnostics instead of stale or silent failures.**

## What Happened

S03 closed the CLI-to-browser runtime boundary for the first time.

On the CLI side, `sfrb open` now exists as a first-class command wired into the shipped CommonJS CLI. It does not import Vite directly into the CLI bundle. Instead, it launches a separate ESM bridge runtime, waits for a deterministic ready/error handshake over IPC, and prints stable startup diagnostics that include the resolved workspace root, local URL, bootstrap endpoint, and bridge event names.

On the bridge side, `src/bridge/server.mjs` starts Vite in `appType: 'custom'`, keeps `/__sfrb/bootstrap` authoritative, serves `/` through `transformIndexHtml()`, watches `resume.sfrb.json` and `sfrb.config.json`, and emits `sfrb:bridge-update` or `sfrb:bridge-error` when the canonical workspace state changes. Startup refusal and live-sync failures stay path-aware and secret-safe.

On the browser side, the minimal shell now renders directly from the bridge payload instead of inventing a second document shape. The client fetches `/__sfrb/bootstrap`, shows current workspace/document/physics information, listens for bridge events, refetches canonical state on every signal, and renders a clear invalid-state panel when the workspace becomes broken. During completion I also fixed a real browser-runtime issue in the initial shell implementation by simplifying the client to a dependency-light DOM renderer, then re-ran all slice verification and browser checks against the built bridge.

The slice is now proven through the real `dist/cli.js open` path. Automated coverage exercises command discovery, startup readiness, bootstrap payload shape, live update propagation, invalid-state propagation, and a smoke workflow that mutates real workspace files while observing both HTTP payload transitions and Vite transport events.

## Verification

Passed:
- `npm run build`
- `npm test -- --run tests/cli/open-command.test.ts`
- `npm test -- --run tests/bridge/bridge-live-sync.test.ts`
- `node scripts/verify-s03-open-smoke.mjs`
- Invalid-workspace failure-path check:
  - `node dist/cli.js open --cwd <empty-temp-dir> --port 0 --no-open`
  - Verified path-aware output naming workspace root, document path, and config path without leaking secrets
- Browser observability spot-check against a live bridge at `http://127.0.0.1:4312/`
  - Verified rendered bridge shell and canonical document content
  - Verified `#bridge-status` / `#document-title` presence
  - Verified zero console errors and zero failed requests after reload on the final build

## Deviations

The written task summary originally referenced a React-based shell, but the final shipped browser shell is a dependency-light DOM renderer. This was an intentional cleanup during completion after a real browser execution exposed module-format issues inside the custom Vite bridge runtime. The slice contract did not require React specifically, and the lighter shell keeps the bridge runtime more robust.

## Known Limitations

S03 only ships read-only live synchronization. The browser can observe canonical workspace state and invalid transitions, but it still cannot edit text, move boxes, or write changes back to `resume.sfrb.json`; that remains S04 scope.

The invalid-state path intentionally uses HTTP `409` from `/__sfrb/bootstrap` in addition to the JSON error payload. That is expected and should not be mistaken for a hidden transport failure.

## Follow-ups

- S04 should build editing/write-back on top of the existing `/__sfrb/bootstrap` + bridge-event contract rather than adding a parallel document transport.
- If the browser shell grows substantially in S04+, reevaluate whether a richer client framework is worth reintroducing under the custom bridge server, but preserve the canonical refetch pattern.

## Files Created/Modified

- `src/cli.ts` — registered the `open` command.
- `src/commands/open.ts` — added the CLI command, bridge child-process launch, IPC readiness/error handling, and stable startup output.
- `src/bridge/server.mjs` — added the ESM bridge runtime, canonical bootstrap endpoint, watched-file reload path, and browser event emission.
- `web/index.html` — added the browser-shell entry HTML.
- `web/src/main.tsx` — mounts the browser shell.
- `web/src/App.tsx` — renders ready/error bridge state, observability surfaces, canonical document details, and payload previews.
- `web/src/bridge-client.ts` — fetches canonical bridge payloads and subscribes to custom Vite events.
- `tests/cli/open-command.test.ts` — covers discoverability, ready output, bootstrap payloads, and invalid-workspace diagnostics.
- `tests/bridge/bridge-live-sync.test.ts` — covers ready → updated → invalid transitions through the built open-command path.
- `scripts/verify-s03-open-smoke.mjs` — proves live bridge behavior against a temp workspace via the built CLI.
- `package.json` — retained the Vite-backed bridge runtime and removed unused browser-framework deps during completion cleanup.
- `package-lock.json` — recorded the dependency cleanup.
- `.gsd/DECISIONS.md` — recorded the browser-shell reconciliation decision.
- `.gsd/milestones/M001/M001-ROADMAP.md` — marked S03 complete.
- `.gsd/STATE.md` — advanced the project handoff to S04.

## Forward Intelligence

### What the next slice should know
- The most stable browser contract is still `/__sfrb/bootstrap`; bridge events are best treated as cache-busters, not as the authoritative state payload.
- The browser shell already exposes stable DOM ids/test ids for bridge status, physics mode, current title, payload preview, and invalid-state diagnostics. Reuse them where possible instead of inventing new observability surfaces.
- The real bridge path has now been proven end-to-end through the built CLI, so S04 can develop against `sfrb open` rather than a fake local fixture server.

### What's fragile
- `src/bridge/server.mjs` custom Vite setup — `/` and `/__sfrb/bootstrap` must continue to coexist without SPA fallback swallowing the bootstrap route.
- Browser-client transport assumptions — S04 should preserve event-triggered refetch behavior unless it can prove a stronger synchronization model without introducing drift.

### Authoritative diagnostics
- `node dist/cli.js open --cwd <workspace> --port 0 --no-open` — fastest trustworthy proof of startup readiness/failure behavior.
- `http://127.0.0.1:<port>/__sfrb/bootstrap` — authoritative ready/error workspace payload.
- `npm test -- --run tests/bridge/bridge-live-sync.test.ts` and `node scripts/verify-s03-open-smoke.mjs` — highest-signal integration proofs for live file-to-bridge synchronization.

### What assumptions changed
- “The minimal browser shell can safely be framework-driven without extra runtime friction” — in practice, the custom Vite bridge path was more reliable with a dependency-light shell, while still satisfying the slice contract.
- “Custom bridge events might need to carry full browser state” — in practice, `changedPaths` plus a canonical bootstrap refetch was enough and kept the boundary simpler.
