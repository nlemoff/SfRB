---
id: S01
parent: M002
milestone: M002
provides:
  - A real first-run workspace path: template or blank starter documents with durable starter metadata, AI-optional init, and a guidance-first browser shell that still saves through the canonical bridge/document loop.
requires: []
affects:
  - S02
  - S03
  - S04
  - S05
  - S06
  - S07
key_files:
  - src/document/starters.ts
  - src/document/schema.ts
  - src/config/schema.ts
  - src/prompts/init-wizard.ts
  - src/commands/init.ts
  - src/bridge/server.mjs
  - web/src/App.tsx
  - tests/document/starter-documents.test.ts
  - tests/cli/init-command.test.ts
  - tests/web/editor-first-run-guidance.test.ts
  - scripts/verify-s01-first-run.mjs
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
key_decisions:
  - Carry shipped starter identity in optional `document.metadata.starter` and generate both starter variants through one production factory shared by runtime and tests.
  - Let `sfrb.config.json` omit `ai` for editor-only workspaces while `sfrb init` always writes a real `resume.sfrb.json` starter document.
  - Expose starter identity and AI availability on `/__sfrb/bootstrap` and derive first-run browser guidance from that canonical payload instead of client-local onboarding state.
patterns_established:
  - Starter workspaces are created by `sfrb init` through canonical starter factories, persisted through the normal config/document boundary, and reopened through the existing `/__sfrb/bootstrap` + `/__sfrb/editor` loop.
  - First-run browser proof should verify stable guidance/test ids plus canonical bootstrap starter/AI state, then confirm persistence by editing starter content and re-reading bootstrap/disk state.
observability_surfaces:
  - `resume.sfrb.json` `metadata.starter`
  - init command JSON summary (`workspace.starter`, `workspace.physics`, `documentPath`, `ai.status`)
  - `/__sfrb/bootstrap` `starter` + `ai`
  - `[data-testid="first-run-guidance"]`
  - `#starter-kind`
  - `#starter-id`
  - `#starter-guidance`
  - `#workspace-ai-status`
  - `#workspace-ai-note`
  - `#consultant-panel[data-consultant-state][data-consultant-code]`
  - `tests/document/starter-documents.test.ts`
  - `tests/cli/init-command.test.ts`
  - `tests/web/editor-first-run-guidance.test.ts`
  - `scripts/verify-s01-first-run.mjs`
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T03-SUMMARY.md
duration: ~1h
verification_result: passed
completed_at: 2026-03-15 03:36 PDT
blocker_discovered: false
---

# S01: Template Starts & First-Run Guidance

**Shipped the real non-AI first-run path: `sfrb init` now creates template or blank starter workspaces, `sfrb open` exposes canonical starter/AI state to a guidance-first browser shell, and starter edits persist through the same canonical bridge loop.**

## What Happened

S01 turned M001’s editor foundation into a truthful first-run product surface instead of a developer-first bridge demo.

The slice started at the document boundary. `src/document/starters.ts` now owns the two shipped starts — one strong template and one sparse blank canvas — through a single production `createStarterDocument(kind, physics)` factory. Starter provenance is carried in optional canonical metadata (`document.metadata.starter`) so later slices can target template vs blank from the real workspace state instead of inventing browser-local labels. Shared bridge-browser fixtures were switched over to this same factory so tests and runtime stop drifting.

From there, `sfrb init` was rewired around real workspace creation instead of mandatory AI configuration. `src/config/schema.ts` now allows editor-only workspaces with no `ai` block, `src/prompts/init-wizard.ts` asks for starter and physics before any provider questions, and `src/commands/init.ts` always materializes both `sfrb.config.json` and `resume.sfrb.json`. The command summary now exposes starter kind/id, physics, document path, and AI status as `skipped` vs `configured`, while configured flows still preserve redaction and `.gitignore` protection.

The browser work finished the slice promise. `src/bridge/server.mjs` now includes canonical `starter` and `ai` fields in the ready `/__sfrb/bootstrap` payload, and `web/src/App.tsx` was rebalanced so the top of the shell is first-run guidance rather than diagnostics: starter identity, replacement guidance, AI availability, and honest text/tile/freeform orientation are now primary. Diagnostics remain available below, and the consultant panel degrades inspectably when AI is intentionally skipped instead of pretending to be merely idle.

The final proof stayed at the shipped runtime boundary. `tests/web/editor-first-run-guidance.test.ts` opens both starter variants through the built CLI, verifies the guidance shell plus bootstrap fields, and confirms replacement text persists through save/refetch reconciliation. `scripts/verify-s01-first-run.mjs` repeats the same loop against `dist/cli.js init` + `dist/cli.js open` with AI skipped. A direct operational check also confirmed the built CLI emits init summary fields and ready bootstrap `starter`/`ai` payloads exactly where future debugging will look first.

## Verification

Passed:
- `npm test -- --run tests/document/starter-documents.test.ts`
- `npm test -- --run tests/cli/init-command.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `node scripts/verify-s01-first-run.mjs`

Observability confirmed working through executed checks and direct built-runtime inspection:
- init summary exposes `workspace.starter.kind`, `workspace.starter.id`, `workspace.physics`, `documentPath`, and `ai.status`
- `/__sfrb/bootstrap` returns ready-state `starter` and `ai` payloads for AI-skipped starter workspaces
- first-run shell surfaces stable guidance/test ids and consultant unavailable state derived from canonical payload state
- canonical persistence was re-proven by editing starter content and observing refetched bootstrap/on-disk state

## Requirements Advanced

- R007 — The slice now materializes one strong template and one sparse blank starter through the canonical workspace boundary, with durable starter metadata ready for downstream tile/action work.
- R008 — The browser now explains text, tile, and freeform as intentional lenses over one resume, using canonical bootstrap state instead of ad hoc onboarding copy.
- R011 — The first-run shell is materially calmer and less diagnostic-forward than the M001 bridge surface, which advances the milestone’s minimalist presentation goal even though broader polish still belongs to later slices.

## Requirements Validated

- R010 — A non-technical user can now create a starter workspace without AI setup, open it through the shipped runtime, replace starter content, and have the canonical edit persist.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

- Tightened `tests/utils/bridge-browser.ts` so helper-created workspaces preserve canonical starter copy unless a test explicitly requests replacement content.

## Known Limitations

- The text, tile, and freeform lenses are only explained in product language here; the actual separate editing mechanics and reconciliation rules still belong to S02-S06.
- R007 is not fully retired yet because the later tile engine still has to make “tiles already assembled into a full resume” concrete beyond starter content and metadata.
- AI-skipped and AI-configured first-run states are now inspectable, but richer provider/product configuration remains intentionally deferred.

## Follow-ups

- S02 should consume `metadata.starter` and `/__sfrb/bootstrap` starter fields as canonical identifiers for action-model targeting instead of introducing new entry-point state.
- Preserve the current AI availability envelope shape when later slices add richer editing modes so first-run degradation stays inspectable.

## Files Created/Modified

- `src/document/starters.ts` — added the production starter factory and the shipped template/blank document variants.
- `src/document/schema.ts` — added optional canonical starter metadata.
- `src/config/schema.ts` — made `ai` optional for editor-only workspaces while preserving validation when present.
- `src/prompts/init-wizard.ts` — added starter-first, AI-optional init flow.
- `src/commands/init.ts` — wrote real starter documents during init and exposed starter/AI summary fields.
- `src/bridge/server.mjs` — exposed canonical starter and AI availability data on `/__sfrb/bootstrap`.
- `web/src/App.tsx` — rebuilt the top-level shell around first-run guidance and honest AI-unavailable state.
- `tests/document/starter-documents.test.ts` — proved both starter variants validate under both physics modes.
- `tests/cli/init-command.test.ts` — proved AI-skipped and AI-configured init flows for template/blank workspaces.
- `tests/web/editor-first-run-guidance.test.ts` — proved guidance-first runtime behavior and save/refetch persistence for both starters.
- `scripts/verify-s01-first-run.mjs` — added shipped-path smoke verification for non-AI first-run editing.
- `.gsd/REQUIREMENTS.md` — moved R010 to validated based on executed S01 proof.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S01 complete.
- `.gsd/PROJECT.md` — refreshed current project state for completed S01 / upcoming S02 work.
- `.gsd/STATE.md` — advanced GSD state to S02-ready.

## Forward Intelligence

### What the next slice should know
- The cleanest downstream contract is already present: starter targeting lives in canonical document/bootstrap state, not in init-only flags or browser-local onboarding memory.
- The strongest first-run proof is not the shell copy by itself; it is starter identity + AI availability in `/__sfrb/bootstrap`, paired with a real save/refetch edit that changes canonical disk state.
- `sfrb init` now always leaves behind a real workspace document, so future slices can assume `resume.sfrb.json` exists immediately after successful init.

### What's fragile
- `web/src/App.tsx` now carries more shell-level product framing while still owning consultant state; future mode work can easily clutter this again if guidance, diagnostics, and editing controls are not kept separated.
- `tests/utils/bridge-browser.ts` now intentionally preserves starter copy by default — helper changes that start auto-rewriting text again will weaken first-run proof and can hide starter regressions.

### Authoritative diagnostics
- `tests/web/editor-first-run-guidance.test.ts` — strongest browser-level proof that both shipped starters render the right guidance and still save canonically.
- `tests/cli/init-command.test.ts` — strongest proof that init truthfully supports AI-skipped and AI-configured first-run paths without leaking secrets.
- `node scripts/verify-s01-first-run.mjs` — fastest end-to-end confirmation that the shipped CLI path still supports non-AI first-run editing.
- `/__sfrb/bootstrap` — authoritative live signal for starter identity, AI availability, readiness, and post-save reconciliation.

### What assumptions changed
- “First-run state can live in the browser shell” — in practice, the durable contract had to live in canonical workspace/bootstrap state so save/refetch and CLI-opened runtime checks stayed truthful.
- “Init is primarily provider setup” — in practice, the useful first-run contract is real workspace creation first, with AI configuration optional and inspectable.