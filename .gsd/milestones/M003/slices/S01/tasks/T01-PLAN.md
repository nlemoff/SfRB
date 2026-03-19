---
estimated_steps: 5
estimated_files: 6
---

# T01: Introduce a shared printable renderer and bridge print route

**Slice:** S01 — Printable Presentation Surface
**Milestone:** M003

## Description

Build the canonical surface first. This task should introduce a dedicated printable renderer and a bridge-served print/export route so later browser and CLI export work targets one artifact-oriented DOM contract instead of trying to print the interactive editor surface. The implementation should also be shaped so an outside contributor can pick it up with only the files and contracts named here.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect `src/bridge/server.mjs`, `web/src/bridge-client.ts`, and the current rendering logic in `web/src/editor/Canvas.tsx` / `web/src/editor/engine.ts` to identify the minimum reusable page/frame/text composition logic and the editor-only chrome that must not cross into the print surface.
2. Create a dedicated printable rendering module (for example `web/src/presentation/render-printable-resume.ts`, or a nearby equivalent path if the existing structure suggests a better home) that consumes canonical page size, margins, semantic content, and design-frame geometry without adding editor handles, HUDs, diagnostics, or save-state UI.
3. Add a dedicated bridge route in `src/bridge/server.mjs` that serves the printable surface from saved canonical workspace state and reuses the existing bridge/bootstrap payload contract rather than inventing an export-only DTO.
4. Extend `web/src/bridge-client.ts` only as needed so the print surface can load the same canonical ready/error payload shapes as the editor runtime while remaining dependency-light and DOM-first.
5. Add `tests/bridge/bridge-print-surface-contract.test.ts` and `tests/web/printable-presentation-surface.test.ts` to prove canonical content/page geometry render on the new route and editor-only affordances do not.

## Must-Haves

- [ ] The printable surface is served from the bridge as a dedicated route and reads canonical saved workspace state.
- [ ] Printable rendering preserves page geometry and canonical content while excluding editor-only chrome.
- [ ] Tests prove the route contract and the absence of editor controls/diagnostics on the print surface.
- [ ] The task output is understandable enough that later contributors can treat the new renderer/route pair as the single source of truth for export work.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
- Manual spot check: open the print route on a temp workspace and confirm canonical content is present while drag handles, bridge payload preview, and save-state shell UI are absent.

## Observability Impact

- Signals added/changed: print-route ready/error payload usage and any initial render-state marker needed by the new surface.
- How a future agent inspects this: fetch the bridge print route, inspect its DOM markers, and run the new bridge/web tests.
- Failure state exposed: route/bootstrap mismatches, missing canonical content, and accidental chrome leakage become visible at the route contract level.

## Inputs

- `src/bridge/server.mjs` — existing custom bridge server and route wiring.
- `web/src/bridge-client.ts` — current canonical payload contract used by the browser runtime.
- `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts` — current rendering logic and the source of reusable canonical page/frame composition knowledge.
- `tests/utils/bridge-browser.ts` — established temp-workspace and bridge/browser test harness patterns.
- M003 research and decisions D026 plus D031-D032 from the planning context — print fidelity must be solved before PDF transport work, and the contract should be easy for outside contributors to extend.

## Expected Output

- `web/src/presentation/render-printable-resume.ts` and/or `web/src/presentation/print-surface.ts` — dedicated chrome-free printable rendering modules.
- `src/bridge/server.mjs` and `web/src/bridge-client.ts` — bridge route plus minimal client contract support for the print surface.
- `tests/bridge/bridge-print-surface-contract.test.ts` and `tests/web/printable-presentation-surface.test.ts` — executable proof that the print route renders canonical content without editor chrome.
