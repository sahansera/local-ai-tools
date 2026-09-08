# Local AI Tools

Open-source marketplace for discovering LM Studio-compatible plugins, MCP servers, and other local AI tools.

> Initial development phase. The repository is private while the first usable OSS foundation and catalogue are being built.

## Vision

Local AI Tools is a lightweight discovery layer for local-AI integrations. The website is for human discovery; the MCP server will expose the same catalogue to models and agents.

The project deliberately starts static and GitHub-native: YAML catalogue data, schema validation, generated JSON, Astro, GitHub Actions, and no database or application backend.

The marketplace is **provenance-first rather than curation-gated**. Public tools are discoverable from their upstream ecosystems, then normalized, deduplicated, enriched, and ranked with transparent signals. Local AI Tools does not decide which valid upstream tools users are allowed to discover.

## Repository layout

```text
apps/
  web/       Astro marketplace
  mcp/       Marketplace MCP server
packages/
  schema/    Shared Tool schema
  catalog/   YAML loading, validation, generation
  shared/    Shared utilities
data/tools/  Contributor-authored metadata records and overrides
generated/   Generated catalogue artifacts
scripts/     Discovery and maintenance experiments
```

External tools listed in the marketplace remain in their own repositories. This repository stores only marketplace metadata and first-party marketplace code.

## Development

Requirements:

- Node.js 22+
- pnpm 10+

```bash
pnpm install
pnpm dev
pnpm validate:catalog
pnpm generate:catalog
pnpm check
```

`pnpm dev` always works with contributor-authored catalogue records. If local LM Studio discovery/enrichment snapshots exist, the web app merges them into the same catalogue automatically.

To refresh Hub discovery/enrichment and start the marketplace in one command:

```bash
pnpm dev:hub
```

For a production-style static build that includes a fresh Hub snapshot:

```bash
pnpm build:hub
```

The UI uses the public LM Studio Hub discovery snapshot as the source of visible native-plugin families. Fork families are deduplicated to one representative. Enrichment adds capability, runtime, and risk signals where available but does not determine whether a valid discovered plugin is visible.

Contributor-authored YAML records are not an allowlist. They can provide higher-quality metadata for known tools. If the same tool also exists in LM Studio Hub, Local AI Tools keeps one listing, retains LM Studio Hub as the provenance, and merges Hub popularity/update metadata into that record.

## Deployment

GitHub Pages deployment is handled by `.github/workflows/deploy-pages.yml` on pushes to `main` and manual workflow runs. The production workflow refreshes LM Studio Hub discovery/enrichment before building the Astro/Pagefind site, then deploys `apps/web/dist` through the official GitHub Pages artifact flow.

The default project Pages target is:

```text
https://sahansera.github.io/local-ai-tools/
```

Astro and internal links are base-path-aware so the same build can later move to a custom domain. Optional repository variables can override the defaults without changing code:

```text
SITE_URL=https://example.com
SITE_BASE=/
```

The Hub-backed build intentionally fails if the upstream refresh fails so an existing good deployment is not replaced with a partial catalogue.

## LM Studio Hub discovery and enrichment

LM Studio Hub exposes a public artifact feed at `https://lmstudio.ai/api/v1/artifacts`. The feed includes native plugin records together with owner/name, description, downloads, likes, forks, update timestamps, revision information, and canonical Hub URLs.

These endpoints are currently treated as **undocumented** and may change. Local AI Tools therefore keeps discovery and enrichment code isolated and treats inferred metadata conservatively.

### Discover native plugins

```bash
pnpm discover:lmstudio
```

This writes `generated/lmstudio-discovery.json` locally and prints the highest-ranked plugin families. It:

- keeps public artifacts whose Hub type is `plugin`
- preserves Hub metadata for indexing and inspection
- groups obvious forks into families
- calculates an engagement-based discovery score used to choose a family representative
- keeps the generated snapshot out of Git

The marketplace can use every deduplicated family from this snapshot; the score does not act as an inclusion threshold.

### Enrich and classify plugin families

```bash
pnpm enrich:lmstudio
```

The command refreshes discovery first, then enriches the top 100 plugin-family representatives. Use `pnpm enrich:lmstudio -- --all` to process every discovered family, or run the enrichment script directly with `--limit N` while experimenting.

The enrichment step attempts to fetch the per-artifact Hub JSON endpoint and combines that material with discovery metadata. Transparent heuristic rules then produce metadata for:

- capabilities such as memory, context management, video, web search, files, coding, images, audio, research, time and agent tooling
- risk signals such as filesystem read/write, shell execution, network access, credentials and telemetry
- conservative runtime fields for local execution, network requirements and API-key requirements
- evidence excerpts and confidence for every matched capability or risk

Unknown values stay `unknown`; absence of a detected signal is not treated as proof that a capability or risk does not exist. Inferred values are labelled in the detail UI, and the upstream plugin page remains the source of truth.

The generated enrichment snapshot is `generated/lmstudio-enriched.json` and remains ignored by Git.

### Evaluate search quality

After enrichment, try queries such as:

```bash
pnpm search:lmstudio -- memory
pnpm search:lmstudio -- "context management"
pnpm search:lmstudio -- video
pnpm search:lmstudio -- "web search"
pnpm search:lmstudio -- files
pnpm search:lmstudio -- coding
```

This is an evaluation tool, not the production marketplace ranking. It weights capability matches more strongly than raw popularity so we can inspect whether the enrichment pipeline is actually solving capability-oriented discovery.

## Marketplace ranking

The default **Recommended** order is calculated from signals such as Hub engagement, recency, and metadata completeness. It does not privilege contributor-authored records. Users can switch to explicit sorts such as **Popular**, **Recently updated**, and **Name A–Z**.

The product principle is simple: expose useful facts and signals, then let users decide which tools fit their needs.

## Current milestones

- **M0 — Foundation:** monorepo, OSS/community files, CI
- **M1 — Catalogue:** schema, YAML validation, generated catalogue, first listing
- **M2 — Marketplace:** Astro UI, search, filters, tool pages
- **M3 — Deployment:** GitHub Pages and Pagefind
- **M4 — Contributions:** submission workflow
- **M5 — MCP:** discovery tools over the same catalogue

The first catalogue record is [Local Video Tools](https://lmstudio.ai/sahansera/local-video-tools).

## Independence

Local AI Tools is an independent community project. It is not affiliated with or endorsed by LM Studio.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports should follow [SECURITY.md](SECURITY.md).

## License

Software in this repository is licensed under the MIT License. See [LICENSE](LICENSE).
