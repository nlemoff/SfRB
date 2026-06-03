---
estimated_steps: 4
estimated_files: 5
---

# T01: Wire `sfrb open` to an ESM Vite bridge runtime

**Slice:** S03 — Local Web Bridge
**Milestone:** M001

## Description

Close the highest-risk boundary first: make the shipped CLI capable of launching a real local web bridge without tripping over the repo’s current CommonJS build. This task adds `sfrb open` as a first-class command, keeps the Vite runtime isolated behind an ESM bridge entrypoint, and exposes the current validated workspace document through one canonical bridge payload that later client code can consume.

## Steps

1. Add `src/commands/open.ts` and register it from `src/cli.ts`, with command options that keep startup reproducible in tests and smoke runs (`--cwd`, `--port`, and a browser-open suppression flag for automation).
2. Introduce an ESM bridge runtime in `src/bridge/server.mjs` that starts Vite through the JavaScript API, resolves the workspace root, and serves a bootstrap/document payload sourced from `readWorkspaceDocument()` rather than raw JSON reads.
3. Watch `resume.sfrb.json` and `sfrb.config.json`, then send custom update/error events over Vite’s existing dev transport so later client code can react to file changes without a second WebSocket server.
4. Add `tests/cli/open-command.test.ts` to prove startup against a temp workspace, assert actionable invalid-workspace failures, and verify the command surfaces the resolved local URL or equivalent bridge-ready signal.

## Must-Haves

- [ ] `sfrb open` is discoverable from the main CLI and can be invoked against an explicit workspace root in tests.
- [ ] Vite is launched from a separate ESM entrypoint instead of being imported directly into the CommonJS CLI bundle.
- [ ] The bridge payload reads through `readWorkspaceDocument()` so startup honors S02’s workspace physics validation.
- [ ] Startup and failure diagnostics are specific enough to localize the problem to the workspace, config, or document path quickly.

## Verification

- `npm test -- --run tests/cli/open-command.test.ts`
- `npm run build`

## Observability Impact

- Signals added/changed: bridge startup URL output, bridge-ready vs bridge-error command outcomes, and custom update/error event names for watched workspace files.
- How a future agent inspects this: run the open-command test or invoke `sfrb open --no-open` in a temp workspace and inspect stdout/stderr for the resolved URL and path-aware failure messages.
- Failure state exposed: whether startup failed because the workspace document/config was invalid, the bridge process could not start, or file watching could not initialize.

## Inputs

- `src/cli.ts` — current Commander entrypoint that must register the new command.
- `src/document/store.ts` — canonical workspace-aware document read path established by S02.
- `src/document/validation.ts` — physics-aware validation/error behavior that must flow through the bridge unchanged.
- `package.json` — current build/runtime surface that needs Vite-related dependencies and any bridge-friendly scripts.
- S03 research — confirmed Vite must remain behind an ESM boundary and that custom Vite events are enough for file-to-browser notifications.

## Expected Output

- `src/commands/open.ts` — real CLI launcher for the local web bridge.
- `src/bridge/server.mjs` — ESM bridge runtime that boots Vite, reads workspace state, and emits bridge events.
- `tests/cli/open-command.test.ts` — regression coverage for command startup, workspace-boundary failures, and bridge readiness signals.
