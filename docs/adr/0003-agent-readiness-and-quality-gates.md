# ADR-0003: Agent-readiness tooling and quality gates

- Status: Accepted
- Date: 2026-06-25

## Context

The repository is increasingly worked on by AI coding agents as well as humans. Agents are most effective when a codebase has machine-checkable guardrails, discoverable documentation, and deterministic feedback. We wanted to raise the project's agent-readiness without compromising the load-bearing contracts (canonical write path, quiet bridge stdio, bridge-side secrets).

## Decision

We adopt a layered set of automated quality gates and supporting docs:

- **Static analysis:** ESLint (complexity, naming, module boundaries), Prettier, knip (dead code / unused deps), jscpd (duplication), and custom tech-debt and large-file guards.
- **Pre-commit hooks:** husky + lint-staged run lint and format on staged files.
- **Testing:** coverage thresholds, CI retry for flaky mitigation, and JUnit timing output, on top of the existing unit/contract/browser suites.
- **Observability:** a silent-by-default structured logger with secret redaction, an in-process Prometheus metrics registry, request-id correlation, and `/__sfrb/health` + `/__sfrb/metrics` endpoints.
- **Documentation:** `AGENTS.md`, contributor and governance files, architecture/API/observability/privacy/testing docs, runbooks, and these ADRs.
- **Automation:** Dependabot, CodeQL, and release-please.

## Consequences

- Contributions get fast, deterministic feedback locally and in CI.
- Agents can discover commands, contracts, and rationale from `AGENTS.md` and `docs/`.
- The observability additions are strictly additive and preserve the bridge's clean-stdio contract (the logger is silent unless `SFRB_LOG_LEVEL` is set).
- Some tooling is tuned (e.g. jscpd scopes to product code, knip ignores intentional API exports) to keep signal high; thresholds should be tightened over time, not loosened.
