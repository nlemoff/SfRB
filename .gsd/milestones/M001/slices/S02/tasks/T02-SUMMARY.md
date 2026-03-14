---
id: T02
parent: S02
milestone: M001
provides:
  - Workspace-aware document validation that reads `workspace.physics` from `sfrb.config.json` and rejects physics/document mismatches with actionable file/path diagnostics.
key_files:
  - src/document/validation.ts
  - src/document/store.ts
  - src/config/store.ts
  - tests/document/document-validation.test.ts
  - scripts/verify-s02-document-smoke.mjs
key_decisions:
  - Kept `sfrb.config.json` as the only physics source of truth and applied physics rules at the workspace validation boundary instead of persisting duplicate physics state in `resume.sfrb.json`.
  - Preserved `readDocument()` as the structural-only file boundary from T01 and added `readWorkspaceDocument()` for config-aware validation so schema-only callers do not break.
patterns_established:
  - Layer workspace-specific validation on top of the canonical document schema rather than forking or weakening the shared document contract.
  - Surface workspace failures with both config/document paths plus field-level issue paths so future agents can localize mismatches quickly.
observability_surfaces:
  - `readWorkspaceDocument()` / `DocumentPhysicsValidationError` / `MissingWorkspaceConfigError` messages, `tests/document/document-validation.test.ts`, and `scripts/verify-s02-document-smoke.mjs`
duration: 55m
verification_result: passed
completed_at: 2026-03-13T23:52:00-07:00
blocker_discovered: false
---

# T02: Enforce workspace physics through document validation and temp-workspace smoke coverage

**Added config-driven workspace physics validation, explicit workspace-aware document reads, regression tests, and a built-path smoke script that proves both success and failure behavior on real temp workspaces.**

## What Happened

Implemented `src/document/validation.ts` as the physics-aware layer over the strict T01 schema. It reads `workspace.physics` from `sfrb.config.json`, rejects any fixed `layout.frames` in `document` workspaces, and requires every semantic block to have a linked layout frame in `design` workspaces. The failure text includes the document path, config path, and field path so a later agent can see whether the problem was structural, physics-specific, or missing-config.

Extended `src/document/store.ts` with `readWorkspaceDocument(projectRoot)` so callers can opt into the real workspace boundary without breaking the T01 structural contract around `readDocument(projectRoot)`. Updated `src/config/store.ts` to wrap invalid config JSON in a path-aware `ConfigParseError`, keeping config diagnostics aligned with the document boundary.

Replaced the placeholder test file with `tests/document/document-validation.test.ts`, covering document-physics success, design-physics success, document-mode rejection of fixed frames, design-mode rejection of missing frame coverage, and missing-config handling. Replaced the S02 smoke stub with `scripts/verify-s02-document-smoke.mjs`, which builds the repo, creates temp workspaces, writes real config/document files through the built modules, and asserts both pass/fail outcomes through the shipped code path.

## Verification

Passed task-level verification:
- `npm test -- --run tests/document/document-validation.test.ts`
- `node scripts/verify-s02-document-smoke.mjs`

Passed slice-level verification:
- `npm test -- --run tests/document/document-schema.test.ts`
- `npm test -- --run tests/document/document-validation.test.ts`
- `node scripts/verify-s02-document-smoke.mjs`
- `npm run schema:check`
- `npm run build && node -e "import('./dist/document/store.js').then(async ({ readDocument }) => { try { await readDocument(process.cwd()) } catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(0) } process.exit(1) })"`

Direct observability probe confirmed the mismatch signal shape, including both paths and the field path:
- `/tmp/.../resume.sfrb.json failed document workspace validation (workspace config: /tmp/.../sfrb.config.json):`
- `- layout.frames.0: Document workspaces forbid fixed layout frames ...`

## Diagnostics

To inspect this later:
- Run `npm test -- --run tests/document/document-validation.test.ts` for focused regression output.
- Run `node scripts/verify-s02-document-smoke.mjs` for real temp-workspace pass/fail coverage through the built code path.
- Call `readWorkspaceDocument(projectRoot)` to get structural validation, missing-config errors, or physics mismatch errors with document/config paths and issue paths.
- Call `readDocument(projectRoot)` when you only want the strict document file contract without workspace physics.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/document/validation.ts` — Added workspace-physics validation plus explicit missing-config and physics-mismatch error types.
- `src/document/store.ts` — Added `readWorkspaceDocument()` while preserving the existing structural `readDocument()` contract.
- `src/config/store.ts` — Added path-aware config JSON parse diagnostics.
- `tests/document/document-validation.test.ts` — Added regression coverage for document/design success paths, mismatch failures, and missing-config diagnostics.
- `scripts/verify-s02-document-smoke.mjs` — Added a built-code temp-workspace smoke proof for S02.
- `.gsd/milestones/M001/slices/S02/S02-PLAN.md` — Marked T02 complete.
- `.gsd/DECISIONS.md` — Recorded the workspace-physics validation rule choice for downstream slices.
