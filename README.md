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

## LM Studio Hub discovery experiment

LM Studio Hub exposes a public artifact feed at `https://lmstudio.ai/api/v1/artifacts`. The feed includes native plugin records together with owner/name, description, downloads, likes, forks, update timestamps, revision information, and canonical Hub URLs.

The endpoint is currently treated as **undocumented and experimental**. Discovery output is never added to the public catalogue automatically.

Run:

```bash
pnpm discover:lmstudio
```

This writes `generated/lmstudio-discovery.json` locally and prints the highest-ranked plugin families. The experiment:

- keeps public artifacts whose Hub type is `plugin`
- preserves Hub metadata for inspection
- groups obvious forks into families
- ranks candidates with a transparent engagement-based discovery score
- keeps the generated snapshot out of Git

The next step is to evaluate the candidates and decide which Hub signals and enrichment checks should become part of the marketplace ingestion workflow.

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
