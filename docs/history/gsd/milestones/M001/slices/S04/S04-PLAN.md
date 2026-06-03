# S04: Canvas Editor Foundation

**Goal:** Add a DOM-first browser editor that can mutate the canonical SfRB document, supports inline text editing in document physics, supports fixed-frame dragging in design physics, and preserves the existing CLI↔bridge↔bootstrap reconciliation contract.
**Demo:** In a configured workspace, `sfrb open` shows an editor where document-mode workspaces allow click-to-edit text and persist those edits back to `resume.sfrb.json`, while design-mode workspaces render positioned frames that can be dragged and edited without violating frame coverage rules.

This slice groups into three tasks because there are two distinct risks that need to be retired in order. First, the browser has no safe write boundary yet, so task 1 closes the contract risk by widening the client payload and adding a server-side validated mutation route before any UI starts saving. Then task 2 proves the lower-geometry half of the interaction model in document mode, where inline editing must feel native and frame dragging must stay absent. Task 3 closes the fixed-layout half by layering the design-mode frame surface, drag persistence, and a real end-to-end browser proof over the same bridge path. Requirement ownership had to be inferred because `REQUIREMENTS.md` did not exist during the original run; this slice directly advances **R001**, **R003**, and **R004**, and it lays the observable editor surface S05 will need for **R006**.

## Must-Haves

- The bridge exposes the full document/page/frame geometry the editor needs and accepts browser mutations only through a schema-valid, physics-valid write contract.
- Document-mode workspaces render blocks in semantic flow order, allow inline text editing, and do not expose draggable frame affordances.
- Design-mode workspaces render absolutely positioned frames linked to blocks, allow box dragging plus text editing, and persist geometry back to `resume.sfrb.json`.
- The editor preserves the S03 reconciliation rule: bridge events remain invalidation signals, `/__sfrb/bootstrap` remains canonical, and save/error state stays inspectable.
- Slice verification covers the real `sfrb open` path, at least one browser text-edit flow, at least one design-mode drag flow, and at least one rejected invalid mutation/failure-path signal.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-document-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs`
- Built-path failure check: run `node dist/cli.js open --cwd <temp-workspace> --port 0 --no-open`, submit one physics-invalid browser mutation, and verify the bridge surfaces a path-aware rejection while the last good bootstrap state remains inspectable.

## Observability / Diagnostics

- Runtime signals: `sfrb:bridge-update` / `sfrb:bridge-error` invalidation events, editor save lifecycle state in the browser, selected block/frame identity, and path-aware mutation validation failures from the bridge write route.
- Inspection surfaces: `/__sfrb/bootstrap`, the bridge mutation endpoint response, browser editor status ids/test ids, the named bridge/browser tests, and the smoke script.
- Failure visibility: rejected writes report why validation failed, browser state shows whether the editor is idle/saving/error, and tests assert that document-mode vs design-mode affordances differ visibly instead of failing silently.
- Redaction constraints: diagnostics may name workspace/config/document paths and physics mode but must never print secret values from `sfrb.config.json`.

## Integration Closure

- Upstream surfaces consumed: `src/bridge/server.mjs`, `src/document/store.ts`, `src/document/schema.ts`, `src/document/validation.ts`, `web/src/bridge-client.ts`, the S03 bootstrap/event contract, and the workspace `resume.sfrb.json` / `sfrb.config.json` file contracts.
- New wiring introduced in this slice: browser editor surface → validated bridge mutation route → canonical document write → watcher invalidation → bootstrap refetch reconciliation, plus mode-specific layout rendering through a shared editor engine.
- What remains before the milestone is truly usable end-to-end: S05 must add overflow detection, ghost-preview proposals, and accept/reject mutation workflows on top of this editor foundation.

## Tasks

- [x] **T01: Add the canonical editor write contract and browser test harness** `est:2h`
  - Why: The editor cannot safely exist until the browser can read full layout geometry and write through a server-side boundary that enforces both schema validity and workspace physics.
  - Files: `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `web/src/App.tsx`, `package.json`, `tests/bridge/bridge-editor-contract.test.ts`, `tests/utils/bridge-browser.ts`
  - Do: Widen the bootstrap/client types to preserve page size, margins, frame geometry, frame↔block linkage, and useful ids; add a bridge mutation route that validates candidate documents with both the document schema and `validateDocumentForPhysics()` before persisting; keep bridge events as refetch triggers instead of becoming a second state payload; and add the shared browser-capable test utilities plus a contract test that proves valid writes persist, invalid writes are rejected with actionable diagnostics, and the last canonical bootstrap state remains refetchable.
  - Verify: `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
  - Done when: the browser can fetch full editor geometry, submit a validated document mutation through the bridge, and receive a path-aware rejection for a physics-invalid mutation without corrupting `resume.sfrb.json`.
- [x] **T02: Ship document-mode inline editing on a DOM-first canvas surface** `est:3h`
  - Why: S04 is only real once a user can click into resume content, edit text naturally, and see the local JSON model change while document physics stays frame-free.
  - Files: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, `web/src/bridge-client.ts`, `tests/web/editor-document-mode.test.ts`, `scripts/verify-s04-editor-smoke.mjs`
  - Do: Introduce the editor surface and shared engine with an explicit selection/editing state model; render document physics from semantic order/reflow rather than `layout.frames`; use a native textarea/contenteditable overlay for inline text editing with blur/Enter/debounced commit instead of per-keystroke full writes; preserve caret/focus by using targeted DOM updates instead of destructive full rerenders during active edits; and add browser-level verification for click-to-edit, persisted JSON updates, and absence of drag affordances in document mode.
  - Verify: `npm test -- --run tests/web/editor-document-mode.test.ts`
  - Done when: a document-physics workspace supports click-to-edit text that persists into `resume.sfrb.json`, refetch reconciliation does not blow away the active edit prematurely, and the UI exposes no draggable frame handles in document mode.
- [x] **T03: Add design-mode frame dragging and prove the real editor path** `est:3h`
  - Why: The slice demo is incomplete until the same editor can switch to fixed-layout behavior, let the user move boxes, and prove the full open→edit→persist loop against the real runtime.
  - Files: `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, `src/bridge/server.mjs`, `tests/web/editor-design-mode.test.ts`, `scripts/verify-s04-editor-smoke.mjs`
  - Do: Render design physics pages and frames from canonical `layout.pages` / `layout.frames`, allow selecting and dragging frames while keeping the linked text editable, persist updated frame boxes through the validated mutation route, surface selected-frame/save/error diagnostics in stable UI ids, and extend the smoke/browser tests so the built `sfrb open` path proves both a successful drag save and a mode-specific affordance split between document and design workspaces.
  - Verify: `npm test -- --run tests/web/editor-design-mode.test.ts && node scripts/verify-s04-editor-smoke.mjs`
  - Done when: a design-physics workspace renders fixed frames that can be dragged and saved back to the document, document mode still refuses drag affordances, and the real CLI-opened editor path is covered by executable smoke verification.

## Files Likely Touched

- `src/bridge/server.mjs`
- `src/document/store.ts`
- `src/document/validation.ts`
- `web/src/App.tsx`
- `web/src/bridge-client.ts`
- `web/src/editor/Canvas.tsx`
- `web/src/editor/engine.ts`
- `tests/bridge/bridge-editor-contract.test.ts`
- `tests/web/editor-document-mode.test.ts`
- `tests/web/editor-design-mode.test.ts`
- `tests/utils/bridge-browser.ts`
- `scripts/verify-s04-editor-smoke.mjs`
- `package.json`
