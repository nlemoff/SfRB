---
estimated_steps: 4
estimated_files: 6
---

# T02: Expose deterministic export readiness and overflow diagnostics on the print surface

**Slice:** S01 — Printable Presentation Surface
**Milestone:** M003

## Description

Make the surface trustworthy, not just visible. This task should add explicit readiness, overflow, and block/risk diagnostics to the printable surface so future browser export UI and CLI PDF generation can wait on one inspectable contract instead of guessing from screenshots or implicit DOM timing. The contract should be simple enough that a contributor joining from the open-source build plan can use it without first learning editor internals.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the overflow measurement and page-geometry logic already present in `web/src/editor/Canvas.tsx` together with the print-surface output from T01 to identify which signals can be reused directly and which need a print-specific summary.
2. Add stable print-surface state markers for render phase, physics/render support, export readiness, and overflow/clipping risk; keep them minimal, machine-readable, and independent from editor shell UI.
3. Ensure the common one-page clear case reports ready, while a known overflow or unsupported case reports risk/blocked visibility without pretending the surface is safe to export.
4. Extend the new bridge/web test coverage so contributors can assert readiness and failure visibility from the DOM contract instead of manual visual inference.

## Must-Haves

- [ ] The print surface exposes machine-readable ready vs risk/blocked state.
- [ ] Overflow/clipping visibility is explicit and does not silently collapse into a generic success state.
- [ ] The new contract is simple for later Playwright/browser-export flows to wait on deterministically.
- [ ] The exported markers are named and structured clearly enough to be referenced in contributor docs and future PR summaries.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
- Manual spot check: load one clear workspace and one overflowing workspace on the print route and confirm the state markers differ appropriately.

## Observability Impact

- Signals added/changed: print render phase, export readiness, overflow/risk status, and any measured page-fit data intentionally exposed for debugging.
- How a future agent inspects this: query the print-surface DOM state markers or use the updated tests/smoke script once T03 lands.
- Failure state exposed: unsupported physics cases, unsettled render state, and overflow risk become diagnosable without inspecting hidden editor internals.

## Inputs

- `web/src/presentation/render-printable-resume.ts` / `web/src/presentation/print-surface.ts` — new printable route modules from T01.
- `web/src/editor/Canvas.tsx` — current overflow measurement and page geometry behavior to reuse where practical.
- `web/src/bridge-client.ts` — existing payload types that should remain the source of truth for canonical state.
- `tests/bridge/bridge-print-surface-contract.test.ts` and `tests/web/printable-presentation-surface.test.ts` — T01 tests to extend rather than replace.
- M003 planning decisions D026, D031, and D032 — export trust depends on sequencing reliable export after the editor engine, exposing a contributor-friendly shared renderer contract, and keeping PR/handoff summaries layered on top of the internal source of truth.

## Expected Output

- `web/src/presentation/render-printable-resume.ts` / `web/src/presentation/print-surface.ts` — printable DOM contract with stable readiness and risk markers.
- `tests/bridge/bridge-print-surface-contract.test.ts` and `tests/web/printable-presentation-surface.test.ts` — coverage that distinguishes ready, risky, and blocked cases.
