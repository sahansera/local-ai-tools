import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import catalogData from "../../../../generated/catalog.json";

export type RuntimeValue = boolean | "unknown";

export interface ToolSource {
  kind: "curated" | "hub-discovery";
  experimental?: boolean;
  downloads?: number;
  likes?: number;
  updatedAt?: string | null;
}

export interface Tool {
  schemaVersion: 1;
  id: string;
  name: string;
  type: "lmstudio-plugin" | "mcp";
  description: string;
  author: {
    name: string;
    handle?: string;
  };
  categories: string[];
  tags: string[];
  links: {
    homepage: string;
    repository?: string;
  };
  runtime: {
    local: RuntimeValue;
    networkRequired: RuntimeValue;
    apiKeyRequired: RuntimeValue;
  };
  platforms: Array<"macos" | "windows" | "linux">;
  source: ToolSource;
  risks?: string[];
}

interface HubEvidence {
  confidence?: "low" | "medium" | "high";
}

interface HubEnrichedPlugin {
  identifier: string;
  owner: string;
  name: string;
  description: string;
  hubUrl: string;
  updatedAt: string | null;
  downloads: number;
  likes: number;
  enrichment: {
    detailFetched: boolean;
    capabilities: Record<string, HubEvidence[]>;
    risks: Record<string, HubEvidence[]>;
    runtime: {
      local: RuntimeValue;
      networkRequired: RuntimeValue;
      apiKeyRequired: RuntimeValue;
    };
  };
}

interface HubEnrichedSnapshot {
  plugins?: HubEnrichedPlugin[];
}

const hubSnapshotPath = fileURLToPath(
  new URL("../../../../generated/lmstudio-enriched.json", import.meta.url),
);

function loadHubDiscoveries(): HubEnrichedPlugin[] {
  try {
    const snapshot = JSON.parse(readFileSync(hubSnapshotPath, "utf8")) as HubEnrichedSnapshot;
    return Array.isArray(snapshot.plugins) ? snapshot.plugins : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    console.warn("Ignoring invalid LM Studio enrichment snapshot:", error);
    return [];
  }
}

function isUsefulHubCandidate(plugin: HubEnrichedPlugin): boolean {
  const description = plugin.description.trim();
  if (description.length < 20) return false;

  const obviousNonProductName = /(?:^|[-_\s])(test|demo|example|placeholder)(?:$|[-_\s])/i;
  if (obviousNonProductName.test(plugin.name)) return false;

  const capabilities = Object.keys(plugin.enrichment.capabilities);
  return capabilities.length > 0 || plugin.downloads >= 25;
}

function toHubTool(plugin: HubEnrichedPlugin): Tool {
  const capabilities = Object.keys(plugin.enrichment.capabilities);
  const risks = Object.keys(plugin.enrichment.risks);

  return {
    schemaVersion: 1,
    id: plugin.identifier,
    name: plugin.name,
    type: "lmstudio-plugin",
    description: plugin.description.trim(),
    author: {
      name: plugin.owner,
      handle: plugin.owner,
    },
    categories: capabilities.length ? capabilities : ["uncategorized"],
    tags: capabilities,
    links: {
      homepage: plugin.hubUrl || `https://lmstudio.ai/${plugin.identifier}`,
    },
    runtime: plugin.enrichment.runtime,
    platforms: [],
    source: {
      kind: "hub-discovery",
      experimental: true,
      downloads: plugin.downloads,
      likes: plugin.likes,
      updatedAt: plugin.updatedAt,
    },
    risks,
  };
}

const curatedTools = (catalogData.tools as Omit<Tool, "source">[]).map(
  (tool): Tool => ({
    ...tool,
    source: { kind: "curated" },
  }),
);

const curatedIds = new Set(curatedTools.map((tool) => tool.id));
const hubTools = loadHubDiscoveries()
  .filter(isUsefulHubCandidate)
  .filter((plugin) => !curatedIds.has(plugin.identifier))
  .map(toHubTool);

export const tools = [...curatedTools, ...hubTools];
tools.sort((a, b) => {
  if (a.source.kind !== b.source.kind) return a.source.kind === "curated" ? -1 : 1;
  return a.name.localeCompare(b.name);
});

export const curatedCount = curatedTools.length;
export const hubDiscoveryCount = hubTools.length;

export function toolSlug(tool: Tool): string {
  const slashless = tool.id.replaceAll("/", "-");
  const normalized = slashless.replaceAll(/[^a-zA-Z0-9-]/g, "-");
  return normalized.toLowerCase();
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => toolSlug(tool) === slug);
}

const categoryValues = tools.flatMap((tool) => tool.categories);
const platformValues = tools.flatMap((tool) => tool.platforms);

export const categories = [...new Set(categoryValues)].sort();
export const platforms = [...new Set(platformValues)].sort();
