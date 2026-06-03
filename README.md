# SfRB

SfRB — **Straightforward Resume Builder** — is a local-first resume editor with a CLI, browser editor, canonical JSON document model, PDF export, templates, and optional AI layout suggestions.

The goal is simple: make resumes feel as editable as a document, as controllable as a design file, and as auditable as source code.

## What works today

- `sfrb init` creates a local resume workspace with `sfrb.config.json` and `resume.sfrb.json`.
- `sfrb open` launches a local bridge and browser editor for that workspace.
- `sfrb export` renders a chrome-free PDF from the same canonical document model used by the editor.
- `sfrb template list/show/apply` manages first-party templates from the CLI.
- The browser editor supports document-mode inline editing, design-mode frame editing/dragging, overflow measurement, template selection, and browser export.
- The shared `/print` presentation surface powers both preview and artifact export.
- The layout consultant can propose overflow fixes, show a ghost preview, and persist accepted changes through the same canonical write path as manual edits.
- API keys stay in environment variables and are never sent to the browser.
- CI builds, checks the generated schema, and runs the test suite on every PR to `main`.

## Why SfRB exists

Most resume tools force one of three bad tradeoffs:

- document editors are easy to write in but weak on layout control;
- design tools give precise layout but become brittle when content changes;
- AI resume tools suggest edits without a trustworthy local source of truth.

SfRB is built around a different contract:

1. keep the resume in a validated local JSON document;
2. expose both document-style and design-style editing;
3. export from a clean presentation surface, not from editor chrome;
4. let AI propose changes, but never bypass local validation or explicit user acceptance.

## Quick start

### Requirements

- Node.js `>=20`
- npm
- Chromium via Playwright for browser/export tests and PDF export

### Install

```bash
npm install
npm run test:setup:browsers
```

### Configure AI suggestions

AI suggestions are optional. SfRB defaults new AI-enabled workspaces to DeepSeek because `deepseek-v4-flash` is cheap, fast, and supports JSON output.

```bash
cp .env.example .env
# edit .env and set DEEPSEEK_API_KEY
```

Or export the key directly before launching the bridge:

```bash
export DEEPSEEK_API_KEY="your_key_here"
```

Default AI settings:

```json
{
  "ai": {
    "provider": "deepseek",
    "apiKeyEnvVar": "DEEPSEEK_API_KEY"
  }
}
```

The consultant uses:

- DeepSeek OpenAI-compatible base URL: `https://api.deepseek.com`
- default model: `deepseek-v4-flash`
- optional model override: `SFRB_CONSULTANT_DEEPSEEK_MODEL`
- optional local/stub endpoint override: `SFRB_DEEPSEEK_BASE_URL`

OpenAI and Anthropic remain supported when a workspace explicitly configures them.

## CLI usage

Build first so the CLI exists in `dist/`:

```bash
npm run build
node dist/cli.js --help
```

Create and open a workspace:

```bash
mkdir my-resume
cd my-resume
node /path/to/SfRB/dist/cli.js init --starter template --physics document --provider deepseek --api-key "$DEEPSEEK_API_KEY"
DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" node /path/to/SfRB/dist/cli.js open
```

Export a PDF:

```bash
node /path/to/SfRB/dist/cli.js export --cwd /path/to/my-resume --output /path/to/resume.pdf
```

Manage templates:

```bash
node /path/to/SfRB/dist/cli.js template list
node /path/to/SfRB/dist/cli.js template show modern
node /path/to/SfRB/dist/cli.js template apply modern --cwd /path/to/my-resume
```

First-party templates currently shipped with the build:

- `default` — byte-stable baseline template
- `classic` — serif resume style
- `modern` — sans-serif resume style

## Development commands

```bash
npm run build              # TypeScript build + bridge runtime copy
npm test                   # Vitest suite
npm run test:web           # Browser/editor-focused tests
npm run verify:package     # Pack, install into a temp project, and smoke-test installed CLI init/template/export
npm run verify:smoke       # Build + bridge/editor/layout consultant smoke checks
npm run schema:generate    # Regenerate schema.json from source
npm run schema:check       # Assert schema.json is current
```

## Project shape

Key files and boundaries:

- `src/cli.ts` — CLI entrypoint
- `src/commands/init.ts` — workspace initialization
- `src/commands/open.ts` — local bridge startup
- `src/commands/export.ts` — PDF export through the shared print surface
- `src/commands/template.ts` — template list/show/apply CLI
- `src/config/schema.ts` — workspace config contract and provider/env-var mapping
- `src/bridge/server.mjs` — browser bridge runtime
- `src/agent/LayoutConsultant.ts` — AI provider boundary and local proposal validation
- `src/document/` — canonical document schema, validation, starters, templates, and persistence
- `web/` — browser editor UI, bridge client, printable presentation surface, and template styles
- `tests/` — CLI, bridge, document, and browser contract tests
- `scripts/verify-*.mjs` — smoke and milestone verification scripts
- `schema.json` — generated document schema artifact
- `ROADMAP.md` — current roadmap and contribution lanes
- `docs/history/gsd/` — archived historical planning notes from the old `.gsd` workflow

Canonical workspace files:

- `sfrb.config.json` — workspace settings, including provider metadata and physics mode
- `resume.sfrb.json` — canonical resume document

Runtime contracts:

- browser state is reconciled from `/__sfrb/bootstrap`
- browser mutations persist through `/__sfrb/editor`
- AI layout proposals are requested through `/__sfrb/consultant`
- print/export rendering is served from `/print`
- provider secrets stay in environment variables
- the browser must never receive raw provider secrets or auth headers

## Planning and roadmap

SfRB has moved off the old `.gsd` planning workflow. Current planning should live in plain Markdown and GitHub issues/PRs:

- [`ROADMAP.md`](./ROADMAP.md) — contributor-facing roadmap, shipped milestones, next work, and contribution lanes
- GitHub issues — scoped feature/fix/docs tasks
- PR descriptions — implementation notes, verification evidence, and design rationale
- [`docs/history/gsd/`](./docs/history/gsd/) — read-only historical planning archive

Do not add new planning under `.gsd/`.

## Contribution expectations

Good changes usually:

- preserve the canonical local document model;
- keep `/__sfrb/bootstrap`, `/__sfrb/editor`, `/__sfrb/consultant`, and `/print` stable unless explicitly changing those contracts;
- avoid leaking secrets into logs, browser payloads, committed config, or screenshots;
- include the lightest sufficient tests or verification;
- update `ROADMAP.md` or focused docs when project state materially changes.

High-value next contributions:

- editor UX polish that makes the document canvas primary;
- lower-flake browser tests and bridge smoke checks;
- additional resume templates and template accessibility checks;
- deterministic export verification across more document shapes;
- accessibility and keyboard/focus improvements;
- packaging/distribution polish for a better open-source install path.

Avoid large framework churn, secret handling changes, or UI rewrites that bypass the document-vs-design physics model.

## Branch hierarchy

SfRB uses a simple open-source maintainer workflow:

```txt
feature/fix/docs branch -> main
```

- `main` should always be usable.
- Every PR targets `main` directly.
- GitHub Actions is the quality gate.
- Use draft PRs for work-in-progress.
- Cut releases/tags when a polished milestone is ready.

Before merging, run at least:

```bash
npm run build
npm run schema:check
npm run verify:package
npm test
```

## License

This repository is licensed under the **Apache License 2.0**. See [`LICENSE`](./LICENSE).
