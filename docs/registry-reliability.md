# Registry refresh and deployment

The site stays static on GitHub Pages. Registry packages are never installed or executed by ingestion or compatibility checks.

## Data flow

`Refresh registries` runs daily or manually on main. It installs with the frozen lockfile, audits dependencies, restores the last validated snapshots, and stages both upstream sources before promoting any files. Network requests have a 15-second deadline including body consumption, at most three attempts, exponential backoff, and a 10-second cap on Retry-After. Non-transient HTTP errors and invalid JSON fail immediately. MCP pagination rejects repeated cursors and stops at 1,000 pages; subprocesses also have a 20-minute deadline.

The entire candidate dataset must pass structural validation, contain both nonempty sources, preserve discovery/enrichment provenance, and avoid duplicate identities. A drop below half the previous source count is rejected for review. Fetch dates must be within 30 days and cannot be more than five minutes in the future. A valid previous dataset is retained unchanged if refresh fails; without valid fallback the job fails. Detail enrichment remains optional: failed detail requests preserve unknown classifications rather than asserting capabilities.

Only after catalogue validation, a full build and route verification does the workflow save a new last-known-good cache and upload the run's snapshot artifact. Failed candidates never update that cache. Restoring a snapshot never changes its fetch date. Cache/artifact eviction can happen; neither is permanent storage.

`Deploy GitHub Pages` runs on main changes, manually, or after a successful main-branch refresh. A refresh-triggered deployment uses that exact run's artifact. Code deployments use the latest validated main-branch cache. Both validate snapshots again and retain the existing reusable CI dependency audit and code checks. Deployment never contacts upstream registries. A missing, invalid, empty or expired snapshot stops deployment, leaving the previously deployed site in place.

After merging this workflow for the first time, run **Refresh registries** manually to seed the cache and trigger the first deployment. The initial main push may fail deployment because no validated snapshot cache exists yet. No repository settings need to change.

The homepage and browse JSON expose per-source fetch dates. The page labels snapshots older than two days as delayed at build time; the ISO fetch date remains visible even on a long-lived deployment. This is upstream fetch freshness, not an upstream tool release date or runtime verification.

## Local checks

```sh
pnpm install --frozen-lockfile
pnpm refresh:registries
pnpm validate:registries
pnpm check
SITE_URL=https://sahansera.github.io SITE_BASE=/local-ai-tools pnpm build
SITE_BASE=/local-ai-tools pnpm verify:web
pnpm audit:dependencies
```

A normal `pnpm build` still supports authored-only development without network access. Production workflows require complete registry snapshots. `pnpm build:marketplace` refreshes transactionally before building; `pnpm enrich:lmstudio` and `pnpm discover:mcp` remain individual development commands, not production deployment steps.

## Limitations and review notes

- Astro advisories on main are addressed by existing PR #52, not duplicated here. Its GitHub CI requires workflow approval; local validation is not a substitute for CI on Ubuntu/Node 22.
- The Hub endpoint is undocumented and returned 1,000 artifacts in the live check. We cannot claim it enumerates every Hub artifact. The existing enrichment limit remains 100 family representatives.
- A 50% count floor catches obvious truncation, not every possible upstream omission. Changed schema or genuine large removals require investigation before updating snapshot policy.
- The 30-day fallback policy deliberately fails closed after prolonged outages. A previously deployed static site can remain online longer; its displayed fetch dates remain unchanged.
- Actions caches are branch-scoped. Only validated default-branch workflow results are used for production; PR caches cannot become the default-branch fallback.
