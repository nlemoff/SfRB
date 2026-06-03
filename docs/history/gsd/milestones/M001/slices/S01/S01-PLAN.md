# S01: CLI & Config Agent

**Goal:** Give a new workspace a real `sfrb init` entrypoint that captures BYOK provider settings and workspace physics, then persists a project-local config contract that later slices can consume.
**Demo:** In a fresh repo, running `sfrb init` walks through provider + key + physics setup, writes `sfrb.config.json`, updates `.gitignore` to protect secrets, and leaves the config readable by follow-on CLI/web slices.

The work groups into two tasks because the main risk is not code volume but boundary clarity. First we need a stable CLI/config contract with executable tests so later slices do not build on ad hoc file shapes. Then we close the user-facing loop by implementing the interactive init flow, including masked key capture, safe local persistence, and a smoke path that proves a fresh workspace can actually be initialized. That order retires the biggest fragility first: config drift between prompts, stored JSON, and downstream consumers.

## Must-Haves

- `sfrb` has a real executable CLI entrypoint with subcommand routing for `init`.
- `sfrb init` captures AI provider choice, provider-specific API key, and workspace physics preference.
- Configuration persists as project-local `sfrb.config.json` with schema validation and stable defaults.
- Secret input is masked during capture and the init flow protects the config from accidental commits via `.gitignore` guidance/update.
- Slice verification proves both the config contract and the end-to-end init command behavior.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run tests/config/sfrb-config.test.ts`
- `npm test -- --run tests/cli/init-command.test.ts`
- `node scripts/verify-s01-init-smoke.mjs`
- `node ./dist/cli.js init --provider invalid --physics nope` exits non-zero and prints a structured validation error naming the rejected fields.

## Observability / Diagnostics

- Runtime signals: CLI exit codes, structured validation errors for invalid config writes, explicit init summary that redacts stored secrets.
- Inspection surfaces: `sfrb.config.json`, `.gitignore`, `npm test` output, and the smoke verification script.
- Failure visibility: prompt cancellation, unsupported provider/physics values, missing required key for selected provider, and config write/read failures surface as actionable stderr messages.
- Redaction constraints: API keys must never be echoed in logs, test snapshots, or command summaries.

## Integration Closure

- Upstream surfaces consumed: milestone decisions D001-D003 and the project root workspace layout.
- New wiring introduced in this slice: Node CLI entrypoint → command module → prompt layer → config schema/store → project files.
- What remains before the milestone is truly usable end-to-end: S02 must define the document schema that consumes physics, and S03 must use this config during `sfrb open`.

## Tasks

- [x] **T01: Create the CLI skeleton and config contract** `est:1.5h`
  - Why: Later slices need a stable executable and config boundary before any interactive setup is worth wiring.
  - Files: `package.json`, `tsconfig.json`, `src/cli.ts`, `src/commands/init.ts`, `src/config/schema.ts`, `src/config/store.ts`, `tests/config/sfrb-config.test.ts`
  - Do: Scaffold the Node/TypeScript CLI with `commander`, define the validated `sfrb.config.json` shape with `zod`, add project-local config read/write helpers, and set up the test runner so config contract assertions execute from day one.
  - Verify: `npm test -- --run tests/config/sfrb-config.test.ts && node ./dist/cli.js --help`
  - Done when: the repo can build/run a `sfrb` CLI help screen and automated tests prove valid config parsing plus rejection of malformed provider/physics data.
- [x] **T02: Implement the interactive init flow and fresh-workspace smoke path** `est:2h`
  - Why: This closes the actual slice demo by turning the CLI skeleton into a usable setup command for a new workspace.
  - Files: `src/commands/init.ts`, `src/prompts/init-wizard.ts`, `src/config/store.ts`, `scripts/verify-s01-init-smoke.mjs`, `tests/cli/init-command.test.ts`, `.gitignore`
  - Do: Build the `enquirer`-driven init wizard with masked provider-key prompts, map selected provider to the right key field, persist `sfrb.config.json`, ensure `.gitignore` protects the config file, and support a non-interactive test harness path so automated tests and the smoke script can exercise the same command semantics.
  - Verify: `npm test -- --run tests/cli/init-command.test.ts && node scripts/verify-s01-init-smoke.mjs`
  - Done when: a fresh workspace can run `sfrb init`, produce a valid project-local config plus `.gitignore` protection, and automated tests cover success, cancellation/error, and provider/physics persistence.

## Files Likely Touched

- `package.json`
- `tsconfig.json`
- `src/cli.ts`
- `src/commands/init.ts`
- `src/prompts/init-wizard.ts`
- `src/config/schema.ts`
- `src/config/store.ts`
- `tests/config/sfrb-config.test.ts`
- `tests/cli/init-command.test.ts`
- `scripts/verify-s01-init-smoke.mjs`
- `.gitignore`
