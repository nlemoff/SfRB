# S07 — Research

**Date:** 2026-03-16

## Summary

S07 owns the remaining active gap in **R009** and the primary product-feel work for **R011**. The codebase already has the hard part of action parity: `src/editor/actions.ts` defines one discriminated union for every meaningful editor mutation, `src/bridge/server.mjs` already applies those actions through `applyEditorActionWithResult()`, and the browser tests/scripts prove the web UI is posting structured actions instead of browser-only document rewrites. What is missing is a **direct CLI command** that invokes that same canonical action layer without going through the browser, plus final shell polish that demotes dev-facing surfaces from the default experience.

This is a **targeted** slice, not a greenfield architecture slice. The best path is to add one generic CLI editing surface that accepts canonical action payloads and routes them through the same parse/apply/physics-validation/write boundary the bridge uses today, then separately simplify the browser shell in `web/src/App.tsx` while preserving hidden/stable observability selectors for tests and future agents. The browser already contains the right product-polish seam: text mode hides diagnostics/bridge/consultant chrome, so S07 can extend that “secondary when needed, calm by default” posture rather than inventing a new UI architecture.

## Recommendation

Implement S07 in two mostly independent tracks:

1. **CLI parity first**: add a new generic command (best fit: `sfrb edit` or `sfrb action`) that accepts a canonical action payload as JSON (prefer `--action`, `--action-file`, and/or stdin), applies it with the shared editor action engine, validates against workspace physics, writes `resume.sfrb.json`, and prints a concise outcome-oriented summary by default. Add an opt-in machine-readable mode (`--json`) if execution wants automation-friendly output, but keep the default short per S07 context.
2. **Shell polish second**: use `web/src/App.tsx` as the main product-polish surface. Demote technical panels (`Diagnostics`, payload preview, bridge status, AI details) behind a secondary disclosure or “inspect workspace” affordance instead of showing them as first-class product chrome. Preserve existing IDs/testids and hidden-state observability instead of deleting them; that matches D034 and the current testing style.

The important implementation choice is **not** to hand-roll a second mutation path inside the CLI command. Extract or reuse the bridge’s current “read current document → parse action → apply action → physics-validate → write document → return action/reconciliation metadata” flow. If the command re-implements that logic separately, parity will drift the next time a new canonical action or validation rule lands.

## Implementation Landscape

### Key Files

- `src/cli.ts` — current CLI entrypoint; only registers `init` and `open`. S07 needs to register the new editing command here.
- `src/commands/open.ts` — current Commander command pattern for runtime commands. Good reference for option parsing, result typing, and user-facing output style.
- `src/commands/init.ts` — current non-interactive/interactive command with concise summary output. Best existing pattern for how S07 CLI output should balance human readability with JSON-ish detail.
- `src/editor/actions.ts` — source of truth for canonical editor action parsing and application. Current action surface includes:
  - `replace_block_text`
  - `insert_block`
  - `remove_block`
  - `move_block`
  - `move_section`
  - `set_frame_box`
  - `split_block`
  - `create_frame_group`
  - `remove_frame_group`
  - `set_frame_group_locked`
  - `translate_frame_group`
  - `reconcile_freeform_exit`
- `src/document/validation.ts` — physics guardrail after action application. Direct CLI edits must still fail on document/design mismatches exactly like the bridge.
- `src/document/store.ts` / `src/config/store.ts` — workspace read/write boundaries and path helpers. Use these instead of custom fs logic.
- `src/bridge/server.mjs` — already contains the real mutation pipeline in `resolveMutationDocument()` / `validateMutationDocument()`. This is the best extraction seam for shared CLI+bridge mutation application.
- `web/src/bridge-client.ts` — mirrors the same action union the browser submits. Good reference when deciding CLI input shape and success/error output fields.
- `web/src/App.tsx` — main shell markup and the strongest S07 polish seam. Today it still renders a large diagnostics-heavy shell (`#bridge-status`, `#workspace-ai-panel`, `#consultant-panel`, `#editor-save-status`, `#diagnostics-panel`, payload preview). It already hides some of this in Text lens via `syncLensSurface()`, so demotion can build on an existing pattern.
- `web/src/editor/Canvas.tsx` — already hides tile/tool affordances in Text lens and preserves stable hidden testids. Useful if execution wants additional calm-mode reductions without deleting observability.
- `tests/bridge/bridge-editor-contract.test.ts` — definitive contract proof that the bridge action route already persists every canonical action shape one action at a time.
- `tests/web/editor-text-mode.test.ts`, `tests/web/editor-freeform-mode.test.ts`, `tests/web/editor-mode-reconciliation.test.ts` — strong evidence of what the browser currently emits and which selectors must remain inspectable.
- `tests/cli/open-command.test.ts` / `tests/cli/init-command.test.ts` — patterns for new CLI command coverage.
- `tests/utils/bridge-browser.ts` — reusable helpers for build/start/open/bootstrap assertions; likely useful for a new S07 smoke verifier.
- `scripts/verify-s02-editor-actions.mjs` — existing shipped-runtime proof for bridge action persistence. Useful template for the CLI parity smoke script.
- `scripts/verify-s06-mode-reconciliation-smoke.mjs` — existing shipped-runtime proof for reconciliation actions. Good template for proving `reconcile_freeform_exit` through the new CLI path.
- `README.md` — current CLI usage only lists `init` and `open`; should be updated if S07 adds a user-facing edit/action command.

### Natural Seams

1. **Shared workspace mutation service**
   - Extract bridge mutation logic from `src/bridge/server.mjs` into a shared TS module the CLI command can import.
   - Expected API shape: “apply action to workspace root and return `{ document, physics, actionKind, reconciliation, paths }` or a normalized failure”.
   - This keeps CLI/browser parity real instead of “same schemas, different pipelines”.

2. **CLI command surface**
   - Add `src/commands/edit.ts` (or similar) and register it from `src/cli.ts`.
   - Recommended minimal useful surface: generic canonical-action submission, not 12 bespoke subcommands.
   - Input shapes worth supporting:
     - `--action '<json>'`
     - `--action-file path/to/action.json`
     - stdin fallback for automation
   - Output should default to concise “what happened” text with action kind, workspace path, and high-level result. Optional `--json` can expose full structured metadata.

3. **Product-polish shell cleanup**
   - Keep `web/src/App.tsx` as the top-level shell owner.
   - Convert raw inspection panels into secondary UI instead of first-order content.
   - Preserve IDs/testids and hidden-state semantics; tests already rely on hidden-but-present elements in multiple places.

### Build Order

1. **Extract/share the canonical workspace mutation path**
   - Highest leverage and biggest drift-prevention move.
   - Unblocks both the CLI command and any future bridge/CLI parity assertions.

2. **Ship the generic CLI edit/action command**
   - This closes the remaining R009 gap directly.
   - Start with the shared action union, not per-action flags.

3. **Add CLI-focused tests + a shipped-runtime S07 smoke verifier**
   - Prove direct CLI invocation for representative actions across text, tile, freeform, and reconciliation.
   - This should include at least one no-write failure path.

4. **Demote diagnostics-heavy browser chrome**
   - Lower risk once parity is closed.
   - Focus on `web/src/App.tsx`; only touch `Canvas.tsx` where calm-mode behavior or hidden-state observability needs to stay aligned.

5. **Update README/help text if the command is intended as user-visible**
   - Small, last-step cleanup.

### Verification Approach

- **Unit / command tests**
  - Add `tests/cli/edit-command.test.ts` (or equivalent) covering:
    - help discoverability from `dist/cli.js --help`
    - success path for `replace_block_text`
    - success path for one layout action (`set_frame_box` or `translate_frame_group`)
    - success path for `reconcile_freeform_exit`
    - invalid action/no-write behavior with actionable diagnostics
    - concise default stdout and optional structured output mode if added
- **Contract reuse**
  - Reuse representative payloads already proven in `tests/bridge/bridge-editor-contract.test.ts` rather than inventing new action shapes.
- **Shipped-runtime proof**
  - Add a new smoke script modeled after `scripts/verify-s02-editor-actions.mjs` / `scripts/verify-s06-mode-reconciliation-smoke.mjs` that:
    - builds `dist/`
    - creates a temp workspace
    - runs direct `dist/cli.js <new-command>` actions
    - optionally runs `dist/cli.js open --no-open` alongside them
    - proves the resulting state through CLI stdout + `/__sfrb/bootstrap` + `resume.sfrb.json`
- **Browser polish checks**
  - Extend existing web tests rather than creating a broad new suite unless needed.
  - Likely assertions:
    - diagnostics/payload preview are secondary/hidden by default
    - primary editing surfaces remain visible
    - existing testids still resolve
    - text lens stays especially calm

Recommended commands from this worktree:

- `npm run build`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/cli/open-command.test.ts tests/cli/init-command.test.ts tests/cli/edit-command.test.ts`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts`
- `node scripts/verify-s07-cli-parity-smoke.mjs`

## Constraints

- `src/document/validation.ts` enforces physics-specific rules after action application. CLI edits cannot bypass this or they stop matching bridge behavior.
- `src/editor/actions.ts` is the canonical action boundary; S07 should consume it directly, not define a second CLI-only action grammar.
- `web/src/App.tsx` uses inline HTML/style strings and DOM querying rather than a React component tree. Product-polish work should follow that local pattern unless execution is explicitly willing to refactor the shell.
- Existing tests rely heavily on stable IDs/testids and on elements being hidden instead of removed. Product polish must keep inspectability intact.

## Common Pitfalls

- **Duplicating bridge mutation logic inside the CLI command** — extract/share the current bridge path instead. Otherwise new actions or validation changes will drift between CLI and browser.
- **Making automation depend on shell-escaped JSON only** — support `--action-file` and/or stdin so complex payloads like `split_block` and `reconcile_freeform_exit` are practical in scripts.
- **Deleting diagnostics surfaces to make the UI look cleaner** — demote or collapse them; don’t remove the observability contract that current browser tests depend on.
- **Relying only on worktree-local Vitest defaults** — this repo’s `.gsd` worktrees need `--root /home/nlemo/SfRB/.gsd/worktrees/M002` for trustworthy targeted runs, per the knowledge register.
- **Treating browser polish as only copy changes** — the main rawness comes from shell hierarchy and visibility, not just wording. `Diagnostics`, payload preview, bridge state, and consultant panels are currently too prominent.

## Open Risks

- The S06 summary’s known test-harness mismatch (`layout: Unrecognized key: "frameGroups"`) may still affect some rooted Vitest/browser flows even though shipped-runtime smoke verifiers pass.
- If execution chooses many bespoke CLI subcommands instead of one generic action surface, scope can expand quickly and parity can become incomplete again the next time a new action lands.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Browser/product polish | `frontend-design` | available |
| Node.js CLI | `eddiebe147/claude-settings@cli-builder` | none found locally; discoverable via `npx skills find "Node.js CLI"` |
| React/browser best practices | `vercel-labs/agent-skills@vercel-react-best-practices` | none found locally; discoverable via `npx skills find "React"` |
