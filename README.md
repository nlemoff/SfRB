# SfRB

SfRB — **Straightforward Resume Builder** — is a local-first resume editor with a CLI, a browser editor, and one canonical `resume.sfrb.json` document model.

The goal is simple: make resumes feel as editable as a document, as controllable as a design file, and as auditable as source code.

## What works today

- `sfrb init` creates local resume workspaces.
- `sfrb open` launches a local bridge and browser editor.
- `resume.sfrb.json` is the canonical document source of truth.
- `sfrb.config.json` stores local workspace settings, not provider secrets.
- Document mode supports inline editing.
- Design mode supports frame editing, dragging, and overflow measurement.
- The layout consultant can propose overflow fixes, show a ghost preview, and persist accepted changes through the same canonical write path as manual edits.
- API keys stay in environment variables and are never sent to the browser.

The current baseline includes the M003 export/presentation surface and the M004 template system: named templates, a template CLI, browser template selection, and assembled template export verification.

## Why SfRB exists

Most resume tools force one of three bad tradeoffs:

- document editors are easy to write in but weak on layout control;
- design tools give precise layout but become brittle when content changes;
- AI resume tools suggest edits without a trustworthy local source of truth.

SfRB is built around a different contract:

1. keep the resume in a validated local JSON document;
2. expose both document-style and design-style editing;
3. let AI propose changes, but never bypass local validation or explicit user acceptance;
4. eventually export from a clean presentation surface, not from editor chrome.

## Quick start

### Requirements

- Node.js `>=20`
- npm

### Install

```bash
npm install
```

### Configure AI suggestions

SfRB defaults new AI-enabled workspaces to DeepSeek because `deepseek-v4-flash` is cheap, fast, and supports JSON output.

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
- optional override: `SFRB_CONSULTANT_DEEPSEEK_MODEL`
- optional local/stub endpoint override: `SFRB_DEEPSEEK_BASE_URL`

OpenAI and Anthropic remain supported when a workspace explicitly configures them.

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

Browser/editor tests use Playwright. Install the browser dependency when needed:

```bash
npm run test:setup:browsers
npm run test:web
```

Smoke verification:

```bash
npm run verify:smoke
```

Schema checks:

```bash
npm run schema:generate
npm run schema:check
```

## CLI usage

Build first so the CLI exists in `dist/`:

```bash
npm run build
node dist/cli.js --help
```

Common commands:

```bash
node dist/cli.js init
node dist/cli.js open
```

Example local workspace:

```bash
mkdir my-resume && cd my-resume
node /path/to/SfRB/dist/cli.js init --starter template --physics document --provider deepseek --api-key "$DEEPSEEK_API_KEY"
DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" node /path/to/SfRB/dist/cli.js open --no-open
```

## Project shape

Key files and boundaries:

- `src/cli.ts` — CLI entrypoint
- `src/commands/init.ts` — workspace initialization
- `src/commands/open.ts` — local bridge startup
- `src/config/schema.ts` — workspace config contract and provider/env-var mapping
- `src/bridge/server.mjs` — browser bridge runtime
- `src/agent/LayoutConsultant.ts` — AI provider boundary and local proposal validation
- `src/document/` — canonical document schema, validation, starters, and persistence
- `web/` — browser editor UI
- `schema.json` — generated document schema artifact
- `.gsd/` — planning, requirements, decisions, and milestone artifacts

Canonical workspace files:

- `sfrb.config.json` — workspace settings, including provider metadata and physics mode
- `resume.sfrb.json` — canonical resume document

Runtime contracts:

- browser state is reconciled from `/__sfrb/bootstrap`
- browser mutations persist through `/__sfrb/editor`
- AI layout proposals are requested through `/__sfrb/consultant`
- provider secrets stay in environment variables
- the browser must never receive raw provider secrets or auth headers

## Planning and roadmap

The repo uses `.gsd/` as the planning and execution source of truth:

- `.gsd/PROJECT.md` — current project state
- `.gsd/STATE.md` — quick-glance active status
- `.gsd/REQUIREMENTS.md` — capability contract and validation state
- `.gsd/DECISIONS.md` — append-only architectural decisions
- `.gsd/milestones/` — milestone/slice/task planning and summaries

For a contributor-oriented roadmap, read [`OPEN_SOURCE_BUILD_PLAN.md`](./OPEN_SOURCE_BUILD_PLAN.md).

## Contribution expectations

Good changes usually:

- preserve the canonical local document model;
- keep `/__sfrb/bootstrap` and `/__sfrb/editor` stable unless explicitly changing that contract;
- avoid leaking secrets into logs, browser payloads, committed config, or screenshots;
- include the lightest sufficient tests or verification;
- keep planning docs aligned when project state materially changes.

High-value next contributions:

- editor UX polish that makes the document canvas primary;
- lower-flake browser tests and bridge smoke checks;
- additional resume templates and template accessibility checks;
- deterministic export verification across more document shapes;
- accessibility and keyboard/focus improvements.

Avoid large framework churn, secret handling changes, or UI rewrites that bypass the document-vs-design physics model.

## Branch hierarchy

SfRB now uses a simple open-source maintainer workflow:

```txt
feature/fix/docs branch -> main
```

- `main` should always be usable.
- Every PR targets `main` directly.
- Use GitHub Actions as the quality gate.
- Use draft PRs for work-in-progress.
- Cut releases/tags when a polished milestone is ready.

Examples:

```txt
feat/template-catalog       -> main
feat/template-polish        -> main
feat/deepseek-default       -> main
fix/bridge-copy-race        -> main
docs/open-source-roadmap    -> main
```

Before merging, run at least:

```bash
npm run build
npm test
```

## License

This repository is licensed under the **Apache License 2.0**. See [`LICENSE`](./LICENSE).
