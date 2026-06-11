# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SfRB (Straightforward Resume Builder) is a local-first, CLI-first resume editor. The `sfrb` CLI spawns a Vite-backed local bridge that serves a React editor in the browser. One canonical `resume.sfrb.json` is the only authoritative document state.

Current focus: keep `main` usable, preserve the canonical document/edit/export/template contracts, and use `ROADMAP.md` + GitHub issues/PRs for active planning.

## Commands

```bash
npm run build                    # tsc -p tsconfig.json + copy bridge runtime into dist/
npm test                         # vitest run (full suite)
npm run test:web                 # vitest run tests/web — needs Playwright Chromium
npm run test:setup:browsers      # playwright install chromium (one-time)
npm run verify:smoke             # build + editor, consultant, CLI edit, tile, freeform, reconciliation smokes
npm run schema:generate          # regenerate schema.json from Zod schemas
npm run schema:check             # assert schema.json matches Zod source

npx vitest run path/to/file.test.ts        # single file
npx vitest run -t "name fragment"          # filter by test name
node scripts/verify-s01-print-surface.mjs  # verifiers run standalone
```

CLI (after build): `node dist/cli.js {init|open|edit|export|template} [...]`. `edit --list-ops` prints the structured operation vocabulary.

## Architecture

The whole product is one canonical document boundary, mediated by a local HTTP bridge.

- **CLI** (`src/cli.ts` + `src/commands/{init,open,edit,export,template}.ts`) — Commander entry; compiles to CommonJS in `dist/`.
- **Bridge** (`src/bridge/server.mjs`) — ESM Vite dev server; uses `createRequire` to load compiled CJS modules from `dist/`. Owns all disk I/O.
- **Operations** (`src/document/operations/`) — the 13-operation structured mutation vocabulary (Zod schemas, pure `applyEditorOperation`, and `runWorkspaceOperation`) shared verbatim by the bridge `{operation}` route and `sfrb edit`.
- **Web UI** (`web/src/`) — DOM-first editor: `App.tsx` orchestrates `shell/` (markup, styles, lens switcher, panels, reconciliation dialog, inspector) and `editor/canvas/` (flow/tile/freeform surfaces, pointer, overflow, text-editing controllers) around `editor/engine.ts` (selection, lenses, drafts, op-emitting commit queue), plus the printable surface (`print-main.tsx`, `print.html`, `presentation/`).
- **Document model** (`src/document/`) — Zod schema, store, validation, starter workspaces.
- **Config** (`src/config/`) — Zod-validated `sfrb.config.json`, including AI provider metadata + workspace physics mode.
- **Layout consultant** (`src/agent/LayoutConsultant.ts`) — provider boundary for AI overflow proposals.

### Bridge HTTP contract (load-bearing)

- `GET /__sfrb/bootstrap` — browser reconciles full state from here. Bridge update events are *invalidation signals*, not authoritative payloads.
- `POST /__sfrb/editor` — all browser mutations, as exactly one of `{document}` (full document) or `{operation}` (structured op). Schema + physics validation runs here before any write to `resume.sfrb.json`; invalid operations return 400 `operation_invalid` with path-aware issues and never write.
- `POST /__sfrb/consultant` — AI proposals. Provider secrets and raw provider responses must stay bridge-side; the browser only sees validated proposal payloads or sanitized failures.

### Editor invariants worth knowing

- The canvas keeps its serif pinned to Times New Roman: overflow-measurement expectations across tests and smokes are tuned to those text metrics.
- Ids and `data-testid`s referenced by `tests/` and `scripts/verify-*.mjs` are a frozen contract — relocate elements freely, never rename or drop them.
- The vitest global setup builds `dist/` once before workers start; tests must never rebuild it mid-suite.
- One-page contract: overflow gates export rather than paginating. `placement: 'free'` frames and locked group members reject individual `set-frame-box` moves at the op layer.

### Canonical workspace files

- `resume.sfrb.json` — the document. Never write to it except through the editor route's validated path.
- `sfrb.config.json` — workspace config (physics mode, provider metadata). Provider API keys live in env vars referenced by config, never in the file itself.

## Project-specific rules

- **Don't bypass the canonical write path.** Mutations go through `/__sfrb/editor`. Direct writes from CLI commands or the browser break validation guarantees.
- **Zod-first.** Define the schema, infer the TS type, validate at boundaries (CLI args, file content, bridge requests).
- **CLI parity.** Every meaningful editor or export action must be representable as a structured operation invokable from the CLI — even if the browser is the primary UX.
- **No provider secrets in the browser or in committed config.** Bridge reads env vars; browser sees only sanitized payloads.
- **Bridge file is `.mjs`** and loads compiled CJS via `createRequire`. Run `npm run build` before running the bridge against `src/` changes.
- **Historical planning archive** lives under `docs/history/gsd/`. It is reference material only; do not add new active planning there.

## Planning source of truth

Active planning lives in plain Markdown plus GitHub issues/PRs:

- `ROADMAP.md` — current state, next work, and contribution lanes
- `README.md` — contributor quick start and project overview
- GitHub issues — scoped future work
- PR descriptions — implementation notes and verification evidence

Historical planning artifacts from the old workflow live under `docs/history/gsd/` for reference only. Do not create new `.gsd/` planning files.

---

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
