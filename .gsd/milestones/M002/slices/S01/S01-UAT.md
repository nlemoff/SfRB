# S01: Template Starts & First-Run Guidance — UAT

**Milestone:** M002
**Written:** 2026-03-15

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: S01 is mostly an integration slice. The important proof is the shipped local runtime: real `dist/cli.js init`, real `dist/cli.js open`, truthful first-run guidance sourced from canonical workspace/bootstrap state, and a real edit that persists back to `resume.sfrb.json` without AI setup.

## Preconditions

- Node 20+ is installed.
- Project dependencies are installed.
- `npm run build` has completed successfully.
- A terminal is available to run `dist/cli.js` commands.
- A local browser is available for manual checks.
- You can create temporary directories under `/tmp` or another writable local path.

## Smoke Test

1. Create a temp directory and run:
   - `node dist/cli.js init --cwd <tmpdir> --starter template --physics document --skip-ai`
   - `node dist/cli.js open --cwd <tmpdir> --port 4312 --no-open`
2. Open `http://127.0.0.1:4312/`.
3. **Expected:**
   - `[data-testid="first-run-guidance"]` is visible
   - `#starter-kind` shows `template`
   - `#workspace-ai-status` shows `skipped`
   - the shell includes text/tile/freeform guidance and does not crash when AI is unavailable

## Test Cases

### 1. Template starter init creates a real editable workspace with AI skipped

1. Run `node dist/cli.js init --cwd <template-tmp> --starter template --physics document --skip-ai`.
2. Inspect the command output JSON.
3. Open `<template-tmp>/sfrb.config.json` and `<template-tmp>/resume.sfrb.json`.
4. **Expected:**
   - init succeeds without asking for provider credentials
   - output includes `workspace.physics: "document"`
   - output includes `workspace.starter.kind: "template"`
   - output includes `workspace.starter.id: "starterTemplateV1"`
   - output includes `ai.status: "skipped"`
   - `resume.sfrb.json` contains `metadata.starter.kind: "template"` and `metadata.starter.id: "starterTemplateV1"`
   - `sfrb.config.json` is valid without an `ai` block

### 2. Blank starter init creates a sparse but valid starter workspace

1. Run `node dist/cli.js init --cwd <blank-tmp> --starter blank --physics design --skip-ai`.
2. Inspect the command output JSON.
3. Open `<blank-tmp>/resume.sfrb.json`.
4. **Expected:**
   - output includes `workspace.physics: "design"`
   - output includes `workspace.starter.kind: "blank"`
   - output includes `workspace.starter.id: "starterBlankV1"`
   - output includes `ai.status: "skipped"`
   - the document is intentionally sparse but schema-valid
   - starter metadata in the document matches the init summary

### 3. Guidance-first browser shell reflects canonical starter and AI state for template start

1. Start `node dist/cli.js open --cwd <template-tmp> --port 4313 --no-open`.
2. Visit `http://127.0.0.1:4313/__sfrb/bootstrap` and inspect the JSON.
3. Visit `http://127.0.0.1:4313/` in the browser.
4. **Expected:**
   - bootstrap returns `status: "ready"`
   - bootstrap includes `starter.kind: "template"` and `starter.id: "starterTemplateV1"`
   - bootstrap includes `ai.status: "skipped"`
   - `[data-testid="first-run-guidance"]` is visible
   - `#starter-kind` shows `template`
   - `#starter-id` shows `starterTemplateV1`
   - `#workspace-ai-status` shows `skipped`
   - `#workspace-ai-note` explains AI is skipped but editing still works
   - the shell explains when to use text, tile, and freeform without claiming those later-slice mechanics already exist

### 4. Replacing template starter content persists through the canonical save/refetch loop

1. With the template workspace open in the browser, replace visible starter text with a unique string such as `Pat Morgan — shipped S01 proof`.
2. Wait for save to complete.
3. Refresh the page.
4. Re-open `http://127.0.0.1:4313/__sfrb/bootstrap` and inspect `<template-tmp>/resume.sfrb.json`.
5. **Expected:**
   - the edited text remains visible after refresh
   - save status returns to idle after the write completes
   - the same edited text appears in canonical bootstrap payload data and in `resume.sfrb.json`
   - starter metadata remains intact after editing

### 5. Blank starter guidance is distinct and still degrades cleanly with AI skipped

1. Start `node dist/cli.js open --cwd <blank-tmp> --port 4314 --no-open`.
2. Open `http://127.0.0.1:4314/`.
3. Inspect the guidance shell and consultant panel state.
4. **Expected:**
   - `[data-testid="first-run-guidance"]` is visible
   - `#starter-kind` shows `blank`
   - `#starter-id` shows `starterBlankV1`
   - the guidance copy is oriented toward starting from scratch rather than replacing a full template
   - `#consultant-panel[data-consultant-state="unavailable"]` is visible
   - `#consultant-panel[data-consultant-code="skipped"]` is visible
   - the page remains usable for normal editing despite AI being unavailable

### 6. Configured-AI init path is still preserved and redacted

1. Choose a disposable temp directory.
2. Run `node dist/cli.js init --cwd <configured-tmp> --starter template --physics document --provider openai --env-var OPENAI_API_KEY` using the project’s supported non-interactive configured path.
3. Inspect the command output and resulting files.
4. **Expected:**
   - init succeeds and writes both `sfrb.config.json` and `resume.sfrb.json`
   - output reports `ai.status: "configured"`
   - output may show provider name and env-var key name, but never prints the secret value
   - `.gitignore` protects `sfrb.config.json` as expected
   - starter metadata still reflects the selected starter in `resume.sfrb.json`

## Edge Cases

### Wrong starter variant persisted

1. Run `init` for `--starter blank`, then inspect both init output and `resume.sfrb.json`.
2. **Expected:** Starter kind/id agree across CLI summary, document metadata, and `/__sfrb/bootstrap`. Any mismatch is a failure because downstream slices rely on starter identity as canonical state.

### AI intentionally skipped vs misconfigured

1. Open an AI-skipped starter workspace.
2. Inspect `#workspace-ai-status`, `#workspace-ai-note`, and `#consultant-panel` data attributes.
3. **Expected:** The UI reports a deliberate skipped/unavailable state, not a generic crash, silent absence, or misleading idle state.

### Save/refetch after replacing starter text

1. Edit starter content, then refresh the browser or re-read `/__sfrb/bootstrap`.
2. **Expected:** The new text persists and the shell still reflects the same starter metadata and workspace AI state after reconciliation.

## Failure Signals

- `sfrb init --skip-ai` fails or still demands provider credentials.
- `resume.sfrb.json` is missing after successful init.
- Starter metadata differs between init summary, document file, and `/__sfrb/bootstrap`.
- The browser shell shows only diagnostics and no first-run guidance surface.
- Text/tile/freeform copy overclaims later-slice functionality or disappears entirely.
- AI-skipped workspaces crash the shell or leave no inspectable unavailable/skipped state.
- Replacing starter content appears in the browser temporarily but does not survive refresh or disk inspection.
- Any output or UI surface prints a secret value instead of only provider/env-var identifiers.

## Requirements Proved By This UAT

- R010 — A non-technical user can create a workspace without AI setup, open it, replace starter content, and get immediate basic value through the shipped runtime.
- R007 — The product now ships one real template start and one real blank start through the canonical workspace path, even though later slices still deepen the tile semantics behind that start.
- R008 — The browser provides explicit first-run direction for text, tile, and freeform editing lenses sourced from canonical workspace state.

## Not Proven By This UAT

- Canonical structured editor actions for CLI/browser parity beyond the existing editor loop.
- Real text-mode, tile-mode, and freeform-mode mechanics or reconciliation behavior; S01 only proves the first-run guidance and starter entry path.
- Full milestone-level visual polish; S01 advances the shell presentation, but broader sleek/minimalist quality still depends on later slices.

## Notes for Tester

- The fastest executable proof is still:
  - `npm test -- --run tests/document/starter-documents.test.ts`
  - `npm test -- --run tests/cli/init-command.test.ts`
  - `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
  - `node scripts/verify-s01-first-run.mjs`
- The most trustworthy diagnostics are the init JSON summary, `resume.sfrb.json` starter metadata, `/__sfrb/bootstrap`, and the stable first-run shell ids/test ids.
- If the shell copy looks right but persistence is questionable, trust the file bytes and bootstrap payload over the visible UI alone.