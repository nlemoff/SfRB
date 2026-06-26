# Runbook: Incident response

Use this when `main` is broken, a release is bad, or a user reports data loss.

## 1. Assess severity

- **SEV-high:** data loss/corruption of `resume.sfrb.json`, secret exposure, or `main` does not build.
- **SEV-low:** a single feature is degraded with a workaround.

## 2. Stop the bleeding

- If a recent merge broke `main`, revert the offending PR first; fix forward afterward.
- If a published release is bad, mark the GitHub Release as a pre-release / draft and cut a patch (see [release.md](./release.md)).
- If a secret was exposed, rotate it immediately and follow [SECURITY.md](../../SECURITY.md).

## 3. Diagnose

- Reproduce locally with `SFRB_LOG_LEVEL=debug`.
- Correlate using the `x-request-id` from the affected `/__sfrb/*` response.
- Check `/__sfrb/health` and `/__sfrb/metrics` for readiness and error-rate signal.
- Confirm the failure is covered by a test; if not, write a failing test that reproduces it.

## 4. Remediate

- Land the smallest correct fix with a regression test.
- Run the full quality gates (`typecheck`, `lint`, `knip`, `duplication`, `schema:check`, `test`).

## 5. Follow up

- Update [CHANGELOG.md](../../CHANGELOG.md).
- File follow-up issues for any root causes not fully addressed.
- If process or design was at fault, record an [ADR](../adr/).

## Automated error capture

CI is configured to open a tracking issue when a scheduled or mainline run fails, so regressions in `main` are not silently lost. Triage those issues using the steps above.
