---
id: S02
parent: M001
milestone: M001
provides:
  - Canonical `resume.sfrb.json` document contract with strict runtime parsing, generated `schema.json`, and workspace-physics-aware validation tied to `sfrb.config.json`.
requires:
  - slice: S01
    provides: Validated workspace config with `workspace.physics` and provider metadata in `sfrb.config.json`.
affects:
  - S03
  - S04
  - S05
key_files:
  - package.json
  - schema.json
  - src/document/schema.ts
  - src/document/store.ts
  - src/document/validation.ts
  - src/config/store.ts
  - tests/document/document-schema.test.ts
  - tests/document/document-validation.test.ts
  - scripts/verify-s02-document-smoke.mjs
key_decisions:
  - D009 defines the SfRB document contract as strict Zod schemas and derives the checked-in `schema.json` artifact from that same source.
  - D010 reserves `resume.sfrb.json` as the default workspace document path for the local document model.
  - D011 keeps `sfrb.config.json` as the only physics source of truth; `document` mode forbids fixed layout frames and `design` mode requires every semantic block to have a linked frame.
patterns_established:
  - Keep semantic content and spatial layout distinct in one strict schema, linked by stable IDs and validated through one document store boundary.
  - Layer workspace-specific validation on top of the canonical document schema instead of duplicating physics state inside the document file.
observability_surfaces:
  - `npm test -- --run tests/document/document-schema.test.ts`
  - `npm test -- --run tests/document/document-validation.test.ts`
  - `node scripts/verify-s02-document-smoke.mjs`
  - `npm run schema:check`
  - `readWorkspaceDocument()` / `DocumentPhysicsValidationError` output
  - `schema.json`
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
duration: ~1h10m
verification_result: passed
completed_at: 2026-03-14T06:55:00Z
---

# S02: Universal Doc Model

**Shipped the canonical SfRB resume document boundary: strict runtime parsing, a checked-in JSON Schema artifact, and workspace-aware validation that changes behavior based on configured physics.**

## What Happened

S02 turned the milestone's document idea into a real file contract that downstream CLI, browser, and agent code can all share. The slice introduced `src/document/schema.ts` as the single source of truth for the universal document model, with strict Zod objects throughout so unknown keys fail loudly instead of being silently stripped. Semantic resume content (`semantic.sections`, `semantic.blocks`) and spatial layout metadata (`layout.pages`, `layout.frames`) stay separate, and the schema links them through stable IDs plus cross-reference checks so broken semantic/layout relationships are rejected at parse time.

That canonical schema now drives every surface that mattered in this slice. `src/document/store.ts` reserves `resume.sfrb.json` as the stable workspace document path, exposes read/write helpers, and formats parse/validation failures with document-path context. `schema.json` is checked in, but it is not hand-maintained: generation and parity checking are wired to the same canonical runtime schema, so drift between runtime parsing, exported TypeScript types, and the published JSON Schema artifact is caught automatically.

The second half of the slice closed the workspace-specific risk. `src/document/validation.ts` layers physics-aware validation on top of the strict document contract by reading `workspace.physics` from `sfrb.config.json`. In `document` workspaces, fixed `layout.frames` are rejected. In `design` workspaces, every semantic block must have a linked frame. `readWorkspaceDocument()` now gives later slices one explicit workspace boundary that can surface structural failures, missing-config failures, or document-vs-physics mismatches with both config/document paths and field-level issue paths.

Verification stayed integration-grade instead of unit-only. The schema tests exercised the real on-disk document boundary, the validation tests proved mode-sensitive success and failure cases, the smoke script created temp workspaces and verified the built path end to end, `npm run schema:check` proved the checked-in artifact matches runtime behavior, and a direct diagnostic probe confirmed the mismatch error shape includes both file paths and actionable field context.

## Verification

Passed:
- `npm test -- --run tests/document/document-schema.test.ts`
- `npm test -- --run tests/document/document-validation.test.ts`
- `node scripts/verify-s02-document-smoke.mjs`
- `npm run schema:check`
- `node -e "import('./dist/document/store.js').then(async ({ readDocument }) => { try { await readDocument(process.cwd()) } catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(0) } process.exit(1) })"`

Observed during verification:
- schema tests proved strict unknown-key rejection, semantic/layout link enforcement, invalid JSON path context, stable `resume.sfrb.json` serialization, and `schema.json` parity
- workspace validation tests proved that the same document boundary is accepted or rejected differently based on `workspace.physics`
- the smoke script passed through built code in real temp workspaces and printed the created workspace/document paths
- `npm run schema:check` rebuilt the project and confirmed the checked-in JSON Schema still matches the canonical runtime schema
- the direct diagnostic probe emitted `/tmp/.../resume.sfrb.json failed document workspace validation (workspace config: /tmp/.../sfrb.config.json): - layout.frames.0: ...`, confirming the expected observability surface for physics mismatches
- the file-boundary probe for `readDocument()` surfaced the expected missing `resume.sfrb.json` path on failure

## Requirements Advanced

- R003 — S02 produced the canonical document/schema boundary that S03 will serve and live-sync through the local web bridge.
- R001 — S02 established the semantic/layout split and stable linking model the hybrid editor will mutate in S04.

## Requirements Validated

- R004 — real temp-workspace tests and smoke coverage proved that `workspace.physics` changes document acceptance behavior at the shared workspace boundary, with `document` mode forbidding frames and `design` mode requiring full frame coverage.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- S02 validates the document boundary and workspace physics, but it does not yet launch a browser, live-sync files, or allow editing.
- `document` physics currently proves reflow intent by forbidding fixed frames at validation time; actual interactive reflow behavior remains future S04 work.
- The slice does not yet cover AI-driven layout mutations or overflow detection; those remain S05 responsibilities.

## Follow-ups

- S03 should load documents through `readWorkspaceDocument()` when it needs workspace-aware behavior and keep `readDocument()` available for schema-only callers.
- S03 should watch `resume.sfrb.json` directly rather than inventing a second document filename or bridge-specific schema.
- S04 should preserve the stable semantic block IDs and frame linkage model, because the design/document physics rules now depend on those cross-references.

## Files Created/Modified

- `package.json` — added schema generation/check scripts that keep the checked-in artifact aligned with runtime code.
- `schema.json` — checked-in JSON Schema artifact generated from the canonical document schema.
- `src/document/schema.ts` — defines the strict universal document model, exported types, ID/link validation, and schema export helper.
- `src/document/store.ts` — centralizes the `resume.sfrb.json` file boundary plus read/write and workspace-aware read helpers.
- `src/document/validation.ts` — adds workspace-physics validation, missing-config handling, and actionable mismatch diagnostics.
- `src/config/store.ts` — now surfaces path-aware config JSON parse failures to match the document boundary style.
- `tests/document/document-schema.test.ts` — proves strict schema/runtime/file-boundary behavior and `schema.json` parity.
- `tests/document/document-validation.test.ts` — proves document/design success paths, mismatch failures, and missing-config diagnostics.
- `scripts/verify-s02-document-smoke.mjs` — exercises the built code path in temp workspaces for the slice demo.
- `REQUIREMENTS.md` — moved R004 to validated based on slice evidence.
- `PROJECT.md` — refreshed the current-state summary to include the completed document model.
- `.gsd/STATE.md` — advanced slice status and next action.
- `.gsd/milestones/M001/M001-ROADMAP.md` — marked S02 complete.

## Forward Intelligence

### What the next slice should know
- `resume.sfrb.json` is now the explicit workspace document boundary; S03 should treat it as authoritative instead of inventing another file naming convention.
- `schema.json` is trustworthy only because it is generated from the same source as runtime parsing; any future schema changes should preserve that single-source-of-truth flow.
- `readWorkspaceDocument()` is the right integration boundary when the bridge/editor must honor workspace physics, while `readDocument()` remains useful for purely structural document operations.

### What's fragile
- `src/document/schema.ts` — downstream slices will depend on these IDs and cross-links staying stable; casual shape changes could break both runtime validation and the published schema artifact.
- `src/document/validation.ts` — the physics rules are intentionally narrow and milestone-specific; if S04 expands the meaning of document/design modes, tests and error messages must be updated in lockstep.

### Authoritative diagnostics
- `node scripts/verify-s02-document-smoke.mjs` — best end-to-end proof that the shipped built modules accept and reject documents correctly in real workspaces.
- `npm run schema:check` — best drift detector for runtime schema vs checked-in `schema.json`.
- `npm test -- --run tests/document/document-validation.test.ts` — best focused regression signal for physics-sensitive acceptance and failure behavior.

### What assumptions changed
- "Physics behavior can live only in the future editor" — the slice proved the workspace-level physics contract needed to exist at the document boundary first so later bridge/editor slices inherit one source of truth.
- "A JSON Schema artifact can be maintained separately from runtime parsing" — the safer path was to derive the artifact from the canonical Zod schema and fail fast on drift.
