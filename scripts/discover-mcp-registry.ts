import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export interface McpRegistryPackage {
  registryType: string;
  identifier: string;
  version?: string;
  runtimeHint?: string;
  transport?: {
    type?: string;
  };
}

export interface McpRegistryRemote {
  type?: string;
  url?: string;
}

export interface McpRegistryServerDetail {
  name: string;
  description: string;
  title?: string;
  version: string;
  websiteUrl?: string;
  repository?: {
    url?: string;
    source?: string;
    id?: string;
    subfolder?: string;
  };
  packages?: McpRegistryPackage[];
  remotes?: McpRegistryRemote[];
}

export interface McpRegistryOfficialMeta {
  status?: string;
  publishedAt?: string;
  updatedAt?: string;
  isLatest?: boolean;
}

export interface McpRegistryServerResponse {
  server: McpRegistryServerDetail;
  _meta?: {
    "io.modelcontextprotocol.registry/official"?: McpRegistryOfficialMeta;
    [key: string]: unknown;
  };
}

interface McpRegistryListResponse {
  servers?: McpRegistryServerResponse[];
  metadata?: {
    count?: number;
    nextCursor?: string;
  };
}

export interface McpRegistrySnapshot {
  source: "mcp-registry";
  apiVersion: "v0.1";
  fetchedAt: string;
  count: number;
  servers: McpRegistryServerResponse[];
}

const DEFAULT_BASE_URL = "https://registry.modelcontextprotocol.io";
const PAGE_LIMIT = 100;

export async function fetchMcpRegistry(
  fetcher: typeof fetch = fetch,
  baseUrl = DEFAULT_BASE_URL,
): Promise<McpRegistryServerResponse[]> {
  const servers: McpRegistryServerResponse[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL("/v0.1/servers", baseUrl);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("version", "latest");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetcher(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "local-ai-tools/registry-ingestion",
      },
    });

    if (!response.ok) {
      throw new Error(
        `MCP Registry request failed (${response.status} ${response.statusText}) for ${url}`,
      );
    }

    const payload = (await response.json()) as McpRegistryListResponse;
    if (!Array.isArray(payload.servers)) {
      throw new Error("MCP Registry response did not contain a servers array");
    }

    servers.push(...payload.servers);
    cursor = payload.metadata?.nextCursor || undefined;
  } while (cursor);

  const latestByName = new Map<string, McpRegistryServerResponse>();
  for (const entry of servers) {
    const name = entry.server?.name;
    if (!name) continue;

    const status =
      entry._meta?.["io.modelcontextprotocol.registry/official"]?.status;
    if (status === "deleted") continue;

    latestByName.set(name, entry);
  }

  return [...latestByName.values()].sort((a, b) =>
    a.server.name.localeCompare(b.server.name),
  );
}

async function main() {
  const baseUrl = process.env.MCP_REGISTRY_BASE_URL ?? DEFAULT_BASE_URL;
  const servers = await fetchMcpRegistry(fetch, baseUrl);
  const snapshot: McpRegistrySnapshot = {
    source: "mcp-registry",
    apiVersion: "v0.1",
    fetchedAt: new Date().toISOString(),
    count: servers.length,
    servers,
  };

  await mkdir("generated", { recursive: true });
  await writeFile(
    "generated/mcp-registry.json",
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );

  const localPackageCount = servers.filter(
    (entry) => (entry.server.packages?.length ?? 0) > 0,
  ).length;
  const remoteCount = servers.filter(
    (entry) => (entry.server.remotes?.length ?? 0) > 0,
  ).length;

  console.log(`Fetched ${servers.length} MCP Registry servers.`);
  console.log(
    `${localPackageCount} expose installable packages; ${remoteCount} expose remote transports.`,
  );
  console.log("Wrote generated/mcp-registry.json.");
}

const entrypoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;
if (entrypoint && import.meta.url === entrypoint) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
