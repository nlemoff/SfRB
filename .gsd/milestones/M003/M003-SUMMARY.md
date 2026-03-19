---
id: M003
provides:
  - One shipped one-page export trust path shared across browser preview, browser export affordance, and CLI PDF generation from the canonical workspace model.
  - A bridge-served `/print` preview plus `/print?mode=artifact` chrome-free artifact surface with deterministic ready/risk/blocked diagnostics.
  - Milestone-final proof and contributor handoff for export trust, presentation polish, and follow-on lanes.
key_decisions:
  - D033 — serve export from a dedicated `/print` route backed by the shared canonical bootstrap payload instead of an export-only DTO.
  - D034 — publish root and per-page/frame export-readiness and overflow markers as the shared automation contract.
  - D035 — treat `risk` and `blocked` as explicit export failures for CLI generation and mirrored warning/failure states in the browser shell.
  - D036 — mirror browser export readiness by probing the shared artifact route rather than reimplementing export-state logic in the editor shell.
patterns_established:
  - Shared printable renderer contract for `/print` and `/print?mode=artifact`.
  - Browser and CLI export flows both wait on the same `#root[data-export-state][data-overflow-status][data-blocked-reason][data-risk-count][data-max-overflow-px]` markers.
  - Presentation polish stays preview-only while artifact mode remains chrome-free and marker-compatible.
observability_surfaces:
  - `#root` export/readiness markers, preview diagnostics band on `/print`, `tests/web/printable-presentation-surface.test.ts`, `tests/web/browser-export-flow.test.ts`, `tests/web/export-assembly.test.ts`, `tests/cli/export-command.test.ts`, `scripts/verify-s02-export-flows.mjs`, and `scripts/verify-m003-s03-export-assembly.mjs`.
requirement_outcomes:
  - id: R013
    from_status: active
    to_status: validated
    proof: Shared `/print` and `/print?mode=artifact` renderer contract plus passing browser/CLI/export-assembly tests and built-runtime smoke verifiers proved that the common path exports a trustworthy PDF from canonical workspace state.
duration: 2026-03-15 → 2026-03-17
verification_result: passed
completed_at: 2026-03-17
---

# M003: Export & Presentation Depth

**Shared canonical print surfaces, explicit export trust markers, and real browser/CLI PDF proof now make the one-page resume export path trustworthy and product-grade.**

## What Happened

M003 closed the gap between “resume editor” and “real artifact generator.”

S01 established the canonical print boundary by shipping a real bridge-served `/print` route backed by the same bootstrap payload as the editor, rendering a chrome-free printable resume surface, and publishing deterministic ready/risk/blocked diagnostics for automation and downstream export work. That retired the largest trust risk: export no longer depends on printing the editor DOM or on a separate export-only representation.

S02 then turned that boundary into the shared transport layer. `/print?mode=artifact` reused the same renderer while stripping preview-only chrome, `dist/cli.js export` waited on the shared route markers before writing a PDF, and the browser shell mirrored those same markers from the artifact route before offering trustworthy export behavior. Risk and blocked states became explicit failure/warning paths instead of silent clipping.

S03 completed the milestone by improving calmness and presentation depth without changing the shipped trust contract. Preview mode gained more deliberate framing and messaging, artifact mode stayed marker-compatible and chrome-free, and the integrated acceptance path was proven end to end: a browser edit persisted to canonical workspace state, appeared on the shared print preview, and exported as a non-empty `%PDF` through `dist/cli.js export` from that same workspace.

Across the slices, the milestone delivered one coherent export architecture: browser editor, popup preview, artifact surface, and CLI PDF generation all derive from the same canonical workspace model and the same print-root diagnostics. Contributor handoff also stayed truthful: slice summaries, roadmap language, and the lane model now describe the shipped export contract rather than an aspirational plan.

## Cross-Slice Verification

All roadmap success criteria and milestone definition-of-done checks were verified and passed.

- **Exported PDF matches canonical editor state:** `tests/web/export-assembly.test.ts` proved one workspace can persist a browser edit, reflect it on the shared `/print` preview, and export a PDF via the built CLI. `scripts/verify-m003-s03-export-assembly.mjs` confirmed the same flow on the built runtime and reported a non-empty artifact with `%PDF` signature.
- **Clean one-page export path with editor chrome absent:** `tests/web/printable-presentation-surface.test.ts` verified that the print surface reports `ready` for a clear design surface while keeping editor chrome out of the DOM, and that preview/artifact mode share the same canonical payload while artifact mode strips preview chrome.
- **Explicit warning/failure instead of silent clipping:** `tests/web/printable-presentation-surface.test.ts` verified overflow-risk markers and blocked payload markers on the shared surface. `tests/cli/export-command.test.ts` verified that overflow-risk and blocked cases fail explicitly and do not leave or replace a success artifact.
- **Browser and CLI export stay coherent through one renderer contract:** `tests/web/browser-export-flow.test.ts` verified that the browser shell opens the shared print surface and only requests browser print after the artifact route reports ready, while also surfacing shared warning and blocked states. `tests/cli/export-command.test.ts` verified the CLI path uses the same policy. `scripts/verify-s02-export-flows.mjs` confirmed the shipped runtime still honors regeneration and risk-denial behavior.
- **Presentation depth improved without drifting from trust contract:** `tests/web/printable-presentation-surface.test.ts` verified preview/artifact separation while preserving the root export-marker contract. `tests/web/browser-export-flow.test.ts` verified the calmer browser export panel still mirrors shared artifact-route truth rather than computing its own readiness algorithm.
- **Contributor-facing handoff remains truthful:** all three slice summaries exist (`.gsd/milestones/M003/slices/S01/S01-SUMMARY.md`, `.gsd/milestones/M003/slices/S02/S02-SUMMARY.md`, `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md`), and the milestone roadmap handoff now describes M003 as complete with concrete shipped invariants and follow-on lanes.
- **Definition of done:** all slices are complete, the browser and CLI entrypoints are exercised through the real built runtime (`npm run build`, `node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-s02-export-flows.mjs`, `node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-m003-s03-export-assembly.mjs`), and no success criterion remained unmet.

## Requirement Changes

- R013: active → validated — Proven by the shared `/print` + `/print?mode=artifact` renderer contract, passing focused Vitest coverage (`tests/web/printable-presentation-surface.test.ts`, `tests/web/browser-export-flow.test.ts`, `tests/web/export-assembly.test.ts`, `tests/cli/export-command.test.ts`), and built-runtime smoke verifiers (`scripts/verify-s02-export-flows.mjs`, `scripts/verify-m003-s03-export-assembly.mjs`).

## Forward Intelligence

### What the next milestone should know
- M003 shipped a real trust contract, not just export polish: future presentation/template work must extend the shared `/print` and `/print?mode=artifact` surfaces instead of forking a new renderer or recomputing export readiness somewhere else.
- The browser export panel is intentionally a mirror of artifact-route truth. If future work changes export readiness semantics, update the shared print-surface markers first and let browser/CLI consumers inherit the new policy.
- Preview-only polish is a useful seam: contributor-facing framing, copy, and diagnostics can evolve on `/print` while artifact mode stays chrome-free and automation-compatible.

### What's fragile
- Cross-realm DOM checks in iframe probes are easy to get wrong — using `instanceof HTMLElement` against same-origin iframe nodes will fail because the iframe has a different realm, which can leave export-state mirroring stuck at `pending`.
- Built-runtime verifiers are sensitive to repo-root vs worktree-root execution — scripts should resolve paths from `import.meta.url`, not `process.cwd()`, or they can accidentally build or verify the wrong runtime.
- The shipped export path is intentionally one-page-first — future multi-page or paper-control work must preserve explicit ready/risk/blocked semantics instead of silently broadening the capability claim.

### Authoritative diagnostics
- `#root[data-export-state][data-overflow-status][data-blocked-reason][data-risk-count][data-max-overflow-px]` on `/print` and `/print?mode=artifact` — this is the single trustworthy export-state contract consumed by tests, browser export mirroring, and CLI generation.
- `tests/web/export-assembly.test.ts` and `scripts/verify-m003-s03-export-assembly.mjs` — these are the best end-to-end proofs that canonical browser edits, shared preview, and CLI artifact generation still agree.
- `tests/cli/export-command.test.ts` and `scripts/verify-s02-export-flows.mjs` — these are the fastest signals when export transport or artifact-regeneration policy regresses.

### What assumptions changed
- Original assumption: presentation polish might require changing export-state logic or artifact DOM shape — what actually happened: preview-only polish was sufficient, and the existing shared marker contract remained stable.
- Original assumption: browser export might need its own readiness algorithm — what actually happened: iframe probing of the shared artifact route provided a cleaner, lower-drift contract for browser behavior.
- Original assumption: export verification could be satisfied by route-level or DOM-only tests — what actually happened: milestone closure required built-runtime proof with real `%PDF` output and a persisted browser edit reflected through the shared preview.

## Files Created/Modified

- `web/src/presentation/render-printable-resume.ts` — refined preview-only framing and calmer presentation while preserving the artifact contract.
- `web/src/presentation/print-surface.ts` — kept preview/artifact loading and failure shells aligned with the shared root-state semantics.
- `web/src/App.tsx` — mirrored shared artifact-route readiness in the browser export panel and preserved trust-policy behavior.
- `web/src/bridge-client.ts` — stabilized shared print-surface snapshot reading for browser export mirroring.
- `src/commands/export.ts` — shipped CLI PDF generation that waits on shared export-state markers and protects existing artifacts on failure.
- `tests/web/printable-presentation-surface.test.ts` — locked down preview/artifact separation and root-marker semantics.
- `tests/web/browser-export-flow.test.ts` — verified browser export behavior mirrors the shared route.
- `tests/web/export-assembly.test.ts` — proved browser edit persistence, shared preview agreement, and CLI export on one workspace.
- `tests/cli/export-command.test.ts` — verified ready success, risk failure, blocked failure, and overwrite semantics.
- `scripts/verify-s02-export-flows.mjs` — preserved built-runtime smoke coverage for shared transport behavior.
- `scripts/verify-m003-s03-export-assembly.mjs` — added final built-runtime assembly proof for browser edit → preview → `%PDF` export.
- `.gsd/REQUIREMENTS.md` — updated R013 from active to validated with milestone proof.
- `.gsd/PROJECT.md` — updated milestone/project state to reflect M003 completion and M004 as the next active direction.
- `.gsd/STATE.md` — closed out M003 execution state and pointed the system toward post-M003 planning/handoff.
