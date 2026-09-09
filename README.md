<p align="center">
  <img src="apps/web/public/app-icon.png" alt="Local AI Tools" width="128" height="128" />
</p>

<h1 align="center">Local AI Tools</h1>

<p align="center">
  <strong>Discover LM Studio plugins and MCP servers — with compatibility, setup, runtime, and provenance information in one place.</strong>
</p>

<p align="center">
  <a href="https://github.com/sahansera/local-ai-tools/actions/workflows/ci.yml"><img src="https://github.com/sahansera/local-ai-tools/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://sahansera.github.io/local-ai-tools/"><img src="https://img.shields.io/badge/marketplace-live-7c3aed.svg" alt="Live marketplace" /></a>
  <img src="https://img.shields.io/badge/built%20for-LM%20Studio-5b5cf6.svg" alt="Built for LM Studio" />
</p>

<p align="center">
  <a href="https://sahansera.github.io/local-ai-tools/"><strong>Browse the marketplace →</strong></a>
</p>

---

## What is Local AI Tools?

Local AI Tools is an open-source discovery marketplace focused on one question:

> **What can I add to LM Studio?**

LM Studio has its own native plugin ecosystem, while thousands of MCP servers live across the broader Model Context Protocol ecosystem. Finding the right tool — and understanding whether it can actually be used with LM Studio — is fragmented.

Local AI Tools brings those ecosystems together into a single searchable catalogue and adds an LM Studio-specific compatibility layer on top.

### At a glance

| | |
| --- | --- |
| **Native LM Studio plugins** | Discover public plugins from the LM Studio Hub and jump straight into LM Studio. |
| **MCP servers** | Discover servers from the official MCP Registry and see whether their published metadata maps safely to an LM Studio configuration. |
| **LM Studio compatibility** | Listings are classified as **Ready**, **Setup required**, or **Compatibility unknown**. |
| **One-click installation** | Generates **Add to LM Studio** links when a deterministic configuration can be produced safely. |
| **Useful signals** | Search by capability and inspect local/remote execution, API-key requirements, package/transport metadata, risk signals, source, and more. |
| **Provenance-first** | Upstream presence determines discoverability. Local AI Tools enriches and explains listings rather than maintaining a private allowlist. |
| **Static by default** | The marketplace is built with Astro + Pagefind and deployed as static files — no account or application backend required. |

## Why this exists

A user should be able to ask:

- _Can my local model edit video?_
- _Is there an MCP for web search that works with LM Studio?_
- _Which tools run locally and do not need an API key?_
- _Can I install this MCP directly, or does it need manual setup?_

…and get useful answers without already knowing the plugin name, package name, repository, or registry entry.

Local AI Tools is designed to make **capability discovery** the starting point rather than package discovery.

## LM Studio compatibility

MCP Registry presence does not automatically mean a server is one-click installable in LM Studio. Local AI Tools therefore keeps discovery separate from compatibility.

| Status | Meaning |
| --- | --- |
| **LM Studio Ready** | A valid LM Studio configuration can be produced directly from upstream metadata. |
| **Setup required** | The configuration is structurally valid, but the user must provide values such as an API key, path, argument, or environment variable. |
| **Compatibility unknown** | Upstream metadata is not sufficient to generate a configuration safely, so Local AI Tools does not guess. |

Native LM Studio Hub plugins are considered LM Studio Ready by definition.

For MCP servers, supported deterministic mappings currently include standard remote HTTP servers and selected stdio package configurations. Ambiguous transports, missing execution information, or unresolved templates remain discoverable without receiving a fabricated install configuration.

## How it works

```text
LM Studio Hub ────────┐
                      │ discovery + enrichment
                      ▼
                ┌───────────────┐
                │ Unified       │
                │ Tool Catalogue│
                └───────────────┘
                      ▲
                      │ ingestion + LM Studio
                      │ compatibility analysis
MCP Registry ─────────┘
                      │
                      ▼
              Astro + Pagefind
                      │
                      ▼
                Static website
```

The catalogue keeps upstream provenance intact. Contributor-authored metadata can improve a listing, but it does not act as an inclusion gate.

External tools remain in their own repositories and retain their own licenses, releases, maintainers, and issue trackers.

## Run locally

### Requirements

- Node.js 22+
- pnpm 10+

### Start with fresh marketplace data

```bash
git clone https://github.com/sahansera/local-ai-tools.git
cd local-ai-tools
pnpm install
pnpm dev:marketplace
```

`dev:marketplace` refreshes both the LM Studio Hub data and official MCP Registry snapshot before starting the Astro development server.

If you already have generated snapshots locally and just want to work on the UI:

```bash
pnpm dev
```

### Useful commands

```bash
pnpm discover:lmstudio     # discover native LM Studio plugin families
pnpm enrich:lmstudio       # enrich plugin capability/runtime metadata
pnpm discover:mcp          # refresh the official MCP Registry snapshot
pnpm generate:catalog      # generate contributor-authored catalogue data
pnpm check                 # format, lint, typecheck, test, validate, build
pnpm build:marketplace     # production-style build with fresh upstream data
```

## Repository structure

```text
local-ai-tools/
├── apps/
│   ├── web/              # Astro marketplace
│   └── mcp/              # future model-facing marketplace MCP
├── packages/
│   ├── catalog/          # catalogue loading + generation
│   ├── schema/           # shared Tool schema
│   └── shared/           # shared utilities
├── data/tools/           # contributor-authored metadata / overrides
├── generated/            # ignored generated discovery snapshots
├── scripts/              # discovery, enrichment, search, tests
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── LICENSE
```

## Design principles

**LM Studio first.** The goal is not to mirror every generic AI integration directory. The marketplace is specifically interested in tools that are useful to LM Studio users.

**Provenance over gatekeeping.** A valid upstream tool should be discoverable. Ranking, metadata quality, and compatibility are signals — not permission to appear.

**Facts over guesses.** Unknown stays unknown. If an MCP configuration cannot be generated deterministically, the marketplace does not invent one.

**Upstream remains the source of truth.** Inferred capability, runtime, or risk metadata exists to improve discovery and is labelled accordingly.

**Keep the core simple.** Discovery is performed during builds; the public marketplace remains static and inexpensive to operate.

<details>
<summary><strong>LM Studio Hub discovery details</strong></summary>

The marketplace uses the public LM Studio Hub artifact feed to discover native plugin records, then groups obvious forks into families and chooses one representative per family.

```bash
pnpm discover:lmstudio
pnpm enrich:lmstudio
```

Discovery writes `generated/lmstudio-discovery.json`. Enrichment writes `generated/lmstudio-enriched.json`. Both files are generated locally and remain ignored by Git.

Enrichment can infer capabilities such as memory, context management, video, web search, files, coding, images, audio, research, time, and agent tooling. It can also surface signals such as filesystem access, shell execution, network access, credentials, and telemetry.

These LM Studio Hub endpoints are treated as undocumented and potentially changeable, so the integration is deliberately isolated and conservative.

</details>

<details>
<summary><strong>MCP Registry ingestion details</strong></summary>

The marketplace consumes the official MCP Registry's read-only server API using cursor pagination and requests the latest published version of each server.

```bash
pnpm discover:mcp
```

The generated snapshot is written to `generated/mcp-registry.json` and remains ignored by Git.

Ingestion preserves factual upstream information such as version, package registry type, transports, repository/homepage links, and Registry status. LM Studio-specific compatibility is calculated separately so Registry presence is never misrepresented as guaranteed LM Studio compatibility.

</details>

<details>
<summary><strong>Deployment details</strong></summary>

GitHub Pages deployment is handled by `.github/workflows/deploy-pages.yml`.

Production deployment refreshes LM Studio Hub discovery/enrichment and MCP Registry data, builds Astro + Pagefind, and publishes `apps/web/dist` through GitHub Pages.

The current site is hosted at:

**https://sahansera.github.io/local-ai-tools/**

The build is base-path aware and supports moving to a custom domain later through `SITE_URL` and `SITE_BASE` repository variables.

</details>

## Roadmap

- [x] Static Astro marketplace
- [x] Search, filters, sorting, and detail pages
- [x] LM Studio Hub plugin discovery
- [x] Official MCP Registry ingestion
- [x] LM Studio MCP compatibility analysis
- [x] Add to LM Studio links for deterministic installations
- [x] GitHub Pages deployment
- [ ] Contributor submission and correction workflows
- [ ] Model-facing Local AI Tools MCP
- [ ] Deeper MCP capability and runtime enrichment

## Contributing

Contributions are welcome. Useful ways to help include:

- report a broken listing or install flow
- correct or improve marketplace metadata
- improve LM Studio compatibility mappings
- improve search, ranking, or discovery quality
- improve the Astro marketplace
- propose new capability/risk classifications

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. By participating, please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues should be reported according to [SECURITY.md](SECURITY.md).

## Independence

Local AI Tools is an independent community project. It is **not affiliated with or endorsed by LM Studio**.

LM Studio, MCP, and other product/project names belong to their respective owners.

## License

Local AI Tools is released under the [MIT License](LICENSE).
