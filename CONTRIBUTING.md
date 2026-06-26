# Contributing to SfRB

SfRB is a local-first, CLI-first resume builder distributed as a git-clone tool. This guide covers the local development path; [`ROADMAP.md`](./ROADMAP.md) covers what to work on and the contribution lanes.

## Getting set up

```bash
git clone https://github.com/nlemoff/SfRB.git
cd SfRB
npm install
npm run test:setup:browsers   # one-time Playwright Chromium download
npm run build
```

Node `>=20` is required. PDF export and the browser test suites need the Playwright Chromium from `test:setup:browsers`.

Try the product loop end to end:

```bash
mkdir /tmp/my-resume
node dist/cli.js init --cwd /tmp/my-resume --starter template --physics design --skip-ai
node dist/cli.js open --cwd /tmp/my-resume
# ... edit in the browser, then:
node dist/cli.js export --cwd /tmp/my-resume --output /tmp/resume.pdf
```

## The contracts that matter

These are the rules changes must preserve (the full versions live in `ROADMAP.md` and `CLAUDE.md`):

- **One canonical document.** `resume.sfrb.json` is the only authoritative state. Every mutation — browser or CLI — goes through schema + physics validation before any write. Don't add a second write path.
- **One mutation model.** Editor actions are structured operations (`src/document/operations/`). The bridge `{operation}` route and `sfrb edit` share the same runner; keep them shared.
- **Templates are typography, not geometry.** `Theme` never grows page-size/margin/frame fields.
- **The artifact stays chrome-free.** `/print?mode=artifact` carries no editor UI; preview-only chrome is fine.
- **Explicit failure beats silent degradation.** Blocked edits, rejected operations, and overflow must be visible.
- **One-page contract.** Overflow gates export; it does not paginate.
- **Frozen selectors.** Ids and `data-testid`s referenced by `tests/` and `scripts/verify-*.mjs` are a contract — move elements freely, never rename or drop them.

## Before you open a PR

Run the gate locally:

```bash
npm run build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run format:check     # prettier --check
npm run knip             # unused files / dependencies
npm run duplication      # jscpd duplicate-code scan
npm run schema:check     # regenerate with npm run schema:generate if you changed the document schema
npm test                 # full vitest suite, including real-browser tests (npm run coverage adds thresholds)
npm run verify:smoke     # built-CLI smoke checks: editor, consultant, edit, tile, freeform, reconciliation
```

For packaging-affecting changes, also run `npm run verify:package`. Pre-commit hooks (husky + lint-staged) run ESLint and Prettier on staged files automatically. For agent-facing setup and deeper architecture notes, see [AGENTS.md](./AGENTS.md) and [docs/](./docs/).

PRs target `main` directly. Keep each PR scoped to one clear problem, include the lightest sufficient tests, and update `README.md` / `ROADMAP.md` when project state materially changes. Use draft PRs for work in progress.

## Tests

- Unit/contract tests live under `tests/{document,config,cli,bridge,presentation}`.
- Browser tests (`tests/web/`) drive real Chromium against the real built bridge — build first (`npm test` does this once via the vitest global setup).
- Never rebuild `dist/` from inside a test; the global setup owns the build.
- One scenario per browser test file keeps the suite parallelizable.
