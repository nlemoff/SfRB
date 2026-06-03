# S03: Local Web Bridge — UAT

**Milestone:** M001
**Written:** 2026-03-14

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: S03 is primarily an integration slice, so the important proof is live runtime behavior through the real `sfrb open` command, with a small browser check to confirm the shell renders the canonical payload and invalid-state diagnostics.

## Preconditions

- Node 20+ is installed.
- Project dependencies are installed.
- `npm run build` has completed successfully.
- A test workspace exists with both:
  - `sfrb.config.json`
  - `resume.sfrb.json`
- The workspace document is valid for the configured physics mode.
- A browser is available locally if testing the visible shell manually.

Example valid workspace seed:
- `sfrb.config.json` uses `workspace.physics: "document"`
- `resume.sfrb.json` contains one page, one section, and one paragraph block

## Smoke Test

1. Run `node dist/cli.js open --cwd <valid-workspace> --port 4312 --no-open`.
2. Open `http://127.0.0.1:4312/` in a browser.
3. **Expected:** The page shows the bridge shell, a ready bridge status, the configured physics mode, and the current document title from `resume.sfrb.json`.

## Test Cases

### 1. CLI startup exposes the real bridge endpoint

1. From the repo root, run `node dist/cli.js open --cwd <valid-workspace> --port 0 --no-open`.
2. Wait for startup output.
3. **Expected:** Stdout includes all of the following:
   - `SfRB bridge ready at http://...`
   - `Workspace root: <valid-workspace>`
   - the bootstrap endpoint path
   - `Bridge events: sfrb:bridge-update, sfrb:bridge-error`

### 2. Browser shell renders canonical workspace state

1. Start the bridge against a valid workspace.
2. Visit the served URL in a browser.
3. Confirm the UI shows:
   - a visible bridge status card
   - the workspace root
   - the physics mode from `sfrb.config.json`
   - the document title from `resume.sfrb.json`
   - the semantic block text from `resume.sfrb.json`
4. Click the bootstrap endpoint link or fetch `/__sfrb/bootstrap` directly.
5. **Expected:**
   - The page content matches the canonical payload.
   - `/__sfrb/bootstrap` returns HTTP 200 with `status: "ready"`.
   - The payload’s `workspaceRoot`, `configPath`, `documentPath`, `physics`, and document metadata match the actual workspace files.

### 3. On-disk workspace changes reach the browser without restarting `sfrb open`

1. Start the bridge against a valid workspace where physics is initially `document`.
2. Open the browser shell and note the current title and physics mode.
3. Edit `sfrb.config.json` to switch physics to `design`.
4. Edit `resume.sfrb.json` to change the document title and block text, keeping the document valid for design mode.
5. Wait for the bridge to process the file changes.
6. **Expected:**
   - The running bridge process stays up.
   - The browser updates without restarting `sfrb open`.
   - `#bridge-last-signal` reflects a `sfrb:bridge-update` event.
   - The UI now shows the updated title, updated text, and `design` physics mode.
   - `/__sfrb/bootstrap` still returns HTTP 200 with `status: "ready"` and the updated canonical payload.

### 4. Invalid document state is surfaced explicitly instead of leaving stale content

1. Start the bridge against a valid workspace and load the browser shell.
2. Corrupt `resume.sfrb.json` so it is invalid JSON, or make it fail validation for the configured physics mode.
3. Wait for the bridge to process the change.
4. **Expected:**
   - The browser switches to the invalid-state panel.
   - The panel shows the error name and message.
   - The panel shows the affected document path and config path.
   - `#bridge-last-signal` reflects `sfrb:bridge-error`.
   - `/__sfrb/bootstrap` returns HTTP 409 with `status: "error"` and the same path-aware diagnostic payload.

### 5. Startup failure is path-aware and secret-safe for an invalid workspace

1. Create an empty temp directory with no `sfrb.config.json`.
2. Run `node dist/cli.js open --cwd <empty-dir> --port 0 --no-open`.
3. **Expected:**
   - The command exits non-zero.
   - Output names the workspace root, document path, and missing config path.
   - Output includes a cause such as `MissingWorkspaceConfigError`.
   - Output does **not** print secret values or environment-variable contents.

## Edge Cases

### Physics mode flip requires canonical revalidation

1. Start with a valid `document`-mode workspace.
2. Change `sfrb.config.json` to `design` without adding required layout frames.
3. **Expected:** The bridge emits an error transition and the browser shows the invalid-state panel rather than continuing to display stale ready content.

### Multiple watched files change in one update burst

1. With the bridge running, save `sfrb.config.json` and `resume.sfrb.json` in quick succession.
2. **Expected:** The bridge remains stable, the browser reaches the final canonical state, and the bridge signal metadata includes the changed paths that triggered the refetch.

## Failure Signals

- `sfrb open` hangs without printing a ready URL or actionable failure.
- `/__sfrb/bootstrap` is missing, returns HTML, or disagrees with the browser shell.
- Browser content does not update after editing workspace files.
- The browser stays on stale ready content after the workspace becomes invalid.
- Error diagnostics omit the document/config path context.
- Startup or invalid-state output leaks secret values.

## Requirements Proved By This UAT

- R003 — `sfrb open` launches the local bridge, serves a browser-facing shell, and propagates live workspace updates through the real runtime path.
- R001 (partial) — the browser consumes the same canonical validated document model the CLI reads, rather than a second ad hoc client-side shape.

## Not Proven By This UAT

- Direct browser editing and write-back into `resume.sfrb.json`.
- Canvas movement, text editing feel, or design/doc physics enforcement during editing.
- AI overflow detection, ghost previews, or autonomous layout repair.

## Notes for Tester

- A `409` response from `/__sfrb/bootstrap` during invalid-state scenarios is expected behavior for this slice.
- The browser shell is intentionally diagnostic-first in S03; visual polish is secondary to proving canonical state sync and failure visibility.
- If you want the fastest reproducible automation proof before doing manual checks, run:
  - `npm test -- --run tests/cli/open-command.test.ts`
  - `npm test -- --run tests/bridge/bridge-live-sync.test.ts`
  - `node scripts/verify-s03-open-smoke.mjs`
