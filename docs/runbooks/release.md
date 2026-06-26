# Runbook: Release

Releases are automated with [release-please](https://github.com/googleapis/release-please) driven by Conventional Commit messages.

## How it works

1. Commits merged to `main` use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
2. The release-please workflow maintains a "Release PR" that accumulates the next version bump and changelog entries.
3. Merging the Release PR tags the version and publishes a GitHub Release with generated notes.

## Versioning

- `fix:` -> patch
- `feat:` -> minor
- `feat!:` or a `BREAKING CHANGE:` footer -> major

The project is pre-1.0; breaking changes may still land in minor bumps until 1.0.

## Cutting a release

1. Ensure `main` is green (all CI checks pass).
2. Review the open Release PR: confirm the version bump and the [CHANGELOG.md](../../CHANGELOG.md) entries are accurate.
3. Merge the Release PR. The tag and GitHub Release are created automatically.

## Hotfix

1. Branch from the latest release tag.
2. Land the minimal `fix:` commit with a regression test.
3. Merge to `main`; release-please will produce a patch release.

## Verification after release

- Install the published artifact and run `sfrb --help`, `sfrb init`, and `sfrb open` against a scratch workspace as a smoke check.
