import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { fetchJson } from "./fetch-json.ts";
import { registryEntrySchema } from "../packages/schema/src/registries.ts";
import { safeWebUrl, safeWebUrlTemplate } from "./web-url.ts";

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

function sanitizeEntry(
  entry: McpRegistryServerResponse,
): McpRegistryServerResponse {
  const repositoryUrl = safeWebUrl(entry.server.repository?.url);
  const remotes = entry.server.remotes?.map((remote) => ({
    ...remote,
    url: safeWebUrlTemplate(remote.url),
  }));

  return {
    ...entry,
    server: {
      ...entry.server,
      websiteUrl: safeWebUrl(entry.server.websiteUrl),
      repository: entry.server.repository
        ? { ...entry.server.repository, url: repositoryUrl }
        : undefined,
      remotes,
    },
  };
}

export async function fetchMcpRegistry(
  fetcher: typeof fetch = fetch,
  baseUrl = DEFAULT_BASE_URL,
): Promise<McpRegistryServerResponse[]> {
  const servers: McpRegistryServerResponse[] = [];
  let cursor: string | undefined;
  const seenCursors = new Set<string>();
  let pageCount = 0;

  do {
    const url = new URL("/v0.1/servers", baseUrl);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("version", "latest");
    if (cursor) url.searchParams.set("cursor", cursor);

    if (++pageCount > 1000) throw new Error("MCP Registry exceeded 1000 pages");
    const payload = (await fetchJson(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "local-ai-tools/registry-ingestion",
        },
      },
      { fetcher },
    )) as McpRegistryListResponse;

    if (!payload || !Array.isArray(payload.servers)) {
      throw new Error("MCP Registry response did not contain a servers array");
    }

    servers.push(
      ...payload.servers.map((entry) => {
        registryEntrySchema.parse(entry);
        return sanitizeEntry(entry);
      }),
    );
    const next = payload.metadata?.nextCursor;
    if (next !== undefined && typeof next !== "string") {
      throw new Error("Invalid MCP Registry cursor");
    }
    cursor = next || undefined;
    if (cursor) {
      if (seenCursors.has(cursor))
        throw new Error("Repeated MCP Registry cursor");
      seenCursors.add(cursor);
    }
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

  if (latestByName.size === 0) throw new Error("MCP Registry is empty");
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
