# S03: Presentation Depth & Final Export Assembly

**Goal:** Finish M003 by making the shared print/export experience feel product-grade without changing the shipped S01/S02 transport contract, then prove end-to-end trust from real browser editing through shared print preview to CLI PDF export on the same canonical workspace.
**Demo:** From the real built runtime, a contributor can edit resume content in the browser, watch the shared export affordance stay aligned with the existing ready / risk / blocked markers, open the shared `/print` preview and see the edited canonical text there, then run `dist/cli.js export` against that same workspace and get a non-empty PDF. The preview and artifact surfaces feel calmer and more deliberate than the S02 baseline, while overflow/blocked states remain explicit instead of being polished away.

S03 directly advances active requirement **R013** and materially supports active requirement **R011**. The plan stays intentionally narrow because S01/S02 already solved architecture: there is one canonical print renderer, one shared readiness contract, and one browser-side probe model. The remaining work is therefore ordered by user trust rather than code locality: first refine the shared presentation and editor-shell messaging without breaking markers, then add the assembled browser-edit → shared-preview → CLI-export proof on the real runtime, and only then freeze the milestone with truthful handoff docs.

## Must-Haves

- The shared printable renderer and browser export shell feel calmer, more product-grade, and less diagnostics-forward while preserving the existing `#root` export markers and `data-testid` hooks that S01/S02 automation already depends on.
- Browser export still mirrors the shared artifact-route `ready` / `risk` / `blocked` state via the existing probe path rather than recomputing export readiness in `App.tsx`.
- Verification proves the assembled acceptance path: a real browser edit persists to canonical state, the shared `/print` surface reflects that edit, and CLI export from the same workspace still generates a non-empty PDF only after the shared surface reports `ready`.
- A new built-runtime smoke verifier covers the assembled S03 flow without repurposing the older `verify-s03-open-smoke.mjs` filename.
- Contributor-facing milestone docs are updated only after code/test proof lands, leaving a final S03/milestone handoff that is PR-ready for `DEV`.

## Proof Level

- This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts tests/web/export-assembly.test.ts tests/cli/export-command.test.ts`
- `npm run build`
- `node scripts/verify-s02-export-flows.mjs`
- `node scripts/verify-m003-s03-export-assembly.mjs`
- Browser/UAT check: from the real `dist/cli.js open` flow, edit resume text, trigger browser export, and confirm the popup `/print` preview reflects the saved edit, keeps editor chrome absent, and only shows a trustworthy export cue when the mirrored artifact markers report `ready`.
- Failure-path check: drive a known overflow or blocked workspace through the same browser export affordance and confirm the calmer UI still exposes explicit warning/failure state rather than implying safe export.

## Observability / Diagnostics

- Runtime signals: shared `#root[data-export-state][data-overflow-status][data-blocked-reason][data-risk-count][data-max-overflow-px]` markers, mirrored browser export panel attributes/copy in `App.tsx`, popup `/print` text assertions, CLI export exit status, and generated PDF existence/size.
- Inspection surfaces: `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `web/src/App.tsx`, `tests/web/export-assembly.test.ts`, `tests/web/browser-export-flow.test.ts`, `tests/cli/export-command.test.ts`, and `scripts/verify-m003-s03-export-assembly.mjs`.
- Failure visibility: renderer polish regressions show up as lost markers/test IDs or chrome leakage, browser drift shows up through mirrored export-state assertions, and cross-surface trust breaks show up when popup text and CLI export disagree for the same workspace.
- Redaction constraints: diagnostics may include workspace-relative paths, export-state reasons, and artifact destinations, but must not log secret values or unrelated local machine state.

## Integration Closure

- Upstream surfaces consumed: S01/S02 shared print renderer and route contract (`web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `web/src/bridge-client.ts`, `web/src/App.tsx`, `src/commands/export.ts`), existing browser/bridge helpers in `tests/utils/bridge-browser.ts`, and the shipped built-runtime export smoke from `scripts/verify-s02-export-flows.mjs`.
- New wiring introduced in this slice: presentation-polish updates on the shared preview/artifact surfaces, calmer browser export messaging that still mirrors existing probe markers, one assembled browser-edit → popup-preview → CLI-export integration test, one explicit M003/S03 built-runtime smoke verifier, and final roadmap/build-plan/summary handoff docs.
- What remains before the milestone is truly usable end-to-end: nothing inside M003 beyond landing the completed slice through the final PR into `DEV`.

## Tasks

- [x] **T01: Polish the shared print surface and browser export affordance without breaking markers** `est:4h`
  - Why: S03 must materially advance R011 and the human-facing side of R013, but it cannot do that by hiding or replacing the S01/S02 diagnostics contract that browser and CLI export already trust.
  - Files: `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `web/src/App.tsx`, `web/src/bridge-client.ts`, `tests/web/printable-presentation-surface.test.ts`, `tests/web/browser-export-flow.test.ts`
  - Do: Refine preview-mode layout, typography, framing, diagnostics presentation, and browser export panel copy/visual weight so the experience feels calmer and more deliberate while preserving all existing root markers, `data-testid` hooks, and the hidden iframe probe model from S02. Keep artifact mode chrome-free, keep preview-only polish conditional to preview mode, and extend the existing web tests so they prove the polished surfaces still expose the same ready / risk / blocked semantics. Relevant skills to load before implementation: `frontend-design`, `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts`
  - Done when: the shared preview/export UI is visibly calmer, artifact mode still excludes preview chrome, and web tests prove the same export markers and browser probe semantics remain intact.
- [x] **T02: Add assembled browser-edit to shared-preview to CLI-export proof** `est:4h`
  - Why: S03 is the milestone’s final trust slice, so it needs one high-value proof that a real browser edit survives canonical save, appears on the shared print surface, and still exports through the shipped CLI artifact path from the same workspace.
  - Files: `tests/web/export-assembly.test.ts`, `tests/utils/bridge-browser.ts`, `tests/cli/export-command.test.ts`, `scripts/verify-m003-s03-export-assembly.mjs`
  - Do: Reuse the existing bridge/browser helpers and editing interaction patterns to add a real-runtime test that edits canonical text in the browser, waits for persistence/reconciliation, opens browser export, asserts the popup `/print` surface contains the edited text, then runs `dist/cli.js export` against the same workspace and asserts a non-empty `%PDF` artifact exists. Add any small shared helper support needed, preserve the existing S02 export policy, and create a new built-runtime smoke verifier with an explicit M003/S03 export-assembly name that resolves repo paths from `import.meta.url` rather than `process.cwd()`. Relevant skill to load before implementation: `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/export-assembly.test.ts tests/cli/export-command.test.ts && npm run build && node scripts/verify-m003-s03-export-assembly.mjs`
  - Done when: automated coverage proves browser edit → popup print preview → CLI PDF export coherence on one workspace, the new smoke script passes on the built runtime, and no new readiness algorithm or export renderer is introduced.
- [x] **T03: Publish the final S03 and milestone handoff after proof passes** `est:2h`
  - Why: M003 is supposed to end with truthful contributor-facing handoff, and that documentation only helps if it reflects the actual polished/export-assembly boundary established by T01 and T02.
  - Files: `.gsd/milestones/M003/M003-ROADMAP.md`, `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md`
  - Do: Mark S03 complete in the roadmap, refresh the open-source build plan so it describes M003 as fully assembled rather than “next,” and write a new S03 summary with PR-ready language covering presentation polish, assembled acceptance proof, remaining non-goals, and what later milestones inherit. Keep the docs concise, truthful, and aligned with the shipped code/tests rather than aspirational planning. Relevant skills to load before implementation: `frontend-design` for polish language restraint if helpful; no additional implementation skills required.
  - Verify: `read .gsd/milestones/M003/M003-ROADMAP.md`, `read OPEN_SOURCE_BUILD_PLAN.md`, and `read .gsd/milestones/M003/slices/S03/S03-SUMMARY.md` to confirm they all describe the same shipped S03 boundary after T01/T02 verification has passed.
  - Done when: contributor-facing roadmap/build-plan/slice-summary artifacts all reflect the finished M003 boundary and give a concise PR-ready handoff into `DEV` without reopening S01/S02 architecture.

## Files Likely Touched

- `web/src/presentation/render-printable-resume.ts`
- `web/src/presentation/print-surface.ts`
- `web/src/App.tsx`
- `web/src/bridge-client.ts`
- `tests/web/printable-presentation-surface.test.ts`
- `tests/web/browser-export-flow.test.ts`
- `tests/web/export-assembly.test.ts`
- `tests/utils/bridge-browser.ts`
- `tests/cli/export-command.test.ts`
- `scripts/verify-m003-s03-export-assembly.mjs`
- `.gsd/milestones/M003/M003-ROADMAP.md`
- `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md`
- `OPEN_SOURCE_BUILD_PLAN.md`
