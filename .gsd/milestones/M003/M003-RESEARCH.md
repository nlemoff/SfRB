# M003 — Research

**Date:** 2026-03-16

## Summary

M003 should start by separating **presentation rendering** from the current interactive editor chrome, then layer PDF generation on top of that shared renderer. The existing codebase already has the right canonical boundary for this: `resume.sfrb.json` remains the source of truth, `/__sfrb/bootstrap` already exposes the browser-ready document payload, and the bridge already owns local runtime concerns. What it does **not** have yet is a clean, print-focused page renderer. Today, `web/src/editor/Canvas.tsx` mixes real content with editor-only affordances like handles, badges, HUDs, overflow notes, gradients, and selection state. Printing that DOM directly would either leak editor chrome into the PDF or force brittle print-only CSS exceptions across a very large file.

The primary recommendation is therefore: build a **dedicated printable/export presentation surface** that still reads from the same canonical document and page geometry, and then generate PDFs from that surface. For the first trustworthy milestone, optimize for the common one-page path and explicit failure visibility. The current system already carries page size, page margins, frame geometry, grouping, and overflow signals; that is enough to produce a reliable first export path without inventing a full pagination engine. Multi-page sophistication and richer template/presentation depth should come only after the print renderer and one-page trust contract are proven.

## Recommendation

Take a three-layer approach:

1. **Extract or introduce a shared presentation renderer** for canonical pages/frames/text that can be used without editor chrome.
2. **Expose a dedicated export/print route** from the bridge that renders that presentation surface from the same canonical workspace state.
3. **Add browser and CLI export flows on top of that route**, with the CLI generating the PDF through Playwright/Chromium rather than hand-rolling a PDF format.

Why this approach:

- It preserves the milestone’s most important contract: **export must match what the user built**, not a second representation.
- It reuses existing boundaries that are already working: `resume.sfrb.json` → bridge validation/bootstrap → browser rendering.
- It avoids the current trap of printing the editor shell, whose DOM is intentionally optimized for inspection and editing rather than clean output.
- It lets M003 prove the highest-risk part first: **render fidelity**, before spending time on command shape or advanced pagination.
- It supports both browser and CLI export from one rendering contract instead of drifting into separate implementations.

The first export bar should be: **“common one-page resume exports cleanly, with no silent clipping.”** If content does not fit, the product should surface an explicit warning/failure state rather than silently producing an untrustworthy PDF. That should be treated as a likely candidate requirement during planning, not as an already-binding requirement.

## Implementation Landscape

### Key Files

- `src/document/schema.ts` — Canonical document contract already includes the page primitives export needs: `layout.pages[].size`, `layout.pages[].margin`, `layout.frames[]`, and `layout.frameGroups[]`. This is the right source for page size and placement; export should not invent a parallel page model.
- `src/document/starters.ts` — Shows the current shipped page defaults: Letter-sized `612×792` with `36` point margins. This establishes the initial one-page export baseline and gives planners a concrete default to preserve.
- `src/document/validation.ts` — Physics rules matter for export planning. `document` workspaces forbid frames/groups; `design` workspaces require every semantic block to have a frame. That means export likely needs two rendering paths or one renderer that can consume either semantic flow (`document`) or positioned frames (`design`).
- `src/editor/workspace-action-runner.ts` — The canonical mutation seam. Export should read the saved workspace document after this boundary, not browser-local draft state.
- `src/bridge/server.mjs` — Best integration point for a dedicated export surface. The bridge already serves `/__sfrb/bootstrap`, `/__sfrb/editor`, `/__sfrb/consultant`, and custom HTML through Vite middleware. Adding a print/export HTML route here fits the existing runtime model.
- `web/src/bridge-client.ts` — Defines the browser payload contract. A print/export surface can reuse the same `ReadyBridgePayload` / `BridgeDocument` types rather than inventing new transport shapes.
- `web/src/editor/Canvas.tsx` — Current visual renderer, but it is tightly coupled to editor-only UI. It already knows how to map canonical pages and frames into DOM, which is valuable, but it is not directly export-safe. It should be treated as the main source of reusable rendering logic and the main place where refactoring pressure will land.
- `web/src/App.tsx` — Mounts the shell and editor canvas. Browser export UI will likely land here, but only after a dedicated export surface exists.
- `src/cli.ts` / `src/commands/open.ts` / `src/commands/edit.ts` — Existing command patterns show how a future `export` command should fit the CLI. `edit` is especially relevant as a model for concise default output plus optional structured output.
- `tests/utils/bridge-browser.ts` — Already contains the patterns needed for M003 verification: build once, create temp workspaces, start the bridge, open the real shipped app in Playwright, and inspect canonical disk state.
- `tests/web/*`, `scripts/verify-s0*.mjs` — Existing verification style proves features through the built runtime. M003 should follow this pattern with browser-visible export behavior plus real artifact checks.

### Build Order

1. **Prove a chrome-free printable renderer first.**
   - This is the highest-risk unknown.
   - The current editor surface contains drag handles, selection badges, HUD panels, inspector chrome, and overflow/helper copy. A PDF milestone should not begin by trying to hide all of that at print time.
   - The first deliverable should be a route or view that renders only the resume artifact from canonical state.

2. **Make that renderer consume both the current page model and current content model.**
   - Preserve Letter/page margin geometry from the canonical document.
   - Decide explicitly how `document` physics exports: either semantic flow on the canonical page box, or a derived default layout path that is shared and testable. This is a planning boundary that must be decided early.
   - For `design` physics, render canonical frame placement directly.

3. **Add PDF generation through Playwright only after browser-visible print fidelity is proven.**
   - Once the print route is trustworthy, CLI PDF generation becomes a transport problem, not a rendering problem.
   - The route should expose a stable “ready for export” marker so Playwright can wait deterministically before calling `page.pdf()`.

4. **Then add one-page trust and pagination/failure policy.**
   - The codebase already has overflow and page-margin risk signals, but it does not have a pagination engine.
   - First slice should likely implement “trustworthy one-page export or explicit warning/failure,” not hidden auto-pagination.
   - Only after that should planners consider deeper pagination controls or richer presentation/template depth.

### Verification Approach

- **Unit/integration tests**
  - Add tests for any extracted presentation helpers or export route payload shaping.
  - Add bridge/CLI tests for a future export command’s normalized output and failure paths.

- **Browser/runtime verification**
  - Use the existing Playwright harness in `tests/utils/bridge-browser.ts`.
  - Open a real workspace through `dist/cli.js open`, navigate to the export/print surface, and assert that editor chrome is absent while canonical content is present.
  - Verify readiness markers before attempting PDF generation.

- **Artifact verification**
  - Generate a real PDF file and assert it exists, is non-empty, and is regenerated from the current saved canonical state.
  - For the one-page happy path, verify page count is one if the chosen PDF tooling makes that inspectable; otherwise verify against deterministic renderer/page markers plus generated artifact size and browser-visible page count.
  - Verify failure visibility for a known-overflow case: export must not silently clip.

- **Likely commands/patterns**
  - `npm run build`
  - `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/...`
  - `node scripts/verify-...mjs` using the existing built-runtime style

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| PDF generation | Playwright `page.pdf()` | The repo already uses Playwright for shipped-runtime verification, and Playwright exposes the exact PDF options M003 needs (`printBackground`, `preferCSSPageSize`, width/height/format, margins). This avoids writing a PDF serializer or inventing a separate rendering stack. |
| Bridge-served runtime HTML | Existing Vite custom middleware in `src/bridge/server.mjs` | The bridge already serves custom routes and the root HTML. A print/export route can fit naturally here instead of introducing a second server. |
| Canonical state transport | `/__sfrb/bootstrap` + existing document/store validation | Export should consume the same canonical state shape as the browser shell, not a new export-only DTO. |

## Constraints

- The canonical document model must remain the single source of truth. M003 cannot introduce an export-only representation without violating the milestone context and existing architecture decisions.
- `document` and `design` physics impose different export realities. In `document` mode there are no frames; in `design` mode every block has a frame. Planning must decide whether the first export contract supports both equally or sequences them.
- The current browser renderer is DOM-first and inline-style-heavy. That is good for browser/print reuse, but it also means the existing `Canvas.tsx` is large and coupled; planners should expect a refactor rather than a tiny additive change.
- The bridge currently has no export route and the CLI currently has no export command.
- Playwright is currently in `devDependencies`, not `dependencies`. If the shipped CLI will depend on Playwright at runtime for `sfrb export`, that dependency posture may need to change or the feature must be framed as a local-dev/runtime assumption during milestone planning.
- Current page defaults are U.S. Letter with fixed margins. Supporting multiple paper sizes or advanced print controls would expand scope beyond what the current canonical model obviously proves today.

## Common Pitfalls

- **Printing the current editor DOM** — `web/src/editor/Canvas.tsx` includes editor-only UI such as handles, badges, HUD copy, comfort guides, and diagnostic notes. Trying to “just add print CSS” will likely leak chrome into the PDF or create a long tail of print-specific exceptions.
- **Exporting browser-local draft state** — the editor intentionally keeps some lens/draft/selection state local. Export should read saved canonical state, not unsaved textarea/session state, or CLI/browser parity will drift.
- **Assuming a pagination engine already exists** — the current system has page sizes, margins, overflow detection, and placement-risk diagnostics, but not multi-page reflow/pagination logic. Planning should not smuggle in a full layout engine under the label of “presentation polish.”
- **Silent clipping on overflow** — the current editing experience already treats overflow as something to surface, not hide. Export should follow that trust posture.
- **Treating document and design physics as identical** — design export can follow frames directly; document export may need semantic flow rendering or an explicit initial limitation.
- **Adding a CLI command before the renderer contract is stable** — that front-loads command/UI work while the highest-risk fidelity problem is still unsolved.

## Open Risks

- The biggest architectural question is whether the first M003 export contract should fully support both `document` and `design` workspaces, or whether the first trustworthy slice should focus on the common design/template path and make document-mode export a follow-on.
- Playwright/Chromium PDF fidelity is strong, but planners should still assume some browser-print edge cases around CSS page sizing and ensure the implementation uses explicit PDF options plus a deterministic print surface.
- The current codebase has no page-count or pagination diagnostics model. If milestone planning stretches beyond one-page trust into true multi-page behavior, scope could expand quickly.
- Presentation-depth work can easily balloon into template redesign work. The roadmap should distinguish between export fidelity, pagination trust, and optional visual/template enrichment.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Playwright | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | available |
| Vite | `antfu/skills@vite` | available |
| Testing | `/home/nlemo/.gsd/agent/skills/test/SKILL.md` | installed |

## Sources

- Playwright’s PDF API already supports `printBackground`, `preferCSSPageSize`, explicit paper sizing, margins, and newer `tagged` / `outline` options, making it the natural PDF backend for a CLI export flow rather than a custom PDF generator. (source: Context7 `/microsoft/playwright`, query: `page.pdf printBackground preferCSSPageSize @page size outline`)
- Chrome/Chromium PDF generation can be sensitive to CSS page-size handling, which reinforces the need for a dedicated print surface plus explicit PDF options instead of hoping the interactive editor page prints cleanly by default. (source: Google Search query: `Chrome headless Page.printToPDF preferCSSPageSize printBackground @page CSS pdf fidelity`)

## Candidate Requirement Notes

These are not automatically binding, but the planner should consider whether they should become explicit requirements for M003:

- **Candidate:** Export must fail or warn explicitly when the rendered result would clip or overflow, rather than silently producing an untrustworthy PDF.
- **Candidate:** Browser export and CLI export must both derive from the same canonical presentation renderer.
- **Candidate:** The default exported artifact should preserve the common one-page Letter resume path before any advanced pagination controls are added.
- **Candidate:** Editor-only chrome must never appear in exported output.
