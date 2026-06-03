# S04: Canvas Editor Foundation — UAT

**Milestone:** M001
**Written:** 2026-03-14

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: S04 is an integration-heavy slice. The important proof is the real built `sfrb open` runtime plus targeted browser interaction checks that confirm document-mode editing, design-mode dragging, and invalid-mutation diagnostics against the canonical local document.

## Preconditions

- Node 20+ is installed.
- Project dependencies are installed.
- `npm run build` has completed successfully.
- A workspace exists with both:
  - `sfrb.config.json`
  - `resume.sfrb.json`
- For document-mode tests, the workspace uses `workspace.physics: "document"` and `layout.frames: []`.
- For design-mode tests, the workspace uses `workspace.physics: "design"` and every semantic block has a linked frame.
- A local browser is available if running the interaction checks manually.

## Smoke Test

1. Run `node dist/cli.js open --cwd <workspace> --port 4312 --no-open`.
2. Open `http://127.0.0.1:4312/`.
3. Confirm the shell loads, shows the workspace/document metadata, and renders the editor canvas for the workspace’s physics mode.
4. **Expected:**
   - document workspaces show editable content with no drag handles
   - design workspaces show a positioned frame with one drag handle
   - `#editor-save-status` starts at `idle`

## Test Cases

### 1. Document-mode inline editing persists without losing the active textarea

1. Seed a workspace with `workspace.physics: "document"`, one page, one section, one paragraph block, and no layout frames.
2. Run `node dist/cli.js open --cwd <document-workspace> --port 0 --no-open` and open the reported URL.
3. Click the rendered block.
4. Type replacement text into `#editor-active-textarea`.
5. Wait for the save cycle to settle.
6. **Expected:**
   - `#editor-canvas[data-physics-mode="document"]` is visible
   - `#editor-drag-affordance-status[data-drag-affordances="absent"]`
   - the active element remains `#editor-active-textarea` through the save/refetch cycle
   - `#bridge-last-signal` shows `sfrb:bridge-update`
   - after blur, the textarea closes cleanly and `resume.sfrb.json` contains the new block text
   - `layout.frames` stays empty on disk

### 2. Design-mode frame dragging persists canonical geometry

1. Seed a workspace with `workspace.physics: "design"`, one semantic paragraph block, one page, and one linked frame at `x:36, y:48, width:540, height:96`.
2. Run `node dist/cli.js open --cwd <design-workspace> --port 0 --no-open` and open the reported URL.
3. Click the frame once to select it.
4. Drag the dedicated handle by roughly `+44px` on x and `+28px` on y.
5. Wait for the save cycle to settle.
6. **Expected:**
   - `#editor-canvas[data-physics-mode="design"]` is visible
   - `#editor-drag-affordance-status[data-drag-affordances="present"]`
   - `#editor-selected-frame[data-selected-frame-id="summaryFrame"]`
   - the frame element reports `data-frame-x="80"` and `data-frame-y="76"`
   - `#editor-selected-frame-box[data-frame-box]` reflects the updated coordinates
   - `resume.sfrb.json` persists the frame box at `x:80, y:76, width:540, height:96`

### 3. Design-mode text editing stays linked after a drag

1. Use the same design-mode workspace from test case 2 after a successful drag.
2. Double-click inside the frame body (not the drag handle).
3. Type replacement text into `#editor-active-textarea`.
4. Wait for the save cycle to settle, then blur the textarea.
5. **Expected:**
   - text editing starts inside the dragged frame
   - the frame remains selected
   - `#editor-save-status[data-save-state="idle"]` after the save completes
   - `resume.sfrb.json` contains the new paragraph text
   - the frame remains linked to the same block and keeps the dragged geometry

### 4. Invalid browser mutation is rejected without corrupting canonical state

1. Start `node dist/cli.js open --cwd <document-workspace> --port 0 --no-open`.
2. Fetch `/__sfrb/bootstrap` and record the last good canonical payload.
3. POST a physics-invalid candidate document to `/__sfrb/editor` (for example: inject a frame into a `document`-mode workspace).
4. Fetch `/__sfrb/bootstrap` again.
5. **Expected:**
   - `/__sfrb/editor` returns HTTP `409`
   - the response includes a stable error code/name and path-aware issues
   - the follow-up bootstrap request still returns the last good canonical state
   - `resume.sfrb.json` on disk is unchanged by the rejected write

### 5. Affordance split is mode-specific and visible

1. Open a document-mode workspace and note the editor state.
2. Open a design-mode workspace and note the editor state.
3. **Expected:**
   - document mode exposes inline text editing but no drag handle UI
   - design mode exposes drag handles and selected-frame diagnostics
   - both modes keep the same shell-level save/error diagnostics and bootstrap preview surface

## Edge Cases

### Save-triggered refetch during document editing

1. While editing in document mode, pause after typing but before blurring.
2. **Expected:** The textarea survives the save/refetch cycle and focus is not destroyed by a full canvas rerender.

### Drag input persists through the canonical write boundary

1. In design mode, drag the frame and wait for save completion.
2. **Expected:** The browser-local frame position matches the persisted `resume.sfrb.json` geometry after bootstrap refetch; it does not snap back to stale coordinates.

### Physics-invalid mutation stays observable

1. Submit a candidate document that violates the current workspace physics.
2. **Expected:** The bridge returns a path-aware rejection, `#editor-save-error` can surface the failure, and the last good bootstrap state remains inspectable.

## Failure Signals

- `/__sfrb/editor` returns HTML or a generic server error instead of structured JSON.
- `#editor-save-status` gets stuck away from `idle` after the interaction settles.
- Document mode renders frame handles or reports drag affordances as present.
- Design mode cannot select a frame or the dragged coordinates fail to persist to disk.
- The active textarea disappears during a document-mode save/refetch cycle.
- A rejected mutation changes `resume.sfrb.json` or the next bootstrap payload.

## Requirements Proved By This UAT

- R004 — The browser editor supports mode-aware editing: document-mode inline text editing and design-mode frame dragging with linked text editing.
- R001 (partial) — Browser edits and drag mutations flow through the canonical local document path without state drift.

## Not Proven By This UAT

- AI overflow detection, ghost previews, or accept/reject consultant proposals.
- Large-document performance characterization beyond the slice’s current smoke/runtime checks.
- Multi-user or remote synchronization behavior.

## Notes for Tester

- For the fastest executable proof, run:
  - `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
  - `npm test -- --run tests/web/editor-document-mode.test.ts`
  - `npm test -- --run tests/web/editor-design-mode.test.ts`
  - `node scripts/verify-s04-editor-smoke.mjs`
- A rejected mutation returning HTTP `409` is expected behavior for the invalid-write path.
- The most trustworthy diagnostics remain the bridge payloads and stable DOM ids (`#editor-save-status`, `#bridge-last-signal`, selected block/frame ids), not just visual appearance.
