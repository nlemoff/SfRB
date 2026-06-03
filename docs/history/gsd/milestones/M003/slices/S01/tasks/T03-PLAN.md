---
estimated_steps: 4
estimated_files: 5
---

# T03: Prove the shipped print surface and record open-source / PR handoff

**Slice:** S01 — Printable Presentation Surface
**Milestone:** M003

## Description

Close the slice at the real runtime boundary and leave clean handoff material behind. This task should prove the new print surface through built `dist/cli.js open` behavior on a real workspace, then update the roadmap/summary/public build-plan artifacts so later contributors know exactly what S01 guarantees, what S02/S03 still need to deliver, and how to summarize the slice cleanly when opening the planning PR into `DEV`.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the existing shipped-runtime verifiers and `tests/utils/bridge-browser.ts` helpers to reuse the established temp-workspace, build, open, and browser-inspection patterns.
2. Add `scripts/verify-s01-print-surface.mjs` to build the app, create representative temp workspaces, open the real bridge-served print route, and assert chrome-free canonical rendering plus readiness/overflow markers from the shipped runtime.
3. Update `.gsd/milestones/M003/M003-ROADMAP.md` and `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md` so downstream contributors can see the exact contract S01 established and what S02/S03 should consume next.
4. Refresh `OPEN_SOURCE_BUILD_PLAN.md` so open-source contributors have a concise public-facing map of the project, current milestone state, contribution lanes, and future milestones without needing the full internal GSD archive.
5. Ensure the summary language is concise enough to seed the eventual PR description into `DEV` without becoming a second planning system.

## Must-Haves

- [ ] The built-runtime verifier exercises the actual bridge-served print route on real temp workspaces.
- [ ] The verifier proves both a ready happy path and a visible risk/blocked overflow path.
- [ ] Contributor-facing roadmap artifacts clearly describe the S01 handoff to S02/S03.
- [ ] The slice leaves behind a PR-ready summary boundary rather than forcing a future contributor to reverse-engineer the planning change set.

## Verification

- `npm run build && node scripts/verify-s01-print-surface.mjs`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
- Docs spot check: read `OPEN_SOURCE_BUILD_PLAN.md` and confirm the next contribution lanes and milestone order are clear without opening M001/M002 slice plans.

## Observability Impact

- Signals added/changed: shipped-runtime print-surface smoke output and documented references to the new readiness/risk contract.
- How a future agent inspects this: run the smoke script, inspect the print route in the browser, then read the updated roadmap/summary/build-plan docs.
- Failure state exposed: regressions that only appear in built runtime, print-route startup, route-to-canonical-state wiring, or contributor handoff drift become isolated by one dedicated smoke entrypoint plus the refreshed docs.

## Inputs

- `tests/utils/bridge-browser.ts` — reusable bridge/browser helpers for shipped-runtime verification.
- Existing smoke scripts in `scripts/verify-s0*.mjs` — patterns for temp workspace creation, built-runtime checks, and failure reporting.
- Outputs from T01 and T02 — working print route plus readiness/overflow DOM contract.
- `.gsd/milestones/M003/M003-ROADMAP.md` and `OPEN_SOURCE_BUILD_PLAN.md` — roadmap artifacts that need truthful downstream handoff content.
- Decision D032 — contributor-facing planning and PR handoff should be layered on top of, not replace, the internal GSD source of truth.

## Expected Output

- `scripts/verify-s01-print-surface.mjs` — authoritative shipped-runtime proof for the printable presentation surface.
- `.gsd/milestones/M003/M003-ROADMAP.md` and `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md` — updated milestone/slice evidence for downstream work.
- `OPEN_SOURCE_BUILD_PLAN.md` — contributor-facing build roadmap aligned with the updated milestone plan.
- A concise slice summary that can be reused when opening the PR into `DEV`.
