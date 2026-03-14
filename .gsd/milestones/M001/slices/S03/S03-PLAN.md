# S03: Local Web Bridge

**Goal:** Add a real `sfrb open` runtime path that launches a local Vite-backed bridge, opens a browser-facing editor shell, and keeps the browser synced to the canonical workspace document in `resume.sfrb.json`.
**Demo:** In a configured workspace, `sfrb open` starts a local server, serves a minimal browser UI showing the current validated SfRB document, and pushes file-change updates from `resume.sfrb.json` (and workspace physics changes from `sfrb.config.json`) into the browser without restarting the command.

This slice groups into two tasks because the main risk is the runtime boundary split: the shipped CLI is CommonJS, while the recommended web bridge runtime is Vite and therefore ESM-first. Task 1 closes that boundary at the real entrypoint by adding `sfrb open`, a separate bridge runtime, and diagnostics that still flow through the existing workspace/document stores. Task 2 then closes the user-visible promise by adding the minimal browser shell and proving live-sync over the real bridge path. Requirement focus: this slice directly advances **R003** and supports **R001** by ensuring the browser consumes the same canonical document model the CLI validates.

## Must-Haves

- `sfrb open` exists as a first-class CLI command and starts the local web bridge from a workspace root.
- The bridge runtime stays compatible with the current CommonJS CLI by running Vite from a separate ESM entrypoint instead of importing it directly into the existing build.
- The server reads the current workspace document through `readWorkspaceDocument()` so browser state always reflects the validated canonical SfRB model and workspace physics.
- The browser app renders the current document and physics mode from the bridge payload without inventing a second document shape.
- File changes to `resume.sfrb.json` and relevant workspace config changes are pushed to the client through the bridge transport with actionable failure state when validation breaks.
- Slice verification proves the real CLI → bridge server → browser payload/update path and preserves failure observability for invalid workspace state.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run tests/cli/open-command.test.ts`
- `npm test -- --run tests/bridge/bridge-live-sync.test.ts`
- `node scripts/verify-s03-open-smoke.mjs`
- `sfrb open --cwd <invalid-workspace> --no-open` prints a path-aware startup failure that names the missing/invalid workspace config or document file without leaking config secrets.

## Observability / Diagnostics

- Runtime signals: bridge startup output with resolved workspace root and URL, custom bridge update/error events over Vite’s dev transport, and path-aware workspace/document validation failures.
- Inspection surfaces: `sfrb open` stdout/stderr, the bridge bootstrap/document endpoint, and the named bridge integration tests/smoke script.
- Failure visibility: startup refusal for invalid workspaces, live-sync failures that surface the affected config/document path and validation message, and browser-visible invalid-state payloads instead of silent stale UI.
- Redaction constraints: diagnostics must never print API key values from `sfrb.config.json`; only file paths, physics mode, and validation details are allowed.

## Integration Closure

- Upstream surfaces consumed: `src/cli.ts`, `src/config/store.ts`, `src/document/store.ts`, `src/document/validation.ts`, the `resume.sfrb.json` file contract, and the S01/S02 workspace/config rules.
- New wiring introduced in this slice: CommonJS CLI command → separate ESM bridge runner → Vite dev server/plugin hooks → browser bootstrap payload + custom live-update events.
- What remains before the milestone is truly usable end-to-end: S04 must add direct text editing and write-back through this bridge, and S05 must layer overflow detection plus ghost-preview suggestions on top of the same runtime path.

## Tasks

- [x] **T01: Wire `sfrb open` to an ESM Vite bridge runtime** `est:2h`
  - Why: The slice is not real until the shipped CLI can launch a browser-capable local server without breaking on the repo’s current CommonJS build/runtime boundary.
  - Files: `package.json`, `src/cli.ts`, `src/commands/open.ts`, `src/bridge/server.mjs`, `tests/cli/open-command.test.ts`
  - Do: Add the `open` command to the Commander CLI, define command options that keep startup testable (`--cwd`, `--port`, `--no-open` or equivalent), and have the command launch a separate ESM bridge runner rather than importing Vite into the current CJS bundle; in that bridge runtime, start Vite programmatically, expose a bootstrap/document payload sourced from `readWorkspaceDocument()`, watch `resume.sfrb.json` plus `sfrb.config.json`, and emit custom update/error events with clean shutdown and path-aware startup failures.
  - Verify: `npm test -- --run tests/cli/open-command.test.ts`
  - Done when: a temp-workspace CLI test can start the bridge, observe the resolved local URL/payload path, and see invalid workspace input fail with actionable diagnostics instead of hanging or crashing unclearly.
- [x] **T02: Add the browser shell and prove live file-to-browser sync** `est:2h`
  - Why: R003 is only satisfied once the browser actually renders the canonical document and updates when the local workspace files change.
  - Files: `package.json`, `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/bridge-client.ts`, `tests/bridge/bridge-live-sync.test.ts`, `scripts/verify-s03-open-smoke.mjs`
  - Do: Scaffold the minimal Vite client shell, fetch/render the bridge bootstrap payload with current physics/document metadata, subscribe to custom Vite events to refetch when the workspace document or config changes, and render an explicit invalid-state/error view instead of a blank screen; add integration coverage that launches the bridge against a temp workspace, asserts the initial browser-facing payload, mutates the real workspace files, and verifies the client-visible update/error contract through the live bridge path.
  - Verify: `npm test -- --run tests/bridge/bridge-live-sync.test.ts && node scripts/verify-s03-open-smoke.mjs`
  - Done when: the minimal browser app shows the current document from a real workspace and automated verification proves that on-disk document/config changes reach the browser-facing bridge contract without restarting `sfrb open`.

## Files Likely Touched

- `package.json`
- `src/cli.ts`
- `src/commands/open.ts`
- `src/bridge/server.mjs`
- `web/index.html`
- `web/src/main.tsx`
- `web/src/App.tsx`
- `web/src/bridge-client.ts`
- `tests/cli/open-command.test.ts`
- `tests/bridge/bridge-live-sync.test.ts`
- `scripts/verify-s03-open-smoke.mjs`
