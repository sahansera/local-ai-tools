# Public launch settings

Repository visibility is changed manually by the maintainer after reviewing the launch PR.

## Before changing visibility

- Verify the launch commit passes CI, `pnpm audit:dependencies`, and a full `pnpm build:marketplace` followed by `pnpm verify:web` with the production `SITE_URL` and `SITE_BASE`.
- Ensure the `main` ruleset requires the GitHub Actions `check` status and an up-to-date branch. The existing maintainer bypass is separate from these requirements; avoid bypassing a failing check for normal releases.
- Review historical private issues, pull requests, and workflow logs/artifacts for material that should not become public. A source-history secret scan does not inspect those surfaces.

## After changing visibility

- Enable **Settings → Advanced Security → Private vulnerability reporting** and verify that the [private report form](https://github.com/sahansera/local-ai-tools/security/advisories/new) is available. GitHub's reporting feature is for public repositories; it cannot be verified while this repository remains private.
- Verify secret scanning and push protection are enabled.
- Verify the marketplace and CI links in the README from a signed-out browser.

The website deployment workflow is restricted to `main`. It calls the same CI workflow for the exact deployment commit before refreshing the registries, building, checking all generated routes, and publishing the artifact.

Reference: [GitHub private vulnerability reporting configuration](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).
