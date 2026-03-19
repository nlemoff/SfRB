---
estimated_steps: 5
estimated_files: 7
---

# T03: Wire browser export UX and refresh S02 handoff docs

**Slice:** S02 — Shared PDF Export Flows
**Milestone:** M003

## Description

Finish the slice at the human-facing edge. This task should add the browser export affordance in the existing manual DOM shell, make it respect the same ready/risk/blocked policy as the CLI path, and leave behind contributor-facing docs that tell S03 exactly what transport and artifact guarantees now exist.

Relevant skills to load before implementation: `test`, `frontend-design`.

## Steps

1. Inspect `web/src/App.tsx` and `web/src/bridge-client.ts` to find the existing shell markup/listener pattern and the `BRIDGE_PRINT_PATH` helpers the browser export control should reuse.
2. Add an export control to `App.tsx` using the current string-markup + imperative-listener style; the control should launch or focus the shared print/export surface instead of recreating rendering in the editor shell.
3. Keep browser export policy aligned with the CLI/S01 contract: `ready` allows the user to proceed to browser print behavior, while `risk` and `blocked` surface explicit warning/failure UI before any “trustworthy export” cue is shown.
4. Add focused browser/web coverage (for example `tests/web/browser-export-flow.test.ts`) that proves the new control uses the shared route and reflects ready/risk/blocked states without duplicating renderer logic.
5. Update `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/M003-ROADMAP.md`, and create `.gsd/milestones/M003/slices/S02/S02-SUMMARY.md` with concise PR-ready handoff text describing the artifact-mode route, CLI export contract, browser export behavior, and the exact seam S03 should polish next.

## Must-Haves

- [ ] The browser shell exposes an export action without introducing a second resume renderer.
- [ ] Browser UI semantics match the shared ready/risk/blocked export policy.
- [ ] Web tests prove the export control targets the shared print surface and surfaces warning/failure states explicitly.
- [ ] Contributor-facing docs truthfully describe what S02 now guarantees and what S03 still owns.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/browser-export-flow.test.ts tests/web/printable-presentation-surface.test.ts`
- Browser/UAT: from the real app shell, trigger export on a ready workspace and a risk workspace and confirm the UI points to the shared print surface and communicates the different trust states clearly.

## Observability Impact

- Signals added/changed: browser export UI state tied to the shared export markers and any user-visible warning/failure copy for `risk` / `blocked`.
- How a future agent inspects this: run the new web test, inspect the App shell export control, and read the updated roadmap/build-plan/S02 summary docs.
- Failure state exposed: drift between browser UI and shared export contract becomes visible through tests and contributor-facing handoff text.

## Inputs

- `web/src/App.tsx`, `web/src/bridge-client.ts` — current browser shell and shared bridge route constants.
- `tests/web/printable-presentation-surface.test.ts` — existing print-surface assertions to keep aligned.
- `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/M003-ROADMAP.md` — contributor-facing handoff artifacts to refresh.
- T01/T02 outputs — artifact-mode `/print` contract and shipped CLI export semantics that the browser flow must mirror.

## Expected Output

- `web/src/App.tsx`, `web/src/bridge-client.ts`, and `tests/web/browser-export-flow.test.ts` — browser export affordance aligned with the shared print-surface contract.
- `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/M003-ROADMAP.md`, and `.gsd/milestones/M003/slices/S02/S02-SUMMARY.md` — truthful S02 handoff artifacts for S03 and the eventual PR into `DEV`.
