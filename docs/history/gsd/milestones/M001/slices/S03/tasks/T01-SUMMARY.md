---
id: T01
parent: S03
milestone: M001
provides:
  - A real `sfrb open` CLI path that launches a separate ESM Vite bridge, serves canonical bootstrap payloads from the validated workspace document, and reports deterministic ready/error signals for automation.
key_files:
  - src/commands/open.ts
  - src/bridge/server.mjs
  - tests/cli/open-command.test.ts
  - package.json
  - .gsd/milestones/M001/slices/S03/S03-PLAN.md
key_decisions:
  - Keep the CLI/bridge boundary as CJS parent -> ESM child, with IPC for startup readiness/failure and Vite custom events for browser-facing updates.
patterns_established:
  - Bridge runtimes that need ESM-only dependencies can ship as copied `.mjs` artifacts beside the CJS build and be launched by the CLI with an explicit process boundary.
  - Workspace-facing browser payloads should come from `readWorkspaceDocument()` and expose one `/__sfrb/bootstrap` contract rather than ad hoc JSON reads.
observability_surfaces:
  - `sfrb open` stdout/stderr for `SfRB bridge ready at ...`, workspace root, bootstrap path, and path-aware startup failures
  - `/__sfrb/bootstrap` returning `ready` vs `error` bridge state
  - Vite custom events `sfrb:bridge-update` and `sfrb:bridge-error`
duration: 1h
verification_result: passed
completed_at: 2026-03-13 23:31 PDT
blocker_discovered: false
---

# T01: Wire `sfrb open` to an ESM Vite bridge runtime

**Added `sfrb open` as a real CLI command that spawns a separate ESM Vite bridge process, serves validated workspace state through `/__sfrb/bootstrap`, and emits explicit ready/error diagnostics for both startup and watched-file changes.**

## What Happened

I first patched the slice plan’s verification section to include an inspectable failure-path check, per the pre-flight requirement. From there I added `src/commands/open.ts` and registered it in `src/cli.ts` so the shipped CLI now exposes `sfrb open --cwd --port --no-open`.

The command does not import Vite into the CommonJS bundle. Instead, it resolves `src/bridge/server.mjs` / `dist/bridge/server.mjs`, spawns it as a child process, and waits for IPC messages. On success it prints the resolved local URL, workspace root, bootstrap endpoint, and custom event names. On failure it prints a path-aware diagnostic that localizes the problem to the workspace/config/document boundary.

In `src/bridge/server.mjs` I started Vite in `appType: 'custom'` mode, exposed `/__sfrb/bootstrap`, served a minimal HTML placeholder at `/`, and built the payload from `readWorkspaceDocument()` plus validated config metadata. The bridge keeps an in-memory `ready`/`error` state, watches `resume.sfrb.json` and `sfrb.config.json`, and pushes either `sfrb:bridge-update` or `sfrb:bridge-error` over Vite’s existing dev transport.

Because the runtime entrypoint is `.mjs`, I added `scripts/copy-bridge-runtime.mjs` and updated `npm run build` so the ESM bridge is copied into `dist/bridge/server.mjs` alongside the compiled CJS CLI.

I also added `tests/cli/open-command.test.ts`, which builds the CLI, checks that `open` is discoverable from `--help`, starts the real dist CLI against a temp workspace, fetches `/__sfrb/bootstrap`, and asserts the invalid-workspace failure output is actionable and secret-safe.

## Verification

Passed:
- `npm run build`
- `npm test -- --run tests/cli/open-command.test.ts`
- Manual observability spot-check: `node dist/cli.js open --cwd <temp-invalid-workspace> --port 0 --no-open` printed a path-aware `MissingWorkspaceConfigError` naming the workspace root, document path, and config path without leaking secrets.
- Live browser verification against the built bridge at `http://127.0.0.1:4178/` with explicit assertions for URL, bridge heading, bootstrap link text, rendered document title, and zero console errors.

Slice-level checks run now:
- `npm test -- --run tests/bridge/bridge-live-sync.test.ts` — failed as expected because `tests/bridge/bridge-live-sync.test.ts` does not exist yet; this is T02 scope.
- `node scripts/verify-s03-open-smoke.mjs` — failed as expected because the smoke script does not exist yet; this is T02 scope.

## Diagnostics

Future agents can inspect this work by:
- running `node dist/cli.js open --cwd <workspace> --no-open` and reading stdout/stderr for the ready/error handshake
- fetching `http://127.0.0.1:<port>/__sfrb/bootstrap` to see the canonical `ready` or `error` bridge payload
- subscribing to the Vite custom events `sfrb:bridge-update` and `sfrb:bridge-error` during live workspace-file changes

## Deviations

- The bridge currently serves a minimal HTML placeholder at `/` instead of the final editor shell. This keeps T01’s runtime path real without front-running T02’s browser-shell implementation.

## Known Issues

- Slice verification is only partially green because `tests/bridge/bridge-live-sync.test.ts` and `scripts/verify-s03-open-smoke.mjs` are still pending in T02.

## Files Created/Modified

- `src/commands/open.ts` — added the CLI command, child-process bridge launcher, IPC readiness/error handling, and stable startup output.
- `src/bridge/server.mjs` — added the ESM Vite bridge runtime, bootstrap endpoint, watched-file reload path, and custom bridge events.
- `tests/cli/open-command.test.ts` — added dist-level CLI coverage for discoverability, startup readiness, bootstrap payloads, and invalid-workspace diagnostics.
- `src/cli.ts` — registered `createOpenCommand()` with the main Commander program.
- `package.json` — added `vite` as a runtime dependency and copied the bridge runtime during builds.
- `scripts/copy-bridge-runtime.mjs` — copies the ESM bridge entrypoint into `dist/bridge/` after TypeScript compilation.
- `.gsd/milestones/M001/slices/S03/S03-PLAN.md` — added the required failure-path verification step and marked T01 done.
- `.gsd/DECISIONS.md` — recorded the IPC + Vite-event bridge contract decision for downstream slices.
- `.gsd/STATE.md` — advanced the slice state to T02.
