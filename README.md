# Local AI Tools

Open-source marketplace for discovering LM Studio-compatible plugins, MCP servers, and other local AI tools.

> Initial development phase. The repository is private while the first usable OSS foundation and catalogue are being built.

## Vision

Local AI Tools is a lightweight discovery layer for local-AI integrations. The website is for human discovery; the MCP server will expose the same catalogue to models and agents.

The project deliberately starts static and GitHub-native: YAML catalogue data, schema validation, generated JSON, Astro, GitHub Actions, and no database or application backend.

## Repository layout

```text
apps/
  web/       Astro marketplace
  mcp/       Marketplace MCP server
packages/
  schema/    Shared Tool schema
  catalog/   YAML loading, validation, generation
  shared/    Shared utilities
data/tools/  Contributor-authored catalogue entries
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

## LM Studio Hub discovery and enrichment

LM Studio Hub exposes a public artifact feed at `https://lmstudio.ai/api/v1/artifacts`. The feed includes native plugin records together with owner/name, description, downloads, likes, forks, update timestamps, revision information, and canonical Hub URLs.

These endpoints are currently treated as **undocumented and experimental**. Discovery and enrichment output is review-only and is never added to the marketplace catalogue automatically.

### Discover native plugins

```bash
pnpm discover:lmstudio
```

This writes `generated/lmstudio-discovery.json` locally and prints the highest-ranked plugin families. It:

- keeps public artifacts whose Hub type is `plugin`
- preserves Hub metadata for inspection
- groups obvious forks into families
- ranks candidates with a transparent engagement-based discovery score
- keeps the generated snapshot out of Git

### Enrich and classify plugin families

```bash
pnpm enrich:lmstudio
```

The command refreshes discovery first, then enriches the top 100 plugin-family representatives. Use `pnpm enrich:lmstudio -- --all` to process every discovered family, or run the enrichment script directly with `--limit N` while experimenting.

The enrichment step attempts to fetch the per-artifact Hub JSON endpoint and combines that material with discovery metadata. Transparent heuristic rules then produce reviewable metadata for:

- capabilities such as memory, context management, video, web search, files, coding, images, audio, research, time and agent tooling
- risk signals such as filesystem read/write, shell execution, network access, credentials and telemetry
- conservative runtime fields for local execution, network requirements and API-key requirements
- evidence excerpts and confidence for every matched capability or risk

Unknown values stay `unknown`; absence of a detected signal is not treated as proof that a capability or risk does not exist.

The generated review snapshot is `generated/lmstudio-enriched.json` and remains ignored by Git.

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
