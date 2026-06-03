---
estimated_steps: 5
estimated_files: 7
---

# T01: Add artifact mode to the shared `/print` surface

**Slice:** S02 — Shared PDF Export Flows
**Milestone:** M003

## Description

Preserve the S01 contract, but make it usable for real artifact generation. This task should add an explicit artifact/export mode to the existing `/print` route so PDF capture uses the same canonical renderer without including preview-only header, diagnostics band, or decorative shell content. The route must remain self-describing for later automation: root-level ready/risk/blocked markers stay intact in both modes.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect `src/bridge/server.mjs`, `web/print.html`, `web/src/print-main.tsx`, `web/src/presentation/print-surface.ts`, and `web/src/presentation/render-printable-resume.ts` to identify how the current `/print` entrypoint can distinguish preview mode from artifact mode without creating a second renderer.
2. Update the bridge route and print bootstrap path so `/print` can accept an explicit mode signal (query string or equivalent), using pathname-aware matching rather than the current exact-string route logic if needed.
3. Keep `renderPrintableResume()` as the shared renderer, but make the printable shell mode-aware so artifact mode hides preview-only chrome while preserving the canonical page stack and root-level export diagnostics (`data-export-state`, `data-overflow-status`, `data-blocked-reason`, etc.).
4. Preserve the human-readable preview experience in normal mode so S01 diagnostics and preview affordances still exist for contributors inspecting `/print` directly.
5. Extend `tests/bridge/bridge-print-surface-contract.test.ts` and `tests/web/printable-presentation-surface.test.ts` to prove both preview and artifact modes load from the same canonical payload, that artifact mode excludes preview chrome, and that both modes retain the same ready/risk/blocked state contract.

## Must-Haves

- [ ] `/print` supports an explicit artifact/export mode without introducing a second renderer or export-only DTO.
- [ ] Artifact mode excludes preview-only header/diagnostics shell content from the PDF-target surface.
- [ ] Root-level readiness, risk, and blocked markers remain inspectable in both preview and artifact modes.
- [ ] Bridge and web tests prove the route contract instead of relying on screenshots or manual inference.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
- Manual spot check: load both `/print` and the artifact-mode variant in the browser and confirm the preview shell is absent only from the artifact path while `#root` still reports the same export markers.

## Observability Impact

- Signals added/changed: print-surface mode marker plus any route-visible indicator needed to distinguish preview vs artifact rendering while keeping S01 export markers stable.
- How a future agent inspects this: load the two `/print` modes directly and inspect the DOM contract in the existing bridge/web tests.
- Failure state exposed: preview chrome leakage, missing export markers, and route-mode mismatch become directly testable on the shared print surface.

## Inputs

- `src/bridge/server.mjs` — current exact-match `/print` route handling.
- `web/print.html`, `web/src/print-main.tsx` — dedicated print entrypoint and bootstrap seam for mode selection.
- `web/src/presentation/print-surface.ts`, `web/src/presentation/render-printable-resume.ts` — shipped S01 print surface and renderer that must remain the single source of truth.
- `tests/bridge/bridge-print-surface-contract.test.ts`, `tests/web/printable-presentation-surface.test.ts` — existing S01 contract tests to extend.
- S01 summary + S02 research — artifact mode must consume the S01 renderer/markers rather than replace them.

## Expected Output

- `src/bridge/server.mjs`, `web/print.html`, `web/src/print-main.tsx`, `web/src/presentation/print-surface.ts`, and `web/src/presentation/render-printable-resume.ts` — shared `/print` surface with preview/artifact mode support.
- `tests/bridge/bridge-print-surface-contract.test.ts` and `tests/web/printable-presentation-surface.test.ts` — executable proof that artifact mode hides preview chrome while preserving canonical export diagnostics.
