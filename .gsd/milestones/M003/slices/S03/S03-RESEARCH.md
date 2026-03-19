# M003 / S03 — Research

**Date:** 2026-03-17

## Summary

S03 primarily serves **R013** and materially supports **R011**. The export transport problem is already solved in S01/S02: `/print` and `/print?mode=artifact` are the canonical presentation surfaces, `dist/cli.js export` already waits on shared root markers, and the browser shell already mirrors those markers through a hidden same-origin iframe probe. The slice should therefore avoid new routes, new readiness rules, or a second renderer. Its job is to make the assembled experience feel finished and then prove that finish against the real runtime.

The main implementation seam is already visible in code. `web/src/presentation/render-printable-resume.ts` owns the shared presentation surface and all of its typography, spacing, preview chrome, and root/page/frame diagnostics. `web/src/App.tsx` owns the editor-shell export affordance and currently presents a fairly diagnostics-heavy browser export panel. S03 should polish those two surfaces while preserving the existing DOM markers and test IDs that S01/S02 automation already depends on.

The strongest acceptance proof for this slice is not “another ready export test.” It is **browser edit → canonical save → shared print surface reflects the edit → CLI export still succeeds from the same workspace**. The current harness already supports every part of that flow, so S03 can focus on assembling the proof rather than inventing new infrastructure.

## Recommendation

Treat S03 as three bounded lanes built on top of the shipped S02 transport:

1. **Shared presentation polish first**
   - Refine the preview and artifact treatment inside `web/src/presentation/render-printable-resume.ts`.
   - Keep `/print` as the calm human-facing review surface and `/print?mode=artifact` as the chrome-free export surface.
   - Preserve all root diagnostics and node-level geometry/overflow markers; polish should not break `#root[data-export-state][data-overflow-status][data-blocked-reason]` or the existing `data-testid` contract.

2. **Assembled runtime acceptance second**
   - Add one integrated browser/runtime test that edits a real workspace in the shipped app, opens browser export, asserts the popup print surface contains the edited canonical text, and then proves CLI export still emits a non-empty PDF from that same workspace.
   - Reuse existing editor interaction patterns from `tests/web/editor-document-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, and `tests/web/editor-first-run-guidance.test.ts` instead of inventing a new harness.

3. **Final handoff/docs last**
   - Once polish and assembled proof are real, update the milestone roadmap, `OPEN_SOURCE_BUILD_PLAN.md`, and create the S03/milestone summary artifacts with PR-ready language.
   - Do this after code/test proof, not before, so contributor docs stay truthful.

Why this approach: it directly advances R013 while keeping the S01/S02 trust contract intact, it uses the already-shipped canonical renderer/route instead of reopening architecture, and it lets S03 spend its budget on product finish plus milestone-close acceptance.

## Implementation Landscape

### Key Files

- `web/src/presentation/render-printable-resume.ts` — Primary S03 polish seam. Owns shared preview/artifact shell styling, preview header/diagnostics band, page stack framing, block typography, and all root/page/frame export markers. Any visual refinement should happen here without removing existing diagnostics attrs/test IDs.
- `web/src/presentation/print-surface.ts` — Loading/error shell for `/print`. If S03 wants calmer loading or blocked-state presentation, this is the route-level shell to adjust while preserving `applyRootState(...)` diagnostics.
- `web/src/App.tsx` — Browser export panel lives here. Current UI is functional but diagnostics-heavy. S03 can refine copy/visual weight/layout here, but should keep `#browser-export-panel`, `#browser-export-button`, `#browser-export-probe`, and the mirrored marker attrs stable.
- `web/src/bridge-client.ts` — Defines `createBridgePrintSurfaceUrl()` and `readBridgePrintSurfaceSnapshot()`. Do not reintroduce export-state parsing in `App.tsx`; keep this helper as the single browser-side marker reader.
- `tests/web/printable-presentation-surface.test.ts` — Existing contract coverage for preview/artifact parity, chrome exclusion, ready/risk/blocked signaling, and document/design rendering. Extend here for any preview/artifact DOM changes that still preserve the transport contract.
- `tests/web/browser-export-flow.test.ts` — Existing ready/risk/blocked browser-export behavior. Extend here if S03 changes copy/headlines or wants stronger assertions around the shared print popup after polish.
- `tests/web/editor-document-mode.test.ts` / `tests/web/editor-design-mode.test.ts` / `tests/web/editor-first-run-guidance.test.ts` — Reusable interaction patterns for editing canonical text before export. These are the best templates for the assembled acceptance test.
- `tests/utils/bridge-browser.ts` — Already provides `ensureBuilt`, temp workspace creation, bridge startup, built CLI execution, PDF inspection, and editor/browser helpers. This is the main seam for any shared helper needed by an assembled S03 test.
- `tests/cli/export-command.test.ts` — Existing CLI export success/risk/blocked coverage. Likely unchanged for transport policy, but useful if S03 adds a browser-edit → CLI-export assembly test at the CLI layer.
- `scripts/verify-s02-export-flows.mjs` — Existing built-runtime export smoke. Good baseline, but it does not prove browser edit → export assembly; S03 likely needs an additional smoke script rather than stretching this one into a mixed-purpose verifier.
- `scripts/verify-s03-open-smoke.mjs` — Historical smoke name already exists and is about bridge open/live-reload behavior, not M003 export assembly. Avoid overloading this filename for M003; add a new explicitly named S03/M003 export-assembly verifier instead.
- `OPEN_SOURCE_BUILD_PLAN.md` — Contributor-facing handoff doc that currently points S03 at polish/assembly. Update after code lands.
- `.gsd/milestones/M003/M003-ROADMAP.md` — Milestone truth source. Needs final S03 boundary/handoff refresh after implementation.
- `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md` — Does not exist yet in this worktree; S03 should create it for the final slice handoff.

### Build Order

1. **Lock the polish boundary in the shared renderer**
   - Start in `web/src/presentation/render-printable-resume.ts` and optionally `web/src/presentation/print-surface.ts`.
   - Refine preview/header/diagnostics/page framing and artifact typography/layout treatment, but do not alter the underlying marker contract.
   - This is the safest first step because it improves R011-facing product finish without reopening transport.

2. **Refine the editor-shell export affordance without changing readiness logic**
   - Update `web/src/App.tsx` only after the shared presentation direction is clear.
   - Keep the hidden iframe probe + mirrored marker model from S02; only polish how the browser shell communicates `ready` / `risk` / `blocked` and how much debug detail is foregrounded.

3. **Add one assembled acceptance test**
   - Use the real browser app to edit canonical text, wait for save/bridge reconciliation, open browser export, assert the popup `/print` surface reflects the edit, then run `dist/cli.js export` against the same workspace and assert a non-empty `%PDF` artifact exists.
   - This is the slice’s highest-value proof because it closes the milestone’s cross-surface trust story.

4. **Add a built-runtime smoke verifier for the assembled flow**
   - Prefer a new script name such as `scripts/verify-m003-s03-export-assembly.mjs` (or similarly explicit), not `verify-s03-open-smoke.mjs`.
   - Resolve repo-root paths from `import.meta.url`, not `process.cwd()`.

5. **Update roadmap/handoff docs last**
   - Refresh `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/M003-ROADMAP.md`, and write `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md` only after the assembled proof passes.

### Verification Approach

Use the already-established Vitest + built-runtime pattern.

Primary contract/polish checks:
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts`

Assembled acceptance checks (new/extended):
- Add one new web/integration test, likely under `tests/web/`, that proves:
  - browser edit persists through the canonical save loop
  - browser export opens `/print`
  - popup print surface shows the edited text
  - same workspace still exports via `dist/cli.js export`
- Then run it with the existing suites:
  - `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/*.test.ts tests/cli/export-command.test.ts`

Built runtime verification:
- `npm run build`
- existing baseline: `node scripts/verify-s02-export-flows.mjs`
- new S03 smoke: `node scripts/verify-m003-s03-export-assembly.mjs` (recommended new file)

Observable success criteria for S03 verification:
- `/print` preview feels calmer/polished but still publishes the same root markers.
- `/print?mode=artifact` remains chrome-free and marker-equivalent.
- Browser shell still mirrors `ready` / `risk` / `blocked` from the shared artifact surface rather than recomputing state.
- A text edit made in the real browser runtime appears on the shared print surface and survives CLI export from the same workspace.
- PDF artifact exists, is non-empty, and is generated only after the shared surface reports `ready`.

## Constraints

- S03 should not create a second export renderer or a second readiness algorithm. S01/S02 already fixed the architecture around `/print` and `/print?mode=artifact`.
- The print/export surface is DOM-first and inline-style-driven. Polish should be implemented in the existing renderer/style constants, not via a separate CSS-print stack.
- CLI export still depends on artifact mode staying chrome-free and marker-driven. Preview-only polish must stay conditional to `mode === 'preview'`.
- Existing tests and automation depend on `#root[data-render-state][data-payload-status][data-render-support][data-export-state][data-overflow-status][data-risk-count][data-max-overflow-px][data-blocked-reason]` plus `data-testid` hooks on preview/page/frame nodes.
- The existing `scripts/verify-s03-open-smoke.mjs` filename is already occupied by older open/live-reload smoke coverage and should not be repurposed as the M003 final export verifier.

## Common Pitfalls

- **Recomputing export state in `App.tsx`** — keep using `readBridgePrintSurfaceSnapshot()` on the hidden iframe probe; S02 intentionally centralized browser-side state reading there.
- **Breaking cross-window probe reads with `instanceof HTMLElement`** — the iframe probe is a different DOM realm; use capability checks / dataset access, as already done in `web/src/bridge-client.ts`.
- **Letting preview polish leak into artifact mode** — artifact mode is the CLI PDF surface; preview-only header/diagnostics framing must stay conditional.
- **Trying to prove final acceptance by parsing PDF content** — the harness only needs PDF existence/non-empty checks. Use popup `/print` text assertions plus on-disk PDF generation to prove coherence more robustly.
- **Using `process.cwd()` in new smoke/test helpers** — this worktree already recorded that repo-root resolution must come from `import.meta.url` because Vitest/background jobs may run with a parent-repo cwd.

## Open Risks

- Presentation polish can easily drift into deleting or hiding diagnostics that automation still needs. The planner should treat marker preservation as non-negotiable.
- The current browser export popup immediately requests print on `ready`; depending on timing, UAT/browser-tool inspection of that popup can race the print dialog. Playwright/Vitest assertions remain the reliable proof surface for assembled acceptance.
- If S03 wants materially different artifact typography/layout, it must confirm that overflow measurement and risk detection still behave the same after the visual changes.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend presentation polish | `/home/nlemo/.gsd/agent/skills/frontend-design/SKILL.md` | installed |
| Testing / Vitest patterns | `/home/nlemo/.gsd/agent/skills/test/SKILL.md` | installed |
| Playwright | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | available |
| Vite | `antfu/skills@vite` | available |
