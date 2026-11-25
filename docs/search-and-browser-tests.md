# Search and browser regression coverage

Search uses a small browser-side inverted index, not a backend or embeddings. Unicode-aware tokens, accent normalization, curated capability synonyms and a few intent phrases support capability searches. Exact name/category matches outrank descriptions and fuzzy matches. Every meaningful query term must match; Recommended sorts by query relevance first, while explicit Name/Popular/Recent choices remain authoritative. Prefix matching starts at three characters and one-edit typo matching at four. Fuzzy expansion shares the first character, so first-character typos and multi-edit errors may not match. Queries are capped at 200 characters and 12 distinct terms.

Query, type, compatibility, category, platform and sort are stored in the URL. Missing compatibility retains the existing Ready default; `compatibility=all` explicitly means all statuses. Invalid select values fall back to defaults. Typing replaces the current history entry; changing filters adds an entry. Reload and browser back/forward restore controls and results. Existing unrelated URL parameters and fragments are preserved.

Catalogue requests have a timeout and share one in-flight load. A failed load keeps the initial cards and exposes Retry; a retry rebuilds the index only after valid data loads. Dynamic cards retain stable data IDs for parity checks.

## Running browser checks

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:browser
```

Playwright builds against `tests/fixtures/` via an explicit snapshot-directory override. It does not overwrite live generated snapshots or fetch upstream data. Chromium runs desktop and Pixel-sized mobile layouts against the actual static site under `/local-ai-tools/`. Eight tests cover initial/dynamic card parity, icons, native/MCP installation links, details/config previews, search/filter/sort URL state, load more, reload/back, and a failed browse request followed by Retry. Required credentials currently retain a setup template link on main; the separate trust PR changes that policy and must update that browser expectation when combined. These tests never install or execute registry packages or launch LM Studio. Mobile viewport coverage is not a real-device CPU benchmark.

CI installs Chromium and runs the same suite. On macOS/Node 26.8.1, frozen install, format/lint/typecheck, 28 unit tests, build/route checks and all eight browser cases passed. The full-registry performance benchmark uses the 73,603-tool snapshot from the reliability PR; raw measurements are in `search-benchmark-2026-11-25.json`.

## Measured limits

The live browse payload is 51.1 MB uncompressed / 9.8 MB with default gzip. Desktop Node JSON parsing took 178 ms, index construction 818 ms, and the approximate heap delta including queries was 122 MB. Sample query medians were 0.28–0.56 ms, with p95 below 1.1 ms. These are local CPU measurements, excluding network, browser rendering and mobile performance. Concurrent machine activity limits comparisons.

The first-load payload and client memory remain substantial. A follow-up static-only design should reuse the existing Pagefind index or build a compact precomputed index with lazy detail shards; preserve all listing IDs and filter behavior before switching. This PR establishes measurable deterministic search and regression coverage, without an unmeasured data-format migration. The reliability PR separately externalizes repeated CSS to keep the full Pages output under its size limit.
