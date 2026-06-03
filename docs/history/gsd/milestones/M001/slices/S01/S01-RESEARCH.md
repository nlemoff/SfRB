# Research Slice S01 ("CLI & Config Agent") — Research

**Date:** 2026-03-13

## Summary

This slice establishes the CLI foundation and configuration management for SfRB. The primary objective is to create a robust, interactive initialization flow (`sfrb init`) that captures user preferences for AI providers (BYOK) and workspace physics (flow vs. design). 

The research indicates that a Node.js-based CLI using `commander` for command routing and `enquirer` for interactive prompts provides the best balance of developer experience and user interaction quality. Configuration will be persisted locally using the `conf` library, scoped to the current working directory to ensure project-level isolation and portability.

## Recommendation

Use `commander` as the CLI harness and `enquirer` for the "init" wizard. For configuration, use `conf` with the `cwd` option set to the project root. This ensures that `.sfrb.config.json` stays with the resume project rather than being hidden in a global system directory. This approach supports the "Local-First" requirement while enabling future agent-driven mutations through a stable JSON config interface.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| CLI Command Parsing | `commander` | Industry standard, supports subcommands and auto-generated help. |
| Interactive Prompts | `enquirer` | Modern, lightweight, and supports complex prompt types (select, password). |
| Atomic Config Persistence | `conf` | Handles JSON serialization, atomic writes, and schema validation out of the box. |
| Schema Validation | `zod` | Provides type-safe validation for both document models and configuration. |

## Existing Code and Patterns

- `SfRB/LICENSE` — The project is Apache 2.0. All new code should respect this license.
- `.gsd/PROJECT.md` — Defines the architecture: CLI-first, Local Web Bridge, BYOK, and Configurable Physics.
- `.gsd/REQUIREMENTS.md` — R002 and R005 are the primary drivers for this slice.

## Constraints

- **Local-First:** Configuration and data must reside in the user's project directory.
- **Node.js Environment:** Must run in standard Node.js environments (v18+ recommended).
- **Security:** API keys collected during `init` must be masked during input and stored with appropriate warnings about local plain-text storage.

## Common Pitfalls

- **Global Config Drift:** Storing project-specific config in `~/.config` makes it hard to share or version-control resume projects. **Fix:** Use `conf({ cwd: process.cwd() })`.
- **Cluttered Main Binary:** Putting all logic in one file makes the CLI hard to maintain. **Fix:** Use a command-pattern where each subcommand lives in its own module under `src/commands/`.
- **Inflexible Physics:** Hardcoding layout logic early. **Fix:** Ensure the config clearly separates `physics` (flow/design) so the editor can switch behaviors at runtime.

## Open Risks

- **Credential Exposure:** Storing API keys in plain text in the project directory might lead to accidental commits if the user doesn't `.gitignore` their config. **Fix:** Provide a default `.gitignore` during `init` that excludes `.sfrb.config.json` or sensitive files.
- **Node.js Dependency Bloat:** Large CLI packages can be slow to start. **Fix:** Keep dependencies focused on CLI/Config; defer editor-heavy dependencies to the Vite server sub-project.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Commander.js | softaworks/agent-toolkit@command-creator | available |
| Node.js CLI | blueif16/amazing-claude-code-plugins@create-command | available |

## Sources

- Commander.js Documentation (source: [tj/commander.js](https://github.com/tj/commander.js))
- Enquirer Prompts Guide (source: [enquirer/enquirer](https://github.com/enquirer/enquirer))
- Conf Library (source: [sindresorhus/conf](https://github.com/sindresorhus/conf))
- Vite JavaScript API (source: [vitejs/vite](https://vite.dev/guide/api-javascript))
