---
estimated_steps: 5
estimated_files: 6
---

# T01: Polish the shared print surface and browser export affordance without breaking markers

**Slice:** S03 — Presentation Depth & Final Export Assembly
**Milestone:** M003

## Description

Refine the user-facing export experience now that S02 transport is stable. This task should make `/print` preview and the editor-shell export panel feel calmer, more deliberate, and less diagnostics-heavy while preserving the exact readiness/risk/blocked marker contract that browser and CLI export already consume. The work is visual and UX-focused, but it is still a contract task because S03 must improve polish without deleting the inspection surface future agents rely on.

Relevant skills to load before implementation: `frontend-design`, `test`.

## Steps

1. Inspect `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `web/src/App.tsx`, and `web/src/bridge-client.ts` to map which preview-only elements, copy blocks, and visual treatments can be refined without changing the hidden iframe probe model or root export markers.
2. Polish the shared preview renderer in `render-printable-resume.ts` and `print-surface.ts`: improve framing, spacing, typography emphasis, and diagnostics presentation for preview mode, but keep artifact mode chrome-free and preserve existing `data-testid` hooks plus root/page/frame marker attrs.
3. Refine the browser export panel in `App.tsx` so it communicates `ready`, `risk`, and `blocked` with calmer product copy and clearer visual hierarchy while still mirroring state from `readBridgePrintSurfaceSnapshot()` rather than recomputing readiness in the shell.
4. Keep any state-reading or URL helpers centralized in `web/src/bridge-client.ts`; if helper changes are needed, use capability-based DOM access so the existing cross-iframe realm safety remains intact.
5. Extend `tests/web/printable-presentation-surface.test.ts` and `tests/web/browser-export-flow.test.ts` to prove the polished surfaces still keep preview/artifact separation, marker parity, and explicit ready/risk/blocked browser messaging.

## Must-Haves

- [ ] Preview-mode polish improves calmness and readability without leaking into artifact mode.
- [ ] Existing root export markers and `data-testid` hooks remain stable for downstream automation.
- [ ] Browser export UI still mirrors shared artifact-route state instead of inventing a second readiness algorithm.
- [ ] Web tests capture both the visual-contract changes and the preserved transport semantics.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts`
- Manual spot check: load `/print` and `/print?mode=artifact` from the built/open runtime and confirm preview feels calmer while artifact mode remains chrome-free and root markers are still present on `#root`.

## Observability Impact

- Signals added/changed: only user-facing preview/export copy and styling; the underlying `data-export-state`, `data-overflow-status`, `data-blocked-reason`, and related markers must remain unchanged.
- How a future agent inspects this: inspect `#root` and existing `data-testid` nodes in the web tests, plus the browser export panel state in `App.tsx`.
- Failure state exposed: marker loss, chrome leakage, or browser-shell drift from shared export state becomes visible through focused web assertions rather than subjective screenshots.

## Inputs

- `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts` — current shared preview/artifact renderer and route shell.
- `web/src/App.tsx`, `web/src/bridge-client.ts` — shipped S02 browser export affordance and probe helpers.
- `tests/web/printable-presentation-surface.test.ts`, `tests/web/browser-export-flow.test.ts` — existing S01/S02 web coverage to extend instead of replacing.
- S03 research + S02 summary — preserve the shipped `/print` and `/print?mode=artifact` contract while improving perceived finish.

## Expected Output

- `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `web/src/App.tsx`, and optionally `web/src/bridge-client.ts` — polished preview/export surfaces that preserve the shared transport contract.
- `tests/web/printable-presentation-surface.test.ts` and `tests/web/browser-export-flow.test.ts` — executable proof that polish did not break marker parity, preview/artifact separation, or browser export trust semantics.
