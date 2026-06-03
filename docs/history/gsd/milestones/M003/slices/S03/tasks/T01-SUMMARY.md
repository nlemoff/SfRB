---
id: T01
parent: S03
milestone: M003
provides:
  - Calmer shared print preview framing and browser export messaging that preserve the shipped export-marker contract.
key_files:
  - web/src/presentation/render-printable-resume.ts
  - web/src/presentation/print-surface.ts
  - web/src/App.tsx
  - web/src/bridge-client.ts
  - tests/web/printable-presentation-surface.test.ts
  - tests/web/browser-export-flow.test.ts
  - scripts/copy-bridge-runtime.mjs
key_decisions:
  - Keep preview polish strictly preview-only while leaving artifact mode dependent on the same root marker contract and hidden iframe probe state.
  - Read shared print-surface markers through attribute access in bridge-client so the browser shell continues mirroring cross-iframe state instead of recomputing readiness.
patterns_established:
  - Preview-facing copy and styling may change, but `#root[data-export-state][data-overflow-status][data-blocked-reason][data-risk-count][data-max-overflow-px]` and existing `data-testid` hooks remain the stable automation contract.
  - Browser export UI should phrase ready/risk/blocked calmly while always sourcing truth from `readBridgePrintSurfaceSnapshot()` on the artifact-route iframe.
observability_surfaces:
  - Shared print `#root` marker attrs, preview `data-testid` nodes, mirrored browser export panel data attrs/copy, focused web tests, and the built-runtime `/print` browser spot-check.
duration: 2h 20m
verification_result: passed
completed_at: 2026-03-17T10:44:26Z
blocker_discovered: false
---

# T01: Polish the shared print surface and browser export affordance without breaking markers

**Shipped a calmer shared print preview and browser export panel without changing the underlying ready/risk/blocked marker contract.**

## What Happened

I refreshed the shared printable presentation in `web/src/presentation/render-printable-resume.ts` so preview mode now has softer framing, clearer hierarchy, and calmer export messaging while artifact mode still renders chrome-free from the same payload and preserves the existing page/frame/testid markers. I updated `web/src/presentation/print-surface.ts` loading/error shells to match that calmer presentation without changing root-state signaling.

In `web/src/App.tsx`, I refined the browser export affordance to present ready / risk / blocked states with quieter product copy, a clearer summary/policy layout, and a visible state pill, but it still reads artifact-route truth from the hidden iframe probe instead of inventing a second readiness algorithm. In `web/src/bridge-client.ts`, I tightened `readBridgePrintSurfaceSnapshot()` to use attribute reads directly for safer cross-realm marker access.

I also extended the web tests to assert the new polish contract explicitly: preview-only copy/framing stays out of artifact mode, root markers remain aligned between modes, and the browser export panel still mirrors shared artifact-route ready/risk/blocked state. During verification I found `npm run build` failed on a clean worktree because `scripts/copy-bridge-runtime.mjs` used `cp()` in a way that tried to unlink a missing destination, so I switched that helper to `copyFile()` to restore truthful clean-build verification.

## Verification

Passed:
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts tests/web/export-assembly.test.ts tests/cli/export-command.test.ts`
- `npm run build`
- `node ./scripts/verify-s02-export-flows.mjs`

Manual/browser verification passed on the real built runtime via `node dist/cli.js open --cwd /tmp/sfrb-manual-1Dqd7H --port 4174 --no-open` plus browser checks:
- `/print` showed the calmer preview framing, title text, diagnostics panel, and `#root[data-print-mode="preview"][data-export-state="ready"][data-overflow-status="clear"][data-chrome-free="true"]`
- `/print?mode=artifact` kept the same ready markers while omitting preview header/diagnostics (`headerCount: 0`, `diagnosticsCount: 0`)

Not yet passing because it belongs to T02:
- `node ./scripts/verify-m003-s03-export-assembly.mjs` → file does not exist yet in this worktree

## Diagnostics

Inspect later with:
- Shared print route root markers on `#root`
- Preview-only nodes: `[data-testid="print-surface-header"]`, `[data-testid="print-export-diagnostics"]`
- Browser export shell markers/copy: `[data-testid="browser-export-panel"]` plus `data-export-state`, `data-overflow-status`, `data-blocked-reason`, `data-risk-count`, `data-max-overflow-px`, `data-last-action`
- Focused regression tests: `tests/web/printable-presentation-surface.test.ts` and `tests/web/browser-export-flow.test.ts`

## Deviations

- Applied a small supporting fix to `scripts/copy-bridge-runtime.mjs` so clean-worktree `npm run build` succeeds; this was not listed in the task plan but was required to complete verification truthfully.

## Known Issues

- The slice-level verifier `scripts/verify-m003-s03-export-assembly.mjs` is still absent and remains T02 work.

## Files Created/Modified

- `web/src/presentation/render-printable-resume.ts` — polished preview framing, calmer diagnostics copy, and preserved shared measurement/marker behavior.
- `web/src/presentation/print-surface.ts` — aligned loading/error shells with the calmer preview presentation while keeping root-state semantics intact.
- `web/src/App.tsx` — refined browser export panel hierarchy/copy and kept mirrored artifact-route state as the source of truth.
- `web/src/bridge-client.ts` — switched print-surface snapshot reads to attribute-based access for safer cross-iframe DOM reads.
- `tests/web/printable-presentation-surface.test.ts` — asserted calmer preview copy plus preview/artifact separation and marker parity.
- `tests/web/browser-export-flow.test.ts` — asserted the updated ready/risk/blocked browser export messaging while preserving probe semantics.
- `scripts/copy-bridge-runtime.mjs` — fixed clean-build bridge runtime copying with `copyFile()`.
