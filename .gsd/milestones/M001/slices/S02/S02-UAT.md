# S02: Universal Doc Model — UAT

**Milestone:** M001
**Written:** 2026-03-13

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S02 ships a file contract, schema artifact, and workspace-aware validation boundary. Correctness is proven by real document/config files, runtime diagnostics, and schema-parity checks rather than subjective UI feel.

## Preconditions

- Run from the SfRB repo root.
- Dependencies are installed.
- `dist/` can be built locally (`npm run build` works).
- Use throwaway temp workspaces for all tests.
- Keep one fake OpenAI key name (`OPENAI_API_KEY`) and one fake Anthropic key name (`ANTHROPIC_API_KEY`) in mind for config fixtures; do not use real secrets.

## Smoke Test

Run:

`node scripts/verify-s02-document-smoke.mjs`

Expected:
- script exits 0
- output contains `S02 document smoke check passed.`
- output prints a temp workspace path and the temp `resume.sfrb.json` path
- the smoke run proves at least one passing workspace/document pair and at least one failing physics mismatch through the built code path

## Test Cases

### 1. Strict schema contract accepts a valid workspace document

1. Run `npm test -- --run tests/document/document-schema.test.ts`.
2. Confirm the test file passes.
3. **Expected:** the suite exits 0 and includes coverage for writing and re-reading `resume.sfrb.json`, strict parsing, broken link rejection, and `schema.json` parity.

### 2. `document` physics accepts a frame-free document

1. Create a fresh temp workspace.
2. Write `sfrb.config.json` with `workspace.physics` set to `document`.
3. Write `resume.sfrb.json` using the canonical document shape with semantic sections/blocks, one page, and an empty `layout.frames` array.
4. Call `readWorkspaceDocument(<temp-dir>)` from `dist/document/store.js`.
5. **Expected:** the call resolves successfully and the returned document contains `layout.frames: []`.

### 3. `design` physics accepts a fully framed document

1. Create a fresh temp workspace.
2. Write `sfrb.config.json` with `workspace.physics` set to `design`.
3. Write `resume.sfrb.json` where every semantic block has a linked `layout.frames` entry on a valid page.
4. Call `readWorkspaceDocument(<temp-dir>)`.
5. **Expected:** the call resolves successfully and the returned document includes the linked frames for all blocks.

### 4. `document` physics rejects fixed frames with actionable diagnostics

1. Create a fresh temp workspace.
2. Write `sfrb.config.json` with `workspace.physics` set to `document`.
3. Write a valid structural document that includes at least one `layout.frames` entry.
4. Call `readWorkspaceDocument(<temp-dir>)` and capture the thrown error text.
5. **Expected:** the error mentions both `<temp-dir>/resume.sfrb.json` and `<temp-dir>/sfrb.config.json`, names `layout.frames.0`, and tells the tester to remove the frame or switch `workspace.physics` to `design`.

### 5. `design` physics rejects incomplete frame coverage

1. Create a fresh temp workspace.
2. Write `sfrb.config.json` with `workspace.physics` set to `design`.
3. Write a valid structural document with two semantic blocks but only one linked frame.
4. Call `readWorkspaceDocument(<temp-dir>)` and capture the thrown error text.
5. **Expected:** the error mentions the missing block path (for example `semantic.blocks.1.id`), includes the missing block ID, and suggests adding a linked frame or switching `workspace.physics` to `document`.

### 6. Missing workspace config fails explicitly

1. Create a fresh temp workspace.
2. Write only `resume.sfrb.json` using a valid frame-free document.
3. Call `readWorkspaceDocument(<temp-dir>)`.
4. **Expected:** the call fails with an error that names both `resume.sfrb.json` and `sfrb.config.json` and tells the tester to run `sfrb init` first or add the workspace config file.

### 7. Checked-in `schema.json` matches runtime behavior

1. Run `npm run schema:check`.
2. Inspect stdout.
3. **Expected:** the command exits 0 and prints `schema.json matches the canonical document schema.`

## Edge Cases

### Unknown keys are rejected instead of silently stripped

1. Create a temp workspace and write a `resume.sfrb.json` file with an extra field such as `metadata.unexpected`.
2. Call `readDocument(<temp-dir>)`.
3. **Expected:** validation fails and the error names the unexpected field rather than silently ignoring it.

### Invalid JSON includes document-path context

1. Create a temp workspace and write malformed JSON to `resume.sfrb.json`.
2. Call `readDocument(<temp-dir>)`.
3. **Expected:** the error states that `resume.sfrb.json` is not valid JSON and includes the document path.

### Broken semantic-to-layout links are rejected

1. Create a temp workspace and write a structurally valid document whose frame references a missing `blockId`.
2. Call `readDocument(<temp-dir>)`.
3. **Expected:** validation fails with a path like `layout.frames.0.blockId` and explains that the frame references a missing semantic block.

## Failure Signals

- `schema.json` drift causes `npm run schema:check` to fail.
- A supposed valid workspace document fails under the matching physics mode.
- A mismatched physics case passes when it should fail.
- Failure text omits the document path, config path, or field path, making the diagnostics non-actionable.
- Unknown keys are silently accepted.
- Missing `sfrb.config.json` does not produce an explicit workspace-setup message.

## Requirements Proved By This UAT

- R004 — the workspace-level physics contract is real at the document boundary because matching and mismatched config/document pairs are accepted or rejected differently.

## Not Proven By This UAT

- R003 — no local server, browser session, or file-watching bridge is exercised here.
- R001 — no direct editing, selection, drag behavior, or property inspector workflow is exercised here.
- R006 — no overflow detection or AI preview workflow is exercised here.

## Notes for Tester

- Prefer the existing automated checks (`tests/document/*.test.ts` and `scripts/verify-s02-document-smoke.mjs`) as the fastest truth source.
- Use `readDocument()` when checking the pure schema/file boundary and `readWorkspaceDocument()` when checking physics-aware workspace behavior.
- If a manual fixture fails unexpectedly, compare it against the passing shapes in `tests/document/document-schema.test.ts` and `tests/document/document-validation.test.ts`; the schema is intentionally strict.
