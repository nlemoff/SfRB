---
estimated_steps: 4
estimated_files: 5
---

# T01: Add canonical starter document factories and starter metadata

**Slice:** S01 — Template Starts & First-Run Guidance
**Milestone:** M002

## Description

Close the document-boundary risk first by defining starter workspaces as canonical document outputs instead of UI fixtures. This task should produce one reusable starter factory that emits both the strong template resume and the sparse blank canvas, plus durable starter metadata that survives through schema validation and later action targeting.

## Steps

1. Inspect the current document schema and validation boundary to choose the smallest safe place for starter identity metadata without creating browser-only state.
2. Add a production starter module that generates `template` and `blank` documents for both `document` and `design` physics using stable ids and the existing smallest-valid-document pattern.
3. Update shared workspace test helpers to consume the production starter factory rather than keeping duplicate hand-written starter document shapes.
4. Add document-level coverage proving starter metadata, schema validity, and physics validity for both starter variants and both physics modes.

## Must-Haves

- [ ] The canonical document can identify whether it came from the shipped template or blank starter.
- [ ] The blank starter remains intentionally sparse but passes schema and physics validation.
- [ ] The template starter has stable ids/content strong enough to support later targeting and first-run editing.

## Verification

- `npm test -- --run tests/document/starter-documents.test.ts`
- Confirm the test exercises both starter variants under both physics modes and fails if starter metadata or validation rules drift.

## Observability Impact

- Signals added/changed: starter identity becomes inspectable in canonical document state.
- How a future agent inspects this: read `resume.sfrb.json` from a created workspace or run `tests/document/starter-documents.test.ts`.
- Failure state exposed: wrong starter variant, invalid blank/template shape, or physics-specific frame mismatch becomes localizable at the document boundary.

## Inputs

- `src/document/schema.ts` — current canonical document contract and strict metadata boundary.
- `src/document/validation.ts` — physics-specific rules the starter factory must satisfy.
- `tests/utils/bridge-browser.ts` — existing smallest-valid workspace fixture to collapse into the production starter path.

## Expected Output

- `src/document/starters.ts` — production starter factory for template and blank variants.
- `src/document/schema.ts` — starter metadata contract added to the canonical document model.
- `tests/document/starter-documents.test.ts` — executable proof of starter validity and stable metadata.
- `tests/utils/bridge-browser.ts` — helpers reusing the production starter factory instead of hand-rolled starter JSON.
