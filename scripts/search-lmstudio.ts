import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ENRICHED_PATH = "generated/lmstudio-enriched.json";

interface Plugin {
  identifier: string;
  description: string;
  downloads: number;
  likes: number;
  score: number;
  enrichment: {
    capabilities: Record<string, unknown[]>;
    risks: Record<string, unknown[]>;
    searchableTerms: string[];
  };
}

interface Snapshot {
  plugins: Plugin[];
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((token) => token.length > 1);
}

function rank(plugin: Plugin, query: string): number {
  const queryTokens = tokens(query);
  const capabilityText = Object.keys(plugin.enrichment.capabilities).join(" ");
  const riskText = Object.keys(plugin.enrichment.risks).join(" ");
  const haystack = `${plugin.identifier} ${plugin.description} ${capabilityText} ${plugin.enrichment.searchableTerms.join(" ")}`.toLowerCase();

  let relevance = 0;
  for (const token of queryTokens) {
    if (capabilityText.includes(token)) relevance += 40;
    if (plugin.identifier.toLowerCase().includes(token)) relevance += 25;
    if (plugin.description.toLowerCase().includes(token)) relevance += 15;
    if (haystack.includes(token)) relevance += 5;
  }

  if (!relevance) return 0;
  const popularity = Math.log10(plugin.downloads + 1) * 2 + Math.log10(plugin.likes + 1);
  const riskPenalty = riskText.includes("shell-execution") ? 1 : 0;
  return relevance + popularity - riskPenalty;
}

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) throw new Error('Usage: pnpm search:lmstudio -- "memory"');

  const snapshot = JSON.parse(await readFile(resolve(ENRICHED_PATH), "utf8")) as Snapshot;
  const results = snapshot.plugins
    .map((plugin) => ({ plugin, rank: rank(plugin, query) }))
    .filter((item) => item.rank > 0)
    .sort((a, b) => b.rank - a.rank || b.plugin.downloads - a.plugin.downloads)
    .slice(0, 15);

  console.log(`Top matches for: ${query}\n`);
  if (!results.length) {
    console.log("No matches in the current enriched snapshot.");
    return;
  }

  for (const { plugin, rank } of results) {
    const capabilities = Object.keys(plugin.enrichment.capabilities).join(", ") || "unclassified";
    const risks = Object.keys(plugin.enrichment.risks).join(", ") || "none detected";
    console.log(`${rank.toFixed(1).padStart(6)}  ${plugin.identifier}`);
    console.log(`        ${plugin.downloads} downloads · ${capabilities}`);
    console.log(`        risks: ${risks}`);
    console.log(`        ${plugin.description.slice(0, 180)}${plugin.description.length > 180 ? "…" : ""}\n`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
