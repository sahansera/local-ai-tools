# Contributing

Thanks for helping improve Local AI Tools.

## Ways to contribute

- Add or correct a marketplace listing.
- Improve catalogue validation or metadata quality.
- Improve the Astro marketplace.
- Improve the marketplace MCP.
- Report bugs or propose features.

## Local development

```bash
pnpm install
pnpm validate:catalog
pnpm generate:catalog
pnpm check
```

## Adding a tool

Add one YAML file under `data/tools/`. Each entry must satisfy the shared schema in `packages/schema`.

Keep contributor-authored metadata factual and minimal. Generated metadata such as popularity, repository health, or future compatibility scores should not be manually added to catalogue files.

## Pull requests

- Keep PRs focused.
- Explain the problem and the chosen approach.
- Add or update tests when behavior changes.
- Ensure `pnpm check` passes.
- Use clear commit messages. Squash merging is preferred.

## Listed projects stay independent

Adding a tool to the catalogue does not move its source code into this repository. Upstream projects retain their own repositories, releases, licenses, and issue trackers.
