# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Release notes are generated automatically from Conventional Commit messages via release-please.

## [Unreleased]

### Added

- Agent-readiness tooling: ESLint flat config, Prettier, knip, jscpd, tech-debt and large-file guards.
- Pre-commit hooks via husky + lint-staged.
- Test coverage thresholds, CI retry for flaky-test mitigation, and JUnit timing output.
- Structured, secret-redacting logger and an in-process Prometheus metrics registry.
- Bridge observability endpoints: `GET /__sfrb/health` and `GET /__sfrb/metrics`, plus `x-request-id` correlation on every `/__sfrb/*` response.
- Contributor and operational documentation: `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, architecture, bridge API, observability, privacy, testing docs, runbooks, and ADRs.
- Developer environment and automation: devcontainer, CODEOWNERS, issue/PR templates, Dependabot, CodeQL, and release automation.

[Unreleased]: https://github.com/nlemoff/SfRB/compare/main...HEAD
