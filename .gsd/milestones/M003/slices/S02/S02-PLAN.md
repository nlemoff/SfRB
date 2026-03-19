# S02: Shared PDF Export Flows

**Goal:** Deliver trustworthy PDF transport on top of the shipped S01 print contract by adding a shared artifact mode for `/print`, a real `dist/cli.js export` path, and a browser export affordance that both consume the same canonical readiness/risk/blocked markers before generating or offering PDF output.
**Demo:** From the real built runtime, a contributor can export a one-page workspace to a non-empty PDF through `dist/cli.js export`, re-run the export after changing canonical content and see the artifact regenerate, and use the browser shell to launch the shared export surface without recreating resume rendering in `App.tsx`. If the print surface reports `risk` or `blocked`, the CLI fails explicitly and the browser flow surfaces the same warning/failure state instead of silently producing a trustworthy-looking PDF.

S02 is the transport slice for active requirement **R013**. S01 already retired the renderer discovery risk, so this plan stays disciplined: first make the existing `/print` route capable of artifact-only output without forking the renderer, then wire CLI export on top of that real runtime, and finally add the browser affordance plus built-runtime/docs handoff that proves both paths are aligned.

The ordering is driven by trust. If the artifact mode is wrong, both browser and CLI exports will capture preview chrome. If the CLI export path is not deterministic, the milestone still lacks a real artifact proof. If the browser affordance invents its own readiness logic, the product will drift from the canonical route contract S01 just established. The tasks therefore move from shared surface contract → transport generation → browser UX and handoff.

## Must-Haves

- The existing `/print` route supports an artifact/export mode that hides preview-only chrome while preserving the same canonical renderer and root-level export diagnostics from S01.
- A shipped `dist/cli.js export` command reuses the real bridge runtime, waits on S01 markers, writes a real PDF on the ready path, and fails explicitly for `risk` or `blocked` export states.
- The browser shell exposes an export affordance that launches the shared print/export surface and reflects the same ready/risk/blocked semantics instead of duplicating resume rendering or readiness rules.
- Verification proves happy-path artifact creation, repeat export regeneration/overwrite, and failure visibility for overflow-risk and blocked payload cases.
- Contributor-facing milestone artifacts are refreshed so S03 can build on the export transport without rediscovering S02 policy or runtime seams.

## Proof Level

- This slice proves: operational
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/cli/export-command.test.ts tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts`
- `npm run build`
- `node scripts/verify-s02-export-flows.mjs`
- Failure-path check: run the CLI export flow against a known-overflow workspace and a blocked/bootstrap-error workspace and confirm the command exits non-zero with the surfaced export state/reason instead of claiming success or leaving a fresh PDF behind.
- Browser/UAT check: from the real `dist/cli.js open` shell, use the export affordance and confirm the shared export surface presents calm preview state on `ready`, warning/failure state on `risk` / `blocked`, and never reintroduces editor chrome into the print surface.

## Observability / Diagnostics

- Runtime signals: `#root[data-export-state][data-overflow-status][data-blocked-reason]`, print-surface mode markers, CLI export phase/error output, and artifact file timestamp/size changes across repeated export.
- Inspection surfaces: `/print` route DOM, `dist/cli.js export`, browser export UI state in `App.tsx`, `scripts/verify-s02-export-flows.mjs`, and Vitest coverage for bridge/web/CLI contracts.
- Failure visibility: export wait timeout, Playwright/PDF generation failure, overflow-risk denial, blocked bootstrap payloads, and repeat-export overwrite mistakes are all surfaced through deterministic command/test assertions rather than visual guesswork.
- Redaction constraints: diagnostics may include workspace-relative paths, export destination paths, and blocked reasons from the canonical payload, but must not print secret env values or unrelated local machine state.

## Integration Closure

- Upstream surfaces consumed: S01 `/print` route and DOM contract (`src/bridge/server.mjs`, `web/src/presentation/print-surface.ts`, `web/src/presentation/render-printable-resume.ts`, `web/src/bridge-client.ts`), real bridge startup from `src/commands/open.ts`, and built-runtime helpers in `tests/utils/bridge-browser.ts`.
- New wiring introduced in this slice: artifact mode on the shared print surface, `dist/cli.js export`, browser export controls in `web/src/App.tsx`, PDF-generation helpers, real artifact smoke verification, and S02 handoff docs.
- What remains before the milestone is truly usable end-to-end: S03 presentation polish, assembled browser-edit → export acceptance against a freshly edited workspace, and final milestone/PR handoff into `DEV`.

## Tasks

- [x] **T01: Add artifact mode to the shared `/print` surface** `est:3h`
  - Why: S02 cannot generate trustworthy PDFs until the existing print route can hide preview-only header/diagnostics chrome without forking the renderer or losing S01’s root-level export markers.
  - Files: `src/bridge/server.mjs`, `web/print.html`, `web/src/print-main.tsx`, `web/src/presentation/print-surface.ts`, `web/src/presentation/render-printable-resume.ts`, `tests/bridge/bridge-print-surface-contract.test.ts`, `tests/web/printable-presentation-surface.test.ts`
  - Do: Harden the bridge route so `/print` can accept an explicit preview-vs-artifact mode, keep `renderPrintableResume()` as the single renderer, and make the printable shell hide preview-only chrome in artifact mode while preserving the S01 root diagnostics needed by automation. Extend bridge/web tests to prove preview mode still shows human-oriented diagnostics, artifact mode excludes them, and both modes keep the same canonical ready/risk/blocked contract. Relevant skill to load before implementation: `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
  - Done when: `/print` exposes a deterministic artifact-only rendering path that uses the existing canonical renderer, preserves S01 readiness/risk/blocked markers, and no longer leaks preview shell content into the intended PDF surface.
- [x] **T02: Implement real CLI PDF export on the built runtime** `est:4h`
  - Why: R013 is not materially advanced until the shipped CLI can generate a real artifact from canonical state and refuse to bless overflow-risk or blocked exports.
  - Files: `src/cli.ts`, `src/commands/export.ts`, `src/commands/open.ts`, `tests/utils/bridge-browser.ts`, `tests/cli/export-command.test.ts`, `scripts/verify-s02-export-flows.mjs`
  - Do: Add `createExportCommand()` to the CLI, reuse `runOpenCommand(..., { awaitShutdown: false })` to start the real bridge, drive Playwright Chromium to the shared artifact-mode print route, wait on the S01 root markers, and generate a PDF only for `ready`/clear output. Make `risk` and `blocked` explicit failures with surfaced reasons, and prove repeated export overwrites/regenerates the artifact after canonical workspace changes. Relevant skill to load before implementation: `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/cli/export-command.test.ts && npm run build && node scripts/verify-s02-export-flows.mjs`
  - Done when: `dist/cli.js export` produces a non-empty PDF for the happy path, exits non-zero with actionable output for `risk` / `blocked`, and the smoke verifier proves artifact regeneration from the built runtime.
- [x] **T03: Wire browser export UX and refresh S02 handoff docs** `est:3h`
  - Why: The milestone still needs the human-facing export path and a truthful contributor handoff so S03 can polish the assembled experience instead of rediscovering transport semantics.
  - Files: `web/src/App.tsx`, `web/src/bridge-client.ts`, `tests/web/browser-export-flow.test.ts`, `tests/web/printable-presentation-surface.test.ts`, `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/M003-ROADMAP.md`, `.gsd/milestones/M003/slices/S02/S02-SUMMARY.md`
  - Do: Add a browser export control using the existing manual DOM/event pattern in `App.tsx`, point it at the shared print/export surface via `BRIDGE_PRINT_PATH`, and make the UI reflect the same ready/risk/blocked policy before invoking browser print behavior. Add focused web coverage for the export affordance, then update the roadmap, build plan, and new S02 summary with PR-ready language describing the shipped artifact-mode route, CLI export contract, browser export semantics, and what S03 now owns. Relevant skills to load before implementation: `test`, `frontend-design`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/browser-export-flow.test.ts tests/web/printable-presentation-surface.test.ts`
  - Done when: the browser shell exposes a shared export action that stays aligned with the print-surface contract, test coverage proves the UI/state behavior, and contributor-facing docs make S03’s next lane obvious without reopening S02 discovery.

## Files Likely Touched

- `src/bridge/server.mjs`
- `web/print.html`
- `web/src/print-main.tsx`
- `web/src/presentation/print-surface.ts`
- `web/src/presentation/render-printable-resume.ts`
- `src/cli.ts`
- `src/commands/export.ts`
- `src/commands/open.ts`
- `web/src/App.tsx`
- `web/src/bridge-client.ts`
- `tests/utils/bridge-browser.ts`
- `tests/bridge/bridge-print-surface-contract.test.ts`
- `tests/cli/export-command.test.ts`
- `tests/web/printable-presentation-surface.test.ts`
- `tests/web/browser-export-flow.test.ts`
- `scripts/verify-s02-export-flows.mjs`
- `.gsd/milestones/M003/M003-ROADMAP.md`
- `.gsd/milestones/M003/slices/S02/S02-SUMMARY.md`
- `OPEN_SOURCE_BUILD_PLAN.md`
