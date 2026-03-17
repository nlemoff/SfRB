# S02: Shared PDF Export Flows — Summary

S02 is now the shipped export transport layer for M003.

## What S02 guarantees now

- `/print` remains the canonical human-facing print/export surface.
- `/print?mode=artifact` reuses the same renderer and canonical payload, but strips preview-only header/diagnostics chrome so artifact generation does not capture editor-era affordances.
- `dist/cli.js export <output> --cwd <workspace> --port 0` is shipped on the built runtime and waits for the shared root markers before writing a PDF.
- CLI export only succeeds when the shared surface settles at `#root[data-export-state="ready"][data-overflow-status="clear"]`.
- CLI export fails explicitly for `risk` and `blocked`, including the surfaced blocked reason, and writes through a temporary sibling path so failed exports do not replace an existing artifact.
- The real browser shell now exposes a browser export control in `web/src/App.tsx` without introducing a second renderer. It probes the shared artifact route, mirrors the same ready / risk / blocked policy, and only requests browser print when the shared route reports `ready`.
- When browser export sees `risk` or `blocked`, it opens the same shared `/print` surface for review but withholds any trustworthy export cue in the editor shell.

## Key files

- `web/src/App.tsx`
- `web/src/bridge-client.ts`
- `web/src/print-main.tsx`
- `web/src/presentation/print-surface.ts`
- `src/commands/export.ts`
- `tests/web/browser-export-flow.test.ts`
- `tests/web/printable-presentation-surface.test.ts`
- `tests/cli/export-command.test.ts`
- `scripts/verify-s02-export-flows.mjs`

## Verification shape

- Web contract: `tests/web/browser-export-flow.test.ts`
- Print-surface contract: `tests/web/printable-presentation-surface.test.ts`
- CLI artifact contract: `tests/cli/export-command.test.ts`
- Built runtime smoke: `node scripts/verify-s02-export-flows.mjs`

## Exact seam S03 owns next

S03 should **not** reinvent export transport. It should polish and assemble what S02 already shipped:

- refine preview/presentation treatment on top of the existing `/print` + `/print?mode=artifact` split
- verify browser-edit → export acceptance against a freshly edited real workspace
- keep the ready / risk / blocked trust contract intact while improving calmness, copy, and final artifact feel
- leave the milestone-final PR/handoff summary for `DEV`

## PR-ready summary paragraph

> Shipped S02 as the shared PDF export transport layer for M003 by adding an artifact mode to the canonical `/print` route, wiring `dist/cli.js export` to wait for the shared ready/risk/blocked markers before writing real PDFs, and teaching the browser shell to read the same markers before requesting print so S03 can focus on polish and assembled runtime acceptance instead of rediscovering export policy.
