# M003 / S02 — Research

**Date:** 2026-03-17

## Summary

S02 is primarily about delivering **R013** through transport and artifact generation rather than inventing a new renderer. S01 already shipped the hard boundary: `dist/cli.js open` serves a real `/print` route, `web/src/presentation/render-printable-resume.ts` renders canonical document state into printable DOM, and `#root` exposes deterministic `data-export-state` / `data-overflow-status` markers that downstream automation can wait on. The research target for S02 is therefore narrow and concrete: add browser and CLI export flows that consume that existing route, generate real PDF artifacts on the happy path, and fail or warn explicitly when the print surface says `risk` or `blocked`.

The biggest implementation surprise is that the S01 `/print` surface is canonical and chrome-free **relative to the editor**, but it is not yet an artifact-only PDF surface. `render-printable-resume.ts` still renders a presentation header, a visible diagnostics band, outer gradient shell styling, and the page stack beneath them. If S02 calls `page.pdf()` against `/print` exactly as-is, the generated PDF will likely include that preview/diagnostics shell rather than only the resume page. S02 therefore needs a small **artifact/export mode on the same route**, not a second renderer.

The second important finding is that the CLI already has a reusable seam for this work. `src/commands/open.ts` exposes `runOpenCommand(..., { awaitShutdown: false })`, which returns both the spawned bridge child process and the resolved local URL. That means a new `export` command can reuse the real built runtime instead of hand-rolling a second server lifecycle. The transport stack can be: `runOpenCommand` → open `/print` in Playwright Chromium → wait for S01 markers → generate/deny PDF → shut down the bridge.

## Recommendation

Take a four-part approach:

1. **Add an export/artifact mode to the existing `/print` surface.**
   Keep `renderPrintableResume()` as the single renderer, but give the print page a mode that hides preview-only chrome (header, diagnostics band, outer decorative shell) when the intent is actual PDF output. Preserve the root-level diagnostics markers so automation can still wait on `ready` / `risk` / `blocked`.

2. **Implement CLI export by reusing `runOpenCommand`.**
   Add `src/commands/export.ts`, register it in `src/cli.ts`, start the normal bridge with `awaitShutdown: false`, open the shared `/print` route in Playwright Chromium, wait for `#root[data-export-state]`, and then:
   - `ready` → write the PDF
   - `risk` → fail or require an explicit override path if product wants warnings instead of hard-fail
   - `blocked` → fail with the surfaced reason

3. **Implement browser export as a thin affordance over the same route.**
   `web/src/App.tsx` is plain DOM code, not React. Add the browser export control there, using `BRIDGE_PRINT_PATH` from `web/src/bridge-client.ts`. The browser flow should open the shared print/export surface and only trigger `window.print()` or equivalent export UX once that surface has reached an allowed export state. The app should not recreate resume rendering inside `App.tsx`.

4. **Verify with real artifacts, not only DOM checks.**
   Extend the existing built-runtime pattern (`scripts/verify-s01-print-surface.mjs`, `tests/utils/bridge-browser.ts`) to prove successful PDF creation, repeated export overwrite/regeneration, and explicit failure behavior for `risk` / `blocked` workspaces.

Why this approach:
- it keeps S02 fully aligned with S01’s shipped contract
- it uses the real runtime rather than a second export server
- it keeps browser and CLI export flows on one printable surface
- it makes overflow/blocking a transport policy decision instead of re-solving rendering

## Implementation Landscape

### Key Files

- `src/cli.ts` — currently registers only `init` and `open`. S02 needs to add `createExportCommand()` here so `dist/cli.js export` becomes part of the shipped CLI.
- `src/commands/open.ts` — already contains the most important reuse seam for S02. `runOpenCommand()` accepts `awaitShutdown: false` and returns `{ child, ready }`, which is exactly what a CLI export command needs to bring up the bridge temporarily, capture the URL, and tear it down after PDF generation.
- `src/bridge/server.mjs` — serves `/print`, but the route match is currently exact (`request.url === '/print' || request.url === '/print/'`). If S02 wants query-string-based preview/export modes like `/print?mode=artifact`, this middleware must parse the pathname instead of exact-string matching. Hash-based modes would avoid this server change.
- `web/print.html` — the dedicated print entrypoint. This is the right place for print-only CSS or a small mode bootstrap if S02 needs an artifact variant of the existing print surface.
- `web/src/print-main.tsx` — tiny mount entry for the print surface. If export mode comes from URL state or root dataset, this is the natural place to read it before calling `mountPrintSurface()`.
- `web/src/presentation/print-surface.ts` — fetches the canonical bootstrap payload, subscribes to bridge updates, and delegates to `renderPrintableResume()`. This is the right seam for keeping root diagnostics intact while letting the page know whether it is in preview mode or artifact mode.
- `web/src/presentation/render-printable-resume.ts` — the shared renderer S02 must preserve. Important detail: it currently renders a header, visible diagnostics panel, and decorative shell in addition to the actual page nodes. S02 should not replace this file with a second renderer, but it likely needs mode-aware hiding of preview-only chrome during PDF generation.
- `web/src/bridge-client.ts` — already defines `BRIDGE_PRINT_PATH`, `PrintExportState`, `PrintOverflowStatus`, and `PrintExportBlockReason`. Browser and CLI export flows should consume these existing meanings rather than introduce a second status vocabulary.
- `web/src/App.tsx` — the browser shell is built with string markup + manual DOM listeners. There is currently no export button or export preview wiring anywhere in the app. S02 browser export UI will land here by extending `createShellMarkup()` and the event wiring near the existing consultant buttons.
- `tests/utils/bridge-browser.ts` — existing built-runtime helper layer. It already knows how to build once, create temp workspaces, start `dist/cli.js open`, and wait for bridge readiness. It is the best place to add shared S02 helpers such as “open print page”, “wait for export state”, or “generate artifact from the print route”. It already resolves repo root from `import.meta.url`, which matches the current knowledge-register warning.
- `tests/cli/open-command.test.ts` — best pattern for CLI command discoverability/help/output tests. S02 should mirror this style for `tests/cli/export-command.test.ts`.
- `tests/web/printable-presentation-surface.test.ts` — already proves the `ready`, `risk`, and `blocked` DOM contract on the real print surface. S02 browser-export tests should build directly on this contract rather than re-measuring layout another way.
- `tests/bridge/bridge-print-surface-contract.test.ts` — confirms `/print` is a dedicated route and remains available when bootstrap collapses into an error payload. If S02 adds preview/artifact mode signaling to the route, this test suite is the right place to harden the route-level contract.
- `scripts/verify-s01-print-surface.mjs` — the clearest template for a built-runtime S02 smoke script. It already uses `repoRoot` from `import.meta.url`, builds temp workspaces, opens `/print`, and checks the root markers. A new `scripts/verify-s02-export-flows.mjs` should copy this style rather than invent a different verification harness.
- `package.json` — Playwright is currently in `devDependencies`, not `dependencies`. That is acceptable for local development and current verification, but if `dist/cli.js export` is meant to be a real end-user command, S02 must explicitly decide whether runtime Playwright/Chromium is a shipped dependency, an optional local prerequisite, or a guarded failure with setup instructions.

### Natural Seams

1. **Artifact mode on the print surface**
   - likely touches `web/print.html`, `web/src/print-main.tsx`, `web/src/presentation/print-surface.ts`, and `web/src/presentation/render-printable-resume.ts`
   - should preserve root diagnostics while hiding preview-only shell from the final PDF

2. **CLI export transport**
   - likely adds `src/commands/export.ts` and updates `src/cli.ts`
   - should reuse `runOpenCommand()` instead of duplicating bridge startup/shutdown logic

3. **Browser export UI**
   - likely confined to `web/src/App.tsx` plus reuse of `BRIDGE_PRINT_PATH`
   - should be a thin launch/wait action over `/print`, not another renderer

4. **Verification and smoke coverage**
   - likely touches `tests/utils/bridge-browser.ts`, `tests/cli/export-command.test.ts`, one or more web tests, and a new `scripts/verify-s02-export-flows.mjs`

### Build Order

1. **Define the artifact-only behavior of the existing `/print` surface first.**
   Prove how S02 will keep S01 diagnostics/preview affordances for humans while excluding them from the actual PDF artifact. This is the riskiest gap because S01’s preview shell is intentionally visible today.

2. **Add CLI export on top of that mode.**
   This is the highest-value transport path and easiest place to prove real artifact generation deterministically. Reuse `runOpenCommand()` and the S01 markers. Do not start with a browser button before the artifact contract is stable.

3. **Add browser export affordance once the print surface and CLI transport semantics are known.**
   The browser action should be a consumer of the same route and statuses. It should not decide export readiness independently.

4. **Finish with repeat-export and failure-path verification.**
   Prove overwrite/regeneration semantics and confirm `risk` / `blocked` states do not silently emit a trustworthy-looking PDF.

### Verification Approach

- **Command/build verification**
  - `npm run build`
  - `npx vitest run tests/cli/export-command.test.ts tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`

- **Built-runtime smoke verification**
  - add `node scripts/verify-s02-export-flows.mjs`
  - use the same repo-root resolution pattern as `scripts/verify-s01-print-surface.mjs` and `tests/utils/bridge-browser.ts` (`import.meta.url`, not `process.cwd()`)

- **Happy-path artifact proof**
  - create a temp workspace
  - start the built bridge via `dist/cli.js open` or `runOpenCommand()`
  - open `/print`
  - wait until `#root[data-export-state="ready"][data-overflow-status="clear"]`
  - generate a real PDF
  - assert file exists and is non-empty
  - re-run export after changing canonical document content and assert the file is overwritten/regenerated

- **Failure-path proof**
  - overflow workspace should reach `data-export-state="risk"`
  - invalid/bootstrap-error workspace should reach `data-export-state="blocked"`
  - CLI export should fail explicitly and not silently claim success
  - browser export UI should surface the same warning/failure state before print/export

- **PDF options to prefer**
  - Playwright `page.pdf()` with `printBackground: true`
  - `preferCSSPageSize: true`
  - explicit paper sizing (`format: 'Letter'` for the current common path, or derived width/height once paper-size support broadens)

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Temporary bridge lifecycle for CLI export | `runOpenCommand()` in `src/commands/open.ts` | It already starts the real bridge, validates CLI flags, and can return the child process + resolved URL without waiting for shutdown. |
| PDF generation | Playwright Chromium `page.pdf()` | The repo already uses Playwright for shipped-runtime verification, and the API already exposes the PDF options S02 needs (`printBackground`, `preferCSSPageSize`, explicit format/path). |
| Built-runtime export verification | `tests/utils/bridge-browser.ts` and `scripts/verify-s01-print-surface.mjs` | They already encode the project’s temp-workspace, bridge-readiness, and teardown patterns. |

## Constraints

- S02 supports **R013** and must stay on the S01 printable route/renderer contract instead of creating an export-only representation.
- `web/src/App.tsx` is manual DOM code, not React. Browser export UI must follow the existing string-markup + imperative-listener pattern.
- The current `/print` route matcher in `src/bridge/server.mjs` only handles exact `/print` and `/print/` URLs. Query-string-based export modes need route hardening.
- Playwright is a `devDependency` today. A shipped CLI export command needs an explicit dependency/runtime story.
- The common proven page geometry is still Letter-sized one-page output. S02 should optimize for that path before generalizing paper controls.

## Common Pitfalls

- **Using `/print` as-is for PDF output** — the S01 surface still includes a header, visible diagnostics band, and decorative shell. S02 must keep one renderer while separating preview chrome from artifact content.
- **Waiting on navigation alone** — network idle or `page.goto()` success is not enough. Export must wait on S01’s root markers (`data-export-state`, `data-overflow-status`, `data-blocked-reason`).
- **Re-implementing bridge startup for `export`** — `runOpenCommand()` already solves this and keeps CLI/runtime behavior aligned.
- **Adding query params without fixing the bridge route** — `/print?mode=artifact` will not currently match the exact-string middleware.
- **Using `process.cwd()` in new smoke helpers** — current project knowledge says repo-root resolution must come from `import.meta.url` because Vitest/background harnesses can run with a different cwd than the target worktree.

## Open Risks

- The main product decision still left for execution is policy on `risk`: hard-block PDF generation, allow it only behind an explicit override, or permit browser warning + CLI failure. The codebase already supports detecting the state; S02 must decide the transport behavior.
- If the browser flow relies on native print dialogs, automated verification of the exact end-user save step will remain weaker than CLI artifact verification. The planner should keep browser proof focused on routing, readiness, and shared-surface behavior while CLI proves real file generation.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Testing / Vitest patterns | `/home/nlemo/.gsd/agent/skills/test/SKILL.md` | installed |
| Playwright | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | available |
| Vite bridge runtime | `antfu/skills@vite` | available |

## Sources

- Playwright PDF generation already supports `printBackground`, `preferCSSPageSize`, explicit paper sizing, and file output through `page.pdf()`, which matches S02’s CLI artifact needs. (source: Context7 `/microsoft/playwright`, query: `page.pdf options printBackground preferCSSPageSize path format tagged outline headless chromium only`)
