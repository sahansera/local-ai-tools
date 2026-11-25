# Compact static catalogue export

`catalog.json` previously pretty-printed its full normalized dataset. Emit compact JSON instead, preserving schemaVersion, every listing, provenance, evidence and generated setup fields. This is a whitespace-only wire-format change: parsing the old and new exports produces equivalent JSON data. It introduces no backend, compression dependency or runtime package execution.

With the 25 November 2026 integration dataset from PRs #52–#57 (73,603 tools), the pretty export is 140,521,740 bytes and the compact export is 97,695,969 bytes: a reduction of 42,825,771 bytes (30.5%). Default gzip sizes are 13,701,287 and 12,419,647 bytes, respectively. These are local Node 26.8.1/macOS measurements; deployed content encoding is controlled by GitHub Pages, not this endpoint.

The comparison parsed and reserialized the old export and asserted equality with the compact output. Frozen install, format/lint/typecheck, unit tests, authored build and route checks also pass locally. Main's dependency audit is still addressed separately by #52. The complete integration build retains the 1 GB output-size gate from #53.

This endpoint is separate from the homepage's lazy-loaded `browse.json`: its 51 MB first-load payload is not reduced by this change. Desktop search indexing still uses substantial client memory, and browser/mobile network and CPU measurements remain necessary before selecting a compact prebuilt search index or static detail shards.
