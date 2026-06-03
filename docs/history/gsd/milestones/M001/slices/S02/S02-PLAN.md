# S02: Universal Doc Model

**Goal:** Define the first real SfRB document boundary: a strict JSON resume model that keeps semantic content and spatial layout linked but distinct, exports a checked-in `schema.json`, and validates against workspace physics from `sfrb.config.json`.
**Demo:** In a configured workspace, a real SfRB document file can be read from disk, validated through the shared document boundary, accepted in matching physics mode, rejected in mismatched physics mode with path-aware errors, and represented by a checked-in JSON Schema artifact that matches runtime behavior.

This slice groups into two tasks because the main risk is contract drift across three surfaces: runtime parsing, published schema, and workspace-specific physics rules. Task 1 locks the structural contract first so later slices do not build on an ambiguous file shape; it also names the on-disk document file and emits the milestone-required `schema.json` from the same source of truth. Task 2 then closes the higher-risk boundary by wiring that contract to `sfrb.config.json` so validation behavior actually changes with workspace physics. Requirement focus: this slice directly advances **R004** and establishes the document contract that later slices need for **R003** and, indirectly, **R001**.

## Must-Haves

- The repo has a canonical SfRB document schema in code with exported TS types and strict runtime parsing semantics.
- A checked-in `schema.json` artifact is generated from the same canonical schema source and stays aligned with runtime validation.
- The document contract supports both semantic resume content and spatial layout metadata without collapsing one into the other.
- The workspace document file path/extension is explicit and reusable by later CLI/web slices.
- Physics-aware validation consumes `workspace.physics` from `sfrb.config.json` and rejects document/layout states that do not fit the configured mode.
- Slice verification proves the file-boundary contract, exported schema artifact, and physics-sensitive validation behavior on real temp-workspace inputs.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run tests/document/document-schema.test.ts`
- `npm test -- --run tests/document/document-validation.test.ts`
- `node scripts/verify-s02-document-smoke.mjs`
- `npm run schema:check`
- `node -e "import('./dist/document/store.js').then(async ({ readDocument }) => { try { await readDocument(process.cwd()) } catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(0) } process.exit(1) })"`

## Observability / Diagnostics

- Runtime signals: path-aware document validation errors, explicit physics mismatch diagnostics, and schema generation/check failures when runtime and `schema.json` drift.
- Inspection surfaces: `schema.json`, the document store/validation test output, and the S02 smoke verification script.
- Failure visibility: invalid document shape, unknown keys, missing required semantic/layout links, missing workspace config, and document-vs-physics mismatches surface with actionable file/path context.
- Redaction constraints: diagnostics must not print raw API keys from `sfrb.config.json`; only document/config paths and validation fields should appear.

## Integration Closure

- Upstream surfaces consumed: `src/config/schema.ts`, `src/config/store.ts`, and the S01 `sfrb.config.json` contract for `workspace.physics`.
- New wiring introduced in this slice: document file boundary → strict Zod schema/types → generated `schema.json` artifact → physics-aware validation that reads workspace config.
- What remains before the milestone is truly usable end-to-end: S03 must watch/open the document file through a local server, and S04 must make the browser editor mutate this validated model.

## Tasks

- [x] **T01: Define the strict document contract and exported schema artifact** `est:2h`
  - Why: Later slices need one durable file contract for document content, layout metadata, and JSON Schema export before any physics rules or bridge code can be trusted.
  - Files: `package.json`, `src/document/schema.ts`, `src/document/store.ts`, `schema.json`, `tests/document/document-schema.test.ts`
  - Do: Add a `src/document` module that defines the universal document model with `z.strictObject(...)`, stable IDs, semantic sections/blocks plus linked layout frames, and an explicit default document filename; export inferred types from the same module; add document read/write helpers for the on-disk file boundary; and add a checked-in `schema.json` plus generation/check script so the published contract stays derived from the same schema source.
  - Verify: `npm test -- --run tests/document/document-schema.test.ts && npm run schema:check`
  - Done when: the repo has one canonical document schema, one explicit document file contract, and automated tests prove strict parsing plus `schema.json` alignment.
- [x] **T02: Enforce workspace physics through document validation and temp-workspace smoke coverage** `est:2h`
  - Why: R004 is only real once the same document shape is accepted or rejected differently based on workspace physics from the validated S01 config boundary.
  - Files: `src/document/validation.ts`, `src/document/store.ts`, `src/config/store.ts`, `tests/document/document-validation.test.ts`, `scripts/verify-s02-document-smoke.mjs`
  - Do: Implement physics-aware validation that loads `workspace.physics` from `sfrb.config.json`, enforces which layout metadata is required or forbidden in document vs design workspaces, returns path-aware diagnostics through the document store boundary, and add integration-grade tests plus a smoke script that exercise matching and mismatched config/document pairs in temp workspaces.
  - Verify: `npm test -- --run tests/document/document-validation.test.ts && node scripts/verify-s02-document-smoke.mjs`
  - Done when: a valid document passes in the correct physics mode, the same or mutated document fails in the wrong mode with actionable errors, and the slice demo can be reproduced from real on-disk workspace inputs.

## Files Likely Touched

- `package.json`
- `src/document/schema.ts`
- `src/document/store.ts`
- `src/document/validation.ts`
- `schema.json`
- `tests/document/document-schema.test.ts`
- `tests/document/document-validation.test.ts`
- `scripts/verify-s02-document-smoke.mjs`
- `src/config/store.ts`
