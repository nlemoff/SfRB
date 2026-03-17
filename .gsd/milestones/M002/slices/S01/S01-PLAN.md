# S01: Template Starts & First-Run Guidance

**Goal:** Let a non-technical user create a real SfRB workspace from either one strong starter template or a sparse blank canvas, open it without AI setup, and land in a calmer browser shell that explains text, tile, and freeform editing as guided lenses over the same resume.
**Demo:** From an empty temp directory, `sfrb init` can create either a template or blank starter workspace without requiring provider credentials, `sfrb open` serves that workspace through the existing bridge/bootstrap path, the browser clearly identifies the chosen starter and explains when to use text/tile/freeform editing, and replacing starter content still persists through the canonical editor loop.

This slice groups into three tasks because the risk is spread across three distinct seams. First, S01 needs a real canonical starter contract, not ad hoc UI fixtures, so task 1 establishes the template/blank factories plus stable starter metadata that later slices can target. Second, R010 fails unless workspace creation is honestly decoupled from AI setup, so task 2 changes the init/config path to materialize editable workspaces with or without provider config instead of only writing AI-first config. Third, the slice promise is not real until the shipped browser path feels like a first-run product surface rather than a bridge diagnostics page, so task 3 rebalances the shell and proves the full CLI-opened loop. This slice directly owns **R007**, **R008**, and **R010**, and it materially advances **R011** by reducing first-run clutter.

## Must-Haves

- A canonical starter factory can materialize exactly two shipped starts: one strong template resume and one sparse but schema-valid blank canvas.
- Starter identity is durable in workspace/document state so later slices can target template vs blank explicitly without browser-only memory.
- `sfrb init` can create an editable workspace without requiring provider credentials, while preserving the existing configured-AI path for users who do want it.
- The first-run browser shell foregrounds starter choice and straightforward text/tile/freeform guidance, while keeping copy honest about what ships now versus in later slices.
- Slice proof exercises the real local loop: create starter workspace → open bridge → inspect guidance UI → replace content through the canonical editor path.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run tests/document/starter-documents.test.ts`
- `npm test -- --run tests/cli/init-command.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `node scripts/verify-s01-first-run.mjs`
- AI-optional operational check: use the built `dist/cli.js init` and `dist/cli.js open` path against a workspace with no AI provider configured and verify `/__sfrb/bootstrap` still reports a ready workspace, the first-run guidance shell renders, and AI-dependent surfaces degrade inspectably instead of crashing.

## Observability / Diagnostics

- Runtime signals: starter kind/id, AI availability state, bridge/bootstrap readiness, existing editor save state, and invalid-workspace diagnostics remain visible in CLI/browser surfaces.
- Inspection surfaces: init command summary output, `resume.sfrb.json`, `sfrb.config.json`, `/__sfrb/bootstrap`, stable browser ids/testids in the first-run shell, `tests/document/starter-documents.test.ts`, `tests/cli/init-command.test.ts`, `tests/web/editor-first-run-guidance.test.ts`, and `scripts/verify-s01-first-run.mjs`.
- Failure visibility: a future agent can tell whether init failed in config validation vs starter materialization, whether the wrong starter variant was created, whether AI was intentionally skipped vs misconfigured, and whether the browser shell is reflecting canonical workspace state or only stale UI copy.
- Redaction constraints: diagnostics may expose provider name, env-var key name, starter identifiers, and workspace paths, but must never print secret values.

## Integration Closure

- Upstream surfaces consumed: `src/commands/init.ts`, `src/prompts/init-wizard.ts`, `src/config/schema.ts`, `src/config/store.ts`, `src/document/schema.ts`, `src/document/validation.ts`, `src/commands/open.ts`, `src/bridge/server.mjs`, `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, and the existing `/__sfrb/bootstrap` + `/__sfrb/editor` loop.
- New wiring introduced in this slice: init starter selection and AI-skip path → canonical starter factory → persisted `sfrb.config.json` + `resume.sfrb.json` → bridge/bootstrap starter metadata exposure → guidance-first browser shell over the same canonical document/editing route.
- What remains before the milestone is truly usable end-to-end: canonical structured actions, real text/tile/freeform mechanics, tile grouping/locking, and explicit mode reconciliation still belong to S02-S06.

## Tasks

- [x] **T01: Add canonical starter document factories and starter metadata** `est:2h`
  - Why: R007 depends on real starter workspaces, and S02 will need durable starter identifiers instead of browser-only labels.
  - Files: `src/document/schema.ts`, `src/document/starters.ts`, `src/document/validation.ts`, `tests/document/starter-documents.test.ts`, `tests/utils/bridge-browser.ts`
  - Do: Extend the canonical document contract with minimal starter metadata that can safely distinguish template vs blank; add one production starter factory that emits both variants for document and design physics using stable ids and the existing smallest-valid-document pattern; keep the blank start intentionally sparse but valid; keep the template strong enough to feel immediately useful; and update shared test helpers to consume the same factory instead of hand-rolled workspace fixtures.
  - Verify: `npm test -- --run tests/document/starter-documents.test.ts`
  - Done when: both starter variants are schema-valid, physics-valid, carry stable starter identity, and can be reused by tests/runtime without duplicating document-shape logic.
- [x] **T02: Let init create editable workspaces without mandatory AI setup** `est:2h`
  - Why: R010 is blocked until the shipped first-run path can create a real workspace without asking for provider credentials first.
  - Files: `src/commands/init.ts`, `src/prompts/init-wizard.ts`, `src/config/schema.ts`, `src/document/starters.ts`, `tests/cli/init-command.test.ts`
  - Do: Loosen the config contract so AI can be absent for editor-only workspaces; change init flags and wizard flow to choose starter type and allow an AI-skipped path while preserving the configured-AI path; write both config and starter document during init; keep summaries explicit about starter choice and whether AI was skipped or configured; and preserve redaction plus `.gitignore` behavior for configured providers.
  - Verify: `npm test -- --run tests/cli/init-command.test.ts`
  - Done when: init can materialize template or blank workspaces in either physics mode with no provider secret, while the existing configured-AI flow still passes and never echoes secrets.
- [x] **T03: Rework the browser shell for first-run guidance and prove the shipped loop** `est:3h`
  - Why: R008 only becomes believable once `sfrb open` lands on a calmer shell that explains the three editing lenses without pretending later slices already shipped.
  - Files: `src/bridge/server.mjs`, `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `tests/web/editor-first-run-guidance.test.ts`, `tests/utils/bridge-browser.ts`, `scripts/verify-s01-first-run.mjs`
  - Do: Expose any starter/AI-availability bootstrap fields the browser needs from canonical workspace state; redesign the top-level shell so starter identity, replacement guidance, and text/tile/freeform orientation are primary while dev diagnostics move secondary; keep mode guidance honest about current and upcoming capabilities; and add browser/runtime proof that opens both starter types, verifies the first-run guidance surface, and confirms that replacing starter content still persists through the canonical edit/refetch path.
  - Verify: `npm test -- --run tests/web/editor-first-run-guidance.test.ts && node scripts/verify-s01-first-run.mjs`
  - Done when: a CLI-created starter workspace opens into a guidance-first shell, the product copy stays aligned with canonical workspace state, and the built-path smoke check proves non-AI first-run editing works through the real runtime.

## Files Likely Touched

- `src/commands/init.ts`
- `src/prompts/init-wizard.ts`
- `src/config/schema.ts`
- `src/document/schema.ts`
- `src/document/starters.ts`
- `src/document/validation.ts`
- `src/bridge/server.mjs`
- `web/src/App.tsx`
- `web/src/editor/Canvas.tsx`
- `tests/document/starter-documents.test.ts`
- `tests/cli/init-command.test.ts`
- `tests/web/editor-first-run-guidance.test.ts`
- `tests/utils/bridge-browser.ts`
- `scripts/verify-s01-first-run.mjs`
