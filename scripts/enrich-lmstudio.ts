import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { classifyPlugin, searchableTerms } from "./lmstudio-classifier.js";

const DISCOVERY_PATH = "generated/lmstudio-discovery.json";
const OUTPUT_PATH = "generated/lmstudio-enriched.json";
const HUB_API = "https://lmstudio.ai/api/v1/artifacts";
const DEFAULT_LIMIT = 100;
const CONCURRENCY = 6;

interface DiscoveryPlugin {
  identifier: string;
  owner: string;
  name: string;
  description: string;
  hubUrl: string;
  updatedAt: string | null;
  createdAt: string | null;
  downloads: number;
  likes: number;
  forks: number;
  discussions: number;
  revision: number | null;
  staffPicked: boolean;
  forkedFrom: string | null;
  family: string;
  score: number;
}

interface DiscoverySnapshot {
  generatedAt: string;
  source: string;
  plugins: DiscoveryPlugin[];
}

interface EnrichedPlugin extends DiscoveryPlugin {
  enrichment: {
    detailEndpoint: string;
    detailFetched: boolean;
    sourceFields: string[];
    capabilities: ReturnType<typeof classifyPlugin>["capabilities"];
    risks: ReturnType<typeof classifyPlugin>["risks"];
    runtime: ReturnType<typeof classifyPlugin>["runtime"];
    searchableTerms: string[];
    evidenceTextLength: number;
  };
}

function familyRepresentatives(
  plugins: DiscoveryPlugin[],
): DiscoveryPlugin[] {
  const families = new Map<string, DiscoveryPlugin>();
  for (const plugin of plugins) {
    const current = families.get(plugin.family);
    if (!current || plugin.score > current.score) {
      families.set(plugin.family, plugin);
    }
  }

  return [...families.values()].sort(
    (left, right) =>
      right.score - left.score || right.downloads - left.downloads,
  );
}

function meaningfulStrings(
  value: unknown,
  path = "root",
  output: Array<{ path: string; value: string }> = [],
): Array<{ path: string; value: string }> {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed.length >= 3 &&
      trimmed.length <= 100_000 &&
      !/^https?:\/\//i.test(trimmed) &&
      !/^[a-f0-9]{32,}$/i.test(trimmed)
    ) {
      output.push({ path, value: trimmed });
    }
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      meaningfulStrings(item, `${path}[${index}]`, output),
    );
    return output;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      if (/^(?:url|artifactUrl|avatarUrl|downloadUrl)$/i.test(key)) {
        continue;
      }
      meaningfulStrings(child, `${path}.${key}`, output);
    }
  }

  return output;
}

async function fetchDetail(
  identifier: string,
): Promise<{ endpoint: string; data: unknown | null }> {
  const candidates = [
    `${HUB_API}/${identifier}`,
    `${HUB_API}/${identifier}/`,
  ];

  for (const endpoint of candidates) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "local-ai-tools-enrichment/0.1 (+https://github.com/sahansera/local-ai-tools)",
        },
      });
      if (!response.ok) continue;
      return { endpoint, data: await response.json() };
    } catch {
      // A failed detail request should not abort the review snapshot.
    }
  }

  return { endpoint: candidates[0], data: null };
}

async function enrichPlugin(
  plugin: DiscoveryPlugin,
): Promise<EnrichedPlugin> {
  const detail = await fetchDetail(plugin.identifier);
  const strings = detail.data ? meaningfulStrings(detail.data) : [];
  const sourceFields = [...new Set(strings.map((item) => item.path))].slice(
    0,
    100,
  );
  const detailText = strings.map((item) => item.value).join("\n");
  const evidenceText = [
    plugin.name,
    plugin.identifier,
    plugin.description,
    detailText,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 250_000);
  const classification = classifyPlugin(evidenceText);

  return {
    ...plugin,
    enrichment: {
      detailEndpoint: detail.endpoint,
      detailFetched: detail.data !== null,
      sourceFields,
      capabilities: classification.capabilities,
      risks: classification.risks,
      runtime: classification.runtime,
      searchableTerms: searchableTerms(classification),
      evidenceTextLength: evidenceText.length,
    },
  };
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      () => worker(),
    ),
  );
  return results;
}

function parseLimit(): number {
  if (process.argv.includes("--all")) return Number.POSITIVE_INFINITY;

  const index = process.argv.indexOf("--limit");
  if (index >= 0) {
    const parsed = Number(process.argv[index + 1]);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
    throw new Error("--limit must be a positive integer");
  }

  return DEFAULT_LIMIT;
}

async function main(): Promise<void> {
  const discovery = JSON.parse(
    await readFile(resolve(DISCOVERY_PATH), "utf8"),
  ) as DiscoverySnapshot;

  if (!Array.isArray(discovery.plugins)) {
    throw new Error(
      `Invalid ${DISCOVERY_PATH}; run pnpm discover:lmstudio first.`,
    );
  }

  const representatives = familyRepresentatives(discovery.plugins);
  const limit = parseLimit();
  const selected = Number.isFinite(limit)
    ? representatives.slice(0, limit)
    : representatives;

  console.log(
    `Enriching ${selected.length} LM Studio plugin families ` +
      `(of ${representatives.length})...`,
  );
  const plugins = await mapConcurrent(
    selected,
    CONCURRENCY,
    enrichPlugin,
  );

  const capabilityCounts: Record<string, number> = {};
  const riskCounts: Record<string, number> = {};
  let detailFetched = 0;

  for (const plugin of plugins) {
    if (plugin.enrichment.detailFetched) detailFetched += 1;

    for (const capability of Object.keys(
      plugin.enrichment.capabilities,
    )) {
      capabilityCounts[capability] =
        (capabilityCounts[capability] ?? 0) + 1;
    }

    for (const risk of Object.keys(plugin.enrichment.risks)) {
      riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
    }
  }

  const output = {
    source: discovery.source,
    discoveryGeneratedAt: discovery.generatedAt,
    generatedAt: new Date().toISOString(),
    warning:
      "Review-only heuristic enrichment from undocumented LM Studio Hub endpoints. Unknown values are intentionally preserved; do not treat inferred metadata as verified facts.",
    counts: {
      pluginFamiliesAvailable: representatives.length,
      pluginsEnriched: plugins.length,
      detailFetched,
    },
    capabilityCounts,
    riskCounts,
    plugins,
  };

  const absoluteOutput = resolve(OUTPUT_PATH);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(
    absoluteOutput,
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Fetched detail JSON for ${detailFetched}/${plugins.length} plugins.`,
  );
  console.log(`Wrote ${OUTPUT_PATH}.`);
  console.log("\nCapability counts:");

  for (const [name, count] of Object.entries(capabilityCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`${String(count).padStart(3)}  ${name}`);
  }

  console.log("\nRisk signals:");
  for (const [name, count] of Object.entries(riskCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`${String(count).padStart(3)}  ${name}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
