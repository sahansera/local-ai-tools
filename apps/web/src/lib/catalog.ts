import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import catalogData from "../../../../generated/catalog.json";
import { createToolRoutes } from "./tool-routes";
export { toolSlug } from "./tool-routes";
import {
  evaluateLmStudioCompatibility,
  type LmStudioCompatibility,
  type RegistryPackage,
  type RegistryRemote,
} from "./lmstudio-mcp";

export type RuntimeValue = boolean | "unknown";
export type ToolSourceKind =
  "lmstudio-hub" | "mcp-registry" | "community" | "manual";

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

export interface ToolSetup {
  version?: string;
  status?: string;
  packageTypes?: string[];
  transports?: string[];
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
  setup?: ToolSetup;
  lmStudio?: LmStudioCompatibility;
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

interface McpRegistryServerDetail {
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  websiteUrl?: string;
  repository?: {
    url?: string;
    source?: string;
  };
  packages?: RegistryPackage[];
  remotes?: RegistryRemote[];
}

interface McpRegistryServerResponse {
  server?: McpRegistryServerDetail;
  _meta?: {
    "io.modelcontextprotocol.registry/official"?: {
      status?: string;
      publishedAt?: string;
      updatedAt?: string;
      isLatest?: boolean;
    };
    [key: string]: unknown;
  };
}

interface McpRegistrySnapshot {
  servers?: McpRegistryServerResponse[];
}

// Astro bundles this module before prerendering, so import.meta.url no longer
// points at the source tree. The config fixes the build root; CLI checks use
// the source-relative fallback when running this module directly.
declare const __CATALOG_ROOT__: string;
const repoRoot =
  typeof __CATALOG_ROOT__ === "string"
    ? __CATALOG_ROOT__
    : fileURLToPath(new URL("../../../../", import.meta.url));
const hubDiscoveryPath = path.join(
  repoRoot,
  "generated/lmstudio-discovery.json",
);
const hubEnrichedPath = path.join(repoRoot, "generated/lmstudio-enriched.json");
const mcpRegistryPath = path.join(repoRoot, "generated/mcp-registry.json");

function loadSnapshot<T>(path: string): T | null {
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

function unique(values: Array<string | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function repositoryOwner(repositoryUrl?: string): string | undefined {
  if (!repositoryUrl) return undefined;

  try {
    const url = new URL(repositoryUrl);
    return url.pathname.split("/").filter(Boolean)[0];
  } catch {
    return undefined;
  }
}

function toMcpTool(entry: McpRegistryServerResponse): Tool | null {
  const server = entry.server;
  if (!server?.name || !server.description || !server.version) return null;

  const official = entry._meta?.["io.modelcontextprotocol.registry/official"];
  if (official?.status === "deleted") return null;

  const packages = Array.isArray(server.packages) ? server.packages : [];
  const remotes = Array.isArray(server.remotes) ? server.remotes : [];
  const hasPackages = packages.length > 0;
  const hasRemotes = remotes.length > 0;
  const packageTypes = unique(packages.map((pkg) => pkg.registryType));
  const transports = unique([
    ...packages.map((pkg) => pkg.transport?.type),
    ...remotes.map((remote) => remote.type),
  ]);
  const repository = server.repository?.url;
  const namespace = server.name.split("/")[0];
  const author = repositoryOwner(repository) ?? namespace;
  const displayName =
    server.title?.trim() || server.name.split("/").at(-1) || server.name;
  const registryApiUrl = `https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(server.name)}/versions/latest`;
  const lmStudio = evaluateLmStudioCompatibility({
    name: server.name,
    packages,
    remotes,
  });

  return {
    schemaVersion: 1,
    id: `mcp:${server.name}`,
    name: displayName,
    type: "mcp",
    description: server.description.trim(),
    author: {
      name: author,
      handle: author,
    },
    categories: ["uncategorized"],
    tags: unique([
      ...packageTypes,
      ...transports,
      `lm-studio-${lmStudio.status}`,
    ]),
    links: {
      homepage: server.websiteUrl || repository || registryApiUrl,
      repository,
    },
    runtime: {
      local:
        hasPackages && !hasRemotes
          ? true
          : hasRemotes && !hasPackages
            ? false
            : "unknown",
      networkRequired: hasRemotes && !hasPackages ? true : "unknown",
      apiKeyRequired: "unknown",
    },
    platforms: [],
    source: {
      kind: "mcp-registry",
      updatedAt: official?.updatedAt ?? official?.publishedAt,
    },
    setup: {
      version: server.version,
      status: official?.status,
      packageTypes,
      transports,
    },
    lmStudio,
  };
}

const discoverySnapshot = loadSnapshot<HubDiscoverySnapshot>(hubDiscoveryPath);
const enrichedSnapshot = loadSnapshot<HubEnrichedSnapshot>(hubEnrichedPath);
const mcpSnapshot = loadSnapshot<McpRegistrySnapshot>(mcpRegistryPath);
const discoveredPlugins = Array.isArray(discoverySnapshot?.plugins)
  ? discoverySnapshot.plugins
  : [];
const enrichedPlugins = Array.isArray(enrichedSnapshot?.plugins)
  ? enrichedSnapshot.plugins
  : [];
const registryServers = Array.isArray(mcpSnapshot?.servers)
  ? mcpSnapshot.servers
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
const authoredFamilies = new Set(
  authoredTools
    .map((tool) => discoveredById.get(tool.id)?.family)
    .filter((family): family is string => Boolean(family)),
);
const hubTools = familyRepresentatives(discoveredPlugins)
  .filter(
    (plugin) =>
      !authoredIds.has(plugin.identifier) &&
      !authoredFamilies.has(plugin.family),
  )
  .map((plugin) => toHubTool(plugin, enrichedById.get(plugin.identifier)));
const mcpTools = registryServers
  .map(toMcpTool)
  .filter((tool): tool is Tool => Boolean(tool))
  .filter((tool) => !authoredIds.has(tool.id));

export const tools = [...authoredTools, ...hubTools, ...mcpTools].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const lmStudioHubCount = tools.filter(
  (tool) => tool.source.kind === "lmstudio-hub",
).length;
export const mcpRegistryCount = tools.filter(
  (tool) => tool.source.kind === "mcp-registry",
).length;
export const lmStudioReadyMcpCount = tools.filter(
  (tool) => tool.type === "mcp" && tool.lmStudio?.status === "ready",
).length;
export const lmStudioSetupMcpCount = tools.filter(
  (tool) => tool.type === "mcp" && tool.lmStudio?.status === "setup-required",
).length;
export const lmStudioUnknownMcpCount = tools.filter(
  (tool) => tool.type === "mcp" && tool.lmStudio?.status === "unknown",
).length;
export const enrichedToolCount = tools.filter((tool) =>
  Boolean(tool.source.inferred),
).length;

export const toolRoutes = createToolRoutes(tools);

export function getToolBySlug(slug: string): Tool | undefined {
  return toolRoutes.canonical.get(slug);
}

const categoryValues = tools.flatMap((tool) => tool.categories);
const platformValues = tools.flatMap((tool) => tool.platforms);

export const categories = [...new Set(categoryValues)].sort();
export const platforms = [...new Set(platformValues)].sort();
