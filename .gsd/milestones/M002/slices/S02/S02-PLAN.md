# S02: Canonical Editor Action Model

**Goal:** Replace whole-document browser persistence with a canonical structured action boundary so meaningful editor edits are expressed as stable mutations over the resume model, validated through the existing bridge/document seam, and ready for future CLI parity.
**Demo:** Through the shipped runtime, a template or blank starter workspace can accept a structured text-edit action and a structured frame-box action, persist both through `/__sfrb/editor` without bypassing schema/physics validation, keep current browser editing behavior intact, and expose one shared action contract that later CLI commands can invoke.

This slice is sequenced around the real risk: today the editor already knows its meaningful intents, but the canonical persistence surface is still the entire document blob. The plan therefore starts by defining the intent-level contract and pure application logic, then widens the bridge with backward compatibility before switching browser callers. That order retires the action-model risk without breaking the current runtime, and it gives downstream slices one extensible mutation seam instead of letting each mode invent browser-only state. S02 directly owns **R009**, so every task below is aimed at proving structured action/model parity rather than just adding helper types.

## Must-Haves

- A shared discriminated union defines the first canonical editor actions for the meaningful persisted edits that exist today: committed block text replacement and committed frame-box updates.
- A pure action application layer mutates the canonical resume document by stable ids, preserves unrelated content, and remains extensible for later tile/text/freeform actions.
- `/__sfrb/editor` accepts structured `{ action }` payloads while preserving the legacy `{ document }` path during migration, and still enforces schema plus physics validation before persistence.
- Browser commit paths use the canonical action route for text commits, frame movement commits, and consultant-accepted frame resize instead of posting full documents.
- Slice verification proves the contract at unit, bridge, browser, and built-runtime smoke levels so a future CLI surface can reuse the same action model with confidence.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-document-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- `node scripts/verify-s02-editor-actions.mjs`
- Failure-path check: submit an invalid structured action through `/__sfrb/editor` and verify the response preserves actionable path/physics diagnostics instead of silently writing malformed state.

## Observability / Diagnostics

- Runtime signals: editor action kind/payload parsing outcome, existing save-status transitions, bridge validation error shape, consultant accept path result, and canonical bootstrap/document state after action application.
- Inspection surfaces: shared action schemas/types, `applyEditorAction(...)`, `/__sfrb/editor`, `/__sfrb/bootstrap`, `resume.sfrb.json`, `tests/document/editor-actions.test.ts`, `tests/bridge/bridge-editor-contract.test.ts`, browser regression tests, and `scripts/verify-s02-editor-actions.mjs`.
- Failure visibility: a future agent can distinguish schema-invalid action payloads, unknown ids, physics-invalid resulting documents, legacy-route regressions, and browser callers that still attempt full-document writes.
- Redaction constraints: action diagnostics may expose action kind, canonical ids, starter metadata, and workspace paths, but must never expose provider secrets or unrelated local env values.

## Integration Closure

- Upstream surfaces consumed: `src/document/schema.ts`, `src/document/store.ts`, `src/document/validation.ts`, `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `web/src/editor/engine.ts`, `web/src/App.tsx`, existing starter/bootstrap contracts from S01, and current browser/runtime test helpers.
- New wiring introduced in this slice: shared action schema + pure apply layer → bridge `{ action }` parsing/application → browser commit APIs for text/frame/consultant acceptance → action-focused runtime smoke verification.
- What remains before the milestone is truly usable end-to-end: S03-S06 still need to extend this action surface for tile, text-mode, and freeform operations plus reconciliation rules, and S07 still needs explicit CLI editing commands that invoke the shared action model.

## Tasks

- [x] **T01: Define the canonical editor action contract and pure apply layer** `est:2h`
  - Why: R009 is impossible to prove until meaningful edits are modeled as stable structured actions instead of implicit whole-document rewrites.
  - Files: `src/editor/actions.ts`, `src/document/schema.ts`, `tests/document/editor-actions.test.ts`, `src/agent/LayoutConsultant.ts`
  - Do: Add a shared module with Zod-backed discriminated-union schemas, exported TS types, parsers, and a pure `applyEditorAction(document, action)` function; start narrowly with committed block-text replacement and committed frame-box updates keyed by stable ids already enforced by the canonical document schema; preserve unrelated document state; reject unknown action kinds or missing targets path-safely; and mirror existing schema style so later slices can extend the union without replacing it.
  - Verify: `npm test -- --run tests/document/editor-actions.test.ts`
  - Done when: valid actions parse and apply deterministically, invalid actions fail with actionable diagnostics, and the action module is clearly reusable by bridge, browser, and later CLI code.
- [x] **T02: Widen the bridge mutation route to accept structured actions with validation-safe persistence** `est:2h`
  - Why: The action contract does not retire slice risk until the canonical bridge can read current workspace state, apply an action, and persist through the same trusted validation boundary.
  - Files: `src/bridge/server.mjs`, `src/document/store.ts`, `src/document/validation.ts`, `tests/bridge/bridge-editor-contract.test.ts`, `web/src/bridge-client.ts`
  - Do: Update `/__sfrb/editor` request parsing so it accepts either legacy `{ document }` or canonical `{ action }`; for action payloads, read the current document from disk, apply the shared action, run the existing schema + physics validation pipeline, and persist with the normal document store; keep response/error envelopes compatible with current callers; add bridge tests for successful text/frame actions, invalid payload diagnostics, physics-invalid action rejection, bootstrap round-trip, and one retained legacy whole-document contract case during migration.
  - Verify: `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
  - Done when: structured actions persist through the bridge without creating a second source of truth, invalid actions surface actionable diagnostics, and the old document-write path still works for callers not yet migrated.
- [x] **T03: Move browser commit paths and consultant acceptance onto the shared action route** `est:3h`
  - Why: The slice promise is not real while browser editing still persists ad hoc whole-document state instead of the canonical action model that the CLI is supposed to share.
  - Files: `web/src/bridge-client.ts`, `web/src/editor/engine.ts`, `web/src/App.tsx`, `tests/web/editor-document-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, `tests/web/editor-layout-consultant.test.ts`
  - Do: Add browser bridge helpers for submitting structured editor actions; update text commit and frame-move commit code to post actions while keeping optimistic local drafting/drag state browser-local; switch consultant preview acceptance to dispatch the same canonical frame-box action instead of composing a full candidate document; preserve current save-status UX and user-visible behavior; and adjust or extend browser tests only where needed to prove the UI still behaves the same while persisting via actions.
  - Verify: `npm test -- --run tests/web/editor-document-mode.test.ts && npm test -- --run tests/web/editor-design-mode.test.ts && npm test -- --run tests/web/editor-layout-consultant.test.ts`
  - Done when: browser-initiated text edits, manual frame moves, and consultant-accepted frame resize all persist through structured actions with no user-facing regression in the real editor tests.
- [x] **T04: Add built-runtime action smoke proof and slice evidence for future CLI parity** `est:1h`
  - Why: S02 needs an operational proof that the shipped runtime can accept canonical actions end-to-end, not just unit and in-process test coverage.
  - Files: `scripts/verify-s02-editor-actions.mjs`, `tests/utils/bridge-browser.ts`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`
  - Do: Replace or supplement the misleading S02 smoke script with a built-runtime verifier that creates or opens a real workspace, sends a structured block-text action and a structured frame-box action through the running bridge, re-reads bootstrap plus on-disk state, and checks failure-path diagnostics for an invalid action; update requirement/roadmap evidence only after the operational proof passes; and keep the script focused on the canonical action boundary rather than internal helper calls.
  - Verify: `node scripts/verify-s02-editor-actions.mjs`
  - Done when: the built CLI/open runtime proves structured actions are the real persistence path, invalid-action diagnostics remain inspectable, and slice evidence is ready to advance R009 once implementation is complete.

## Files Likely Touched

- `src/editor/actions.ts`
- `src/bridge/server.mjs`
- `src/document/schema.ts`
- `src/document/store.ts`
- `src/document/validation.ts`
- `web/src/bridge-client.ts`
- `web/src/editor/engine.ts`
- `web/src/App.tsx`
- `tests/document/editor-actions.test.ts`
- `tests/bridge/bridge-editor-contract.test.ts`
- `tests/web/editor-document-mode.test.ts`
- `tests/web/editor-design-mode.test.ts`
- `tests/web/editor-layout-consultant.test.ts`
- `tests/utils/bridge-browser.ts`
- `scripts/verify-s02-editor-actions.mjs`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M002/M002-ROADMAP.md`
