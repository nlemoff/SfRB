# S03: Presentation Depth & Final Export Assembly — Summary

## Outcome

S03 completed M003 by polishing the shared print/export experience without changing the shipped S01/S02 trust contract, then proving the full browser-edit → shared preview → CLI export path on the real built runtime.

The result is a calmer one-page export experience that still says exactly when export is trustworthy, risky, or blocked. Preview mode feels more deliberate, artifact mode stays chrome-free, and browser plus CLI export still derive from the same canonical workspace state and the same root diagnostics.

## What S03 guarantees

Contributors can now rely on these facts without replaying the slice tasks:

- `/print` remains the canonical human-facing preview/export surface and `/print?mode=artifact` remains the chrome-free artifact surface.
- Preview polish is intentionally preview-only. The calmer framing, diagnostics presentation, and copy do not change the artifact DOM contract.
- The shared root marker contract is unchanged and still drives automation plus export trust decisions through `#root[data-export-state][data-overflow-status][data-blocked-reason][data-risk-count][data-max-overflow-px]` together with the existing render/payload markers.
- Browser export in `web/src/App.tsx` still mirrors artifact-route truth from `readBridgePrintSurfaceSnapshot()` rather than computing a separate readiness algorithm.
- A real browser edit can now be proven to persist to canonical workspace state, appear on the shared `/print` popup preview, and export as a non-empty `%PDF` through `dist/cli.js export` from that same workspace.
- The built-runtime proof is shipped in two forms: focused automated coverage in `tests/web/export-assembly.test.ts` and smoke verification in `scripts/verify-m003-s03-export-assembly.mjs`.
- The underlying S02 transport proof remains part of the contract via `tests/web/browser-export-flow.test.ts`, `tests/cli/export-command.test.ts`, and `scripts/verify-s02-export-flows.mjs`.

## What M003 now guarantees overall

With S03 complete, M003 now guarantees a trustworthy one-page export path:

- canonical browser editing, shared print preview, browser export affordance, and CLI PDF export all stay tied to the same workspace model
- export trust is explicit rather than implied; `ready`, `risk`, and `blocked` remain visible and mirrored across surfaces
- the common happy path is proven on the real built runtime rather than only through isolated DOM snapshots
- contributor-facing roadmap/build-plan handoff now matches the shipped code and proof anchors

## Remaining non-goals

These are still deferred beyond M003 and should not be implied as shipped:

- true multi-page pagination or layout reflow
- deeper paper-size or custom print controls
- richer export-control surfaces beyond the current trustworthy one-page path
- broader template/presentation-system work that belongs to later milestones

## Verification anchors

Primary automated proof:
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts tests/web/export-assembly.test.ts tests/cli/export-command.test.ts`
- `npm run build`
- `node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-s02-export-flows.mjs`
- `node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-m003-s03-export-assembly.mjs`

Human/inspection anchors:
- shared print root markers on `#root`
- preview-only nodes: `[data-testid="print-surface-header"]`, `[data-testid="print-export-diagnostics"]`
- mirrored browser export panel attrs/copy on `[data-testid="browser-export-panel"]`
- popup `/print` text agreement with the edited canonical workspace content
- generated PDF artifact path, byte size, and `%PDF` signature from the smoke verifier

## Key files

- `web/src/presentation/render-printable-resume.ts` — refined preview-only framing/copy while preserving the shared marker and test-id contract.
- `web/src/presentation/print-surface.ts` — kept loading/error shells aligned with the calmer presentation without changing root-state semantics.
- `web/src/App.tsx` — shipped the calmer browser export panel while continuing to mirror artifact-route truth.
- `web/src/bridge-client.ts` — reads shared print-surface markers through attribute access for stable cross-iframe export-state mirroring.
- `tests/web/printable-presentation-surface.test.ts` — proves preview/artifact separation plus preserved root-marker semantics.
- `tests/web/browser-export-flow.test.ts` — proves the browser export shell still mirrors shared ready / risk / blocked state.
- `tests/web/export-assembly.test.ts` — proves browser edit persistence, shared popup preview agreement, and CLI PDF export on one workspace.
- `tests/cli/export-command.test.ts` — keeps the shipped CLI export success/failure policy locked down.
- `scripts/verify-s02-export-flows.mjs` — preserves the shared export transport smoke coverage.
- `scripts/verify-m003-s03-export-assembly.mjs` — adds the final built-runtime browser-edit → popup preview → CLI export smoke verifier.

## PR-ready summary paragraph

> Completed S03 and closed M003 by calming the shared `/print` preview and browser export messaging without changing the root ready/risk/blocked marker contract, then proving on the real built runtime that a browser edit persists to canonical workspace state, appears on the shared print popup, and still exports as a non-empty PDF through `dist/cli.js export` from the same workspace. Multi-page pagination and deeper export controls remain explicitly deferred.
