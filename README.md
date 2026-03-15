# SfRB

SfRB (Straightforward Resume Builder) is a local-first resume builder with a CLI entrypoint and a browser-based editor. It keeps one canonical `resume.sfrb.json` document model, validates workspace rules before persistence, and supports both document-style editing and fixed-layout design editing.

The current stable baseline is **M001 complete**:
- `sfrb init` creates workspace config without storing API secrets in the repo
- `sfrb open` launches the local bridge and browser editor
- document mode supports inline editing
- design mode supports frame editing and dragging
- the AI layout consultant can detect overflow, show a ghost preview, and persist accepted fixes through the canonical write path

## License

This repository is licensed under the **Apache License 2.0**. See [`LICENSE`](./LICENSE).

If you redistribute this project or derivative works, the practical rules from Apache 2.0 that matter here are:

- include a copy of the Apache 2.0 license
- keep existing copyright, attribution, patent, and license notices
- mark files you changed with prominent notices
- if a `NOTICE` file is added later, include its required attributions when redistributing
- do not imply warranties; the project is provided on an `AS IS` basis
- do not assume trademark rights from the license

This README is guidance only. The `LICENSE` file is the authority.

## Branch hierarchy

The repo should follow this promotion model:

- `main` — most up-to-date **stable** branch
- `DEV` — integration branch for active development
- `TEST` — pre-release validation branch between `DEV` and `main`

Promotion flow:

1. branch off `DEV` for feature or fix work
2. merge the work branch back into `DEV`
3. promote `DEV` into `TEST`
4. validate in `TEST`
5. promote `TEST` into `main`

In short:

`feature/fix branch -> DEV -> TEST -> main`

### Branching rules

- Do **not** branch new work directly from `main` unless it is an emergency hotfix process you explicitly decide to use.
- `main` should remain releasable.
- `DEV` is where integration happens.
- `TEST` is where promotion candidates are verified before landing in `main`.
- Keep promotion directional: `DEV -> TEST -> main`.
- If a branch needs backmerged policy or docs changes from `main` or upstream stable, do that before promotion so the branch reflects the current repo contract.

## Current project shape

Key files and boundaries:

- `src/cli.ts` — CLI entrypoint
- `src/commands/init.ts` — workspace initialization
- `src/commands/open.ts` — local bridge startup
- `src/bridge/server.mjs` — browser bridge runtime
- `src/agent/LayoutConsultant.ts` — AI consultant provider boundary and proposal validation
- `web/` — browser editor UI
- `schema.json` — generated document schema artifact
- `.gsd/` — milestone, slice, decision, and state artifacts

Canonical local workspace files:

- `sfrb.config.json` — workspace config, including AI provider metadata and physics mode
- `resume.sfrb.json` — canonical resume document

## Development

### Requirements

- Node.js `>=20`
- npm

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Schema checks

```bash
npm run schema:generate
npm run schema:check
```

## CLI usage

Build first so the CLI exists in `dist/`.

```bash
npm run build
node dist/cli.js --help
```

Available commands include:

```bash
node dist/cli.js init
node dist/cli.js open
```

## Workflow notes

- Browser state is reconciled from `/__sfrb/bootstrap`
- Browser mutations persist through `/__sfrb/editor`
- AI layout proposals are requested through `/__sfrb/consultant`
- API secrets stay in environment variables, not in committed config
- the browser must never receive raw provider secrets or auth headers

## Release and promotion checklist

Before promoting upward:

- branch is based on the current intended source branch
- `npm run build` passes
- `npm test` passes
- milestone/slice docs in `.gsd/` reflect actual shipped state
- any license-related file additions or changes are present
- branch is clean and ready to merge upward

## Status

M001 is complete. The next planning step is defining M002 on top of the now-stable local authoring and consultant loop.
