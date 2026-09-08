import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import catalogData from "../../../../generated/catalog.json";

export type RuntimeValue = boolean | "unknown";
export type ToolSourceKind =
  | "lmstudio-hub"
  | "mcp-registry"
  | "community"
  | "manual";

export interface ToolInference {
  capabilities?: boolean;
  runtime?: boolean;
  risks?: boolean;
  platforms?: boolean;
}

export interface ToolSource {
  kind: ToolSourceKind;
  downloads?: number;
  likes?: number;
  updatedAt?: string | null;
  inferred?: ToolInference;
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

interface RawCatalogSource {
  type?: string;
}

type RawCatalogTool = Omit<Tool, "source"> & {
  source?: RawCatalogSource;
};

interface HubEvidence {
  confidence?: "low" | "medium" | "high";
}

interface HubDiscoveryPlugin {
  identifier: string;
  owner: string;
  name: string;
  description: string;
  hubUrl: string;
  updatedAt: string | null;
  createdAt?: string | null;
  downloads: number;
  likes: number;
  forks?: number;
  discussions?: number;
  revision?: number | null;
  staffPicked?: boolean;
  forkedFrom?: string | null;
  family: string;
  score: number;
}

interface HubEnrichedPlugin extends HubDiscoveryPlugin {
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

interface HubDiscoverySnapshot {
  plugins?: HubDiscoveryPlugin[];
}

interface HubEnrichedSnapshot {
  plugins?: HubEnrichedPlugin[];
}

const hubDiscoveryPath = fileURLToPath(
  new URL("../../../../generated/lmstudio-discovery.json", import.meta.url),
);
const hubEnrichedPath = fileURLToPath(
  new URL("../../../../generated/lmstudio-enriched.json", import.meta.url),
);

function loadSnapshot<T extends { plugins?: unknown[] }>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    console.warn(`Ignoring invalid generated snapshot at ${path}:`, error);
    return null;
  }
}

function familyRepresentatives(
  plugins: HubDiscoveryPlugin[],
): HubDiscoveryPlugin[] {
  const families = new Map<string, HubDiscoveryPlugin>();

  for (const plugin of plugins) {
    const current = families.get(plugin.family);
    if (
      !current ||
      plugin.score > current.score ||
      (plugin.score === current.score && plugin.downloads > current.downloads)
    ) {
      families.set(plugin.family, plugin);
    }
  }

  return [...families.values()];
}

function sourceKind(source?: RawCatalogSource): ToolSourceKind {
  switch (source?.type) {
    case "lmstudio-hub":
      return "lmstudio-hub";
    case "mcp-registry":
      return "mcp-registry";
    case "community":
      return "community";
    default:
      return "manual";
  }
}

function toHubTool(
  plugin: HubDiscoveryPlugin,
  enriched?: HubEnrichedPlugin,
): Tool {
  const capabilities = enriched
    ? Object.keys(enriched.enrichment.capabilities)
    : [];
  const risks = enriched ? Object.keys(enriched.enrichment.risks) : [];

  return {
    schemaVersion: 1,
    id: plugin.identifier,
    name: plugin.name,
    type: "lmstudio-plugin",
    description:
      plugin.description.trim() || "No description provided on LM Studio Hub.",
    author: {
      name: plugin.owner,
      handle: plugin.owner,
    },
    categories: capabilities.length ? capabilities : ["uncategorized"],
    tags: capabilities,
    links: {
      homepage: plugin.hubUrl || `https://lmstudio.ai/${plugin.identifier}`,
    },
    runtime: enriched?.enrichment.runtime ?? {
      local: "unknown",
      networkRequired: "unknown",
      apiKeyRequired: "unknown",
    },
    platforms: [],
    source: {
      kind: "lmstudio-hub",
      downloads: plugin.downloads,
      likes: plugin.likes,
      updatedAt: plugin.updatedAt,
      inferred: enriched
        ? {
            capabilities: true,
            runtime: true,
            risks: true,
          }
        : undefined,
    },
    risks,
  };
}

const discoverySnapshot = loadSnapshot<HubDiscoverySnapshot>(hubDiscoveryPath);
const enrichedSnapshot = loadSnapshot<HubEnrichedSnapshot>(hubEnrichedPath);
const discoveredPlugins = Array.isArray(discoverySnapshot?.plugins)
  ? discoverySnapshot.plugins
  : [];
const enrichedPlugins = Array.isArray(enrichedSnapshot?.plugins)
  ? enrichedSnapshot.plugins
  : [];

const discoveredById = new Map(
  discoveredPlugins.map((plugin) => [plugin.identifier, plugin]),
);
const enrichedById = new Map(
  enrichedPlugins.map((plugin) => [plugin.identifier, plugin]),
);

const authoredTools = (catalogData.tools as RawCatalogTool[]).map(
  (rawTool): Tool => {
    const { source: rawSource, ...tool } = rawTool;
    const discovered = discoveredById.get(rawTool.id);

    return {
      ...tool,
      source: {
        kind: sourceKind(rawSource),
        downloads: discovered?.downloads,
        likes: discovered?.likes,
        updatedAt: discovered?.updatedAt,
      },
    };
  },
);

const authoredIds = new Set(authoredTools.map((tool) => tool.id));
const hubTools = familyRepresentatives(discoveredPlugins)
  .filter((plugin) => !authoredIds.has(plugin.identifier))
  .map((plugin) => toHubTool(plugin, enrichedById.get(plugin.identifier)));

export const tools = [...authoredTools, ...hubTools].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const lmStudioHubCount = tools.filter(
  (tool) => tool.source.kind === "lmstudio-hub",
).length;
export const enrichedToolCount = tools.filter((tool) =>
  Boolean(tool.source.inferred),
).length;

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
