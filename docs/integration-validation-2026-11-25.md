# Combined local validation — 25 November 2026

The original public repository checkout and its uncommitted files were preserved. Work used separate local worktrees and focused draft PRs; no PR was merged, production deployed, repository setting changed, or registry MCP package executed.

## Review order and dependency handling

PR #52 owns the Astro dependency/lockfile fix and remains unchanged. PRs #53 (refresh reliability), #54 (capability evidence), #55 (search/browser tests), #57 (SEO/feedback) and #58 (compact export) are stacked on its branch. PR #56 (configuration trust) is stacked on #55 and includes the updated browser credential expectation. This avoids duplicating the active dependency work while allowing patched-dependency CI to run on the new heads. Retarget dependent PRs after their base is merged.

A separate, local-only integration branch combined all implementation commits. Root package commands from refresh and browser testing were retained together. The resolved lockfile preserves #52's patched Astro and overrides while adding Playwright; that tested resolution is also present in #55. Integration was not published as one large PR.

## Checks and measurements

- Frozen pnpm 10.15.1 install, dependency audit with **zero known vulnerabilities**, format, lint, typecheck and authored-catalogue build/routes passed locally.
- **51 unit tests** and **8 Chromium desktop/mobile browser cases** passed in the combined checkout. Browser fixtures do not overwrite live snapshots or contact upstream registries.
- The complete live snapshots passed structural, freshness, provenance and nonempty validation: 373 Hub plugins (266 fork families) and 73,337 MCP entries.
- Full build and route checks passed for **73,603 unique listings** and **73,578 legacy redirects**. XML validation checked all **73,620 canonical sitemap URLs** across **8 chunks** against generated files, without duplicate URLs. Canonical metadata, JSON-LD, feedback links, export counts and conservative offline claims were also checked.
- Final logical output: **923,565,570 bytes**, below the enforced **1,000,000,000-byte** Pages budget, leaving **76,434,430 bytes** headroom. Do not treat that headroom as unlimited growth capacity.
- Final full build: **137.56 seconds**, about **7.36 GB peak RSS**, on macOS arm64 / Node 26.8.1. Machine load varied; this is not a controlled speed or memory comparison and is not an Ubuntu production refresh benchmark.
- Compact normalized catalogue export: **97,695,969 bytes**, versus **140,521,740 bytes** pretty-printed, with equivalent parsed data. Search benchmark method and earlier raw results are in `search-and-browser-tests.md` and `search-benchmark-2026-11-25.json`.

## Limits and rollout

Individual PR CI runs the existing code/audit gates and, where present, the new deterministic browser suite on GitHub's Ubuntu/Node 22 environment. The production full-registry workflow has not been run from merged main: doing so requires the authorized review/merge process first. #52's original Copilot workflow approval status remains separate from the green checks on dependent PRs. Latest CI states are on the PRs themselves.

After review and merging, run **Refresh registries** once to seed validated snapshots and trigger deployment. A missing/invalid/expired cache stops deployment safely; first-rollout instructions are in `registry-reliability.md`.

The homepage still downloads a large browse payload and constructs a sizeable in-memory index. Desktop Node timings and mobile viewport regressions do not establish real-device mobile network/CPU performance. A compact prebuilt static search index or lazy data shards remains the next performance investigation. No LM Studio runtime installation or community verification claim was made. The Hub endpoint remains undocumented and the snapshot does not prove complete Hub enumeration.
