---
id: T03
parent: S01
milestone: M002
provides:
  - Guidance-first `sfrb open` shell backed by canonical starter and AI availability state, plus built/runtime proof that both shipped starters open cleanly and persist replacement edits through the real bridge loop.
key_files:
  - src/bridge/server.mjs
  - web/src/App.tsx
  - tests/web/editor-first-run-guidance.test.ts
  - scripts/verify-s01-first-run.mjs
  - tests/utils/bridge-browser.ts
key_decisions:
  - Expose starter identity and a small AI availability envelope on `/__sfrb/bootstrap`, then derive first-run guidance and consultant unavailable state from that payload instead of browser-local onboarding state.
patterns_established:
  - First-run browser assertions should inspect stable guidance/test ids plus `/__sfrb/bootstrap` starter/AI fields, then prove persistence by editing through the real canvas and re-reading bootstrap/disk state.
observability_surfaces:
  - /__sfrb/bootstrap starter + ai fields, stable first-run shell test ids, consultant state/code attributes, `tests/web/editor-first-run-guidance.test.ts`, and `scripts/verify-s01-first-run.mjs`
duration: 33m
verification_result: passed
completed_at: 2026-03-14T03:34:00-07:00
blocker_discovered: false
---

# T03: Rework the browser shell for first-run guidance and prove the shipped loop

**Reworked `sfrb open` into a guidance-first first-run shell backed by canonical starter/AI state, then proved both shipped starters still save through the real built bridge loop.**

## What Happened

The bridge payload now carries two extra pieces of canonical state for ready workspaces: `starter` from `document.metadata.starter` and `ai` as a small availability envelope derived from `sfrb.config.json` plus the bridge process environment. That let the browser stop inventing onboarding state locally.

`web/src/App.tsx` was recomposed so the top of the page is first-run guidance instead of diagnostics: starter identity, replacement guidance, AI availability, and honest text/tile/freeform lens copy are now primary. Diagnostics, paths, payload preview, and invalid-workspace details remain in a secondary section below. The consultant panel also now degrades inspectably from bootstrap state when AI is skipped or degraded instead of acting like it is merely idle.

For proof, I added a built-runtime browser test that opens both starter variants through `dist/cli.js open`, verifies the first-run guidance/test ids, checks starter/AI state on both the UI and `/__sfrb/bootstrap`, and replaces starter content through the real editor/save/refetch loop. I also added `scripts/verify-s01-first-run.mjs`, which uses the shipped `dist/cli.js init` and `dist/cli.js open` path for both template and blank starters with `--skip-ai`, confirms the ready bootstrap payload, verifies AI-skipped degradation in the shell, and proves canonical persistence after editing.

While wiring the proof, I also corrected `tests/utils/bridge-browser.ts` so helper-created starter workspaces no longer silently overwrite starter copy unless a test explicitly asks for replacement text.

## Verification

Passed:

- `npm test -- --run tests/document/starter-documents.test.ts`
- `npm test -- --run tests/cli/init-command.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `node scripts/verify-s01-first-run.mjs`

Additional direct browser verification against the shipped `dist/cli.js open` loop:

- Navigated to a real local bridge URL for an AI-skipped blank starter workspace.
- Asserted the first-run shell rendered, starter choice was visible, lens guidance was present, and the consultant surface reported the skipped/unavailable state from canonical payload data.
- Inspected browser state directly to confirm `#consultant-status[data-consultant-state="unavailable"]` and `#consultant-panel[data-consultant-code="skipped"]`.

## Diagnostics

Future inspection points:

- `/__sfrb/bootstrap` now exposes `starter` and `ai` on ready payloads.
- `#starter-kind`, `#starter-id`, `#starter-guidance`, `#workspace-ai-status`, `#workspace-ai-note`, `[data-testid="first-run-guidance"]`, and the consultant `data-consultant-state` / `data-consultant-code` attributes are stable browser surfaces.
- `tests/web/editor-first-run-guidance.test.ts` proves template + blank starters against the real built bridge.
- `scripts/verify-s01-first-run.mjs` proves the shipped `dist/cli.js init` + `dist/cli.js open` loop with AI intentionally skipped.

## Deviations

- Tightened `tests/utils/bridge-browser.ts` so it preserves canonical starter text by default instead of always replacing the blank starter’s first line with helper-local text. This was a small corrective deviation discovered while proving real starter guidance.

## Known Issues

- None.

## Files Created/Modified

- `src/bridge/server.mjs` — added canonical bootstrap starter metadata and AI availability state.
- `web/src/bridge-client.ts` — extended ready-payload typing for starter and AI surfaces.
- `web/src/App.tsx` — rebuilt the browser shell as a guidance-first first-run surface and made consultant degradation derive from canonical payload state.
- `tests/utils/bridge-browser.ts` — added AI-skipped workspace support, first-run guidance readers, and stopped overwriting starter copy by default.
- `tests/web/editor-first-run-guidance.test.ts` — added built-runtime browser proof for both starter variants plus canonical save/refetch persistence.
- `scripts/verify-s01-first-run.mjs` — added shipped-path smoke verification for `dist/cli.js init` + `dist/cli.js open` with AI skipped.
- `.gsd/DECISIONS.md` — recorded the canonical bootstrap-first guidance-state decision.
