import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  discoverySchema,
  enrichedSchema,
  mcpSnapshotSchema,
} from "../packages/schema/src/registries.ts";

export const SNAPSHOT_FILES = [
  "lmstudio-discovery.json",
  "lmstudio-enriched.json",
  "mcp-registry.json",
] as const;
export const MAX_SNAPSHOT_AGE_MS = 30 * 86_400_000;

export async function validateSnapshots(directory: string, now = Date.now()) {
  const [discovery, enriched, mcp] = await Promise.all(
    SNAPSHOT_FILES.map(async (file) =>
      JSON.parse(await readFile(path.join(directory, file), "utf8")),
    ),
  );
  const hub = discoverySchema.parse(discovery);
  const details = enrichedSchema.parse(enriched);
  const registry = mcpSnapshotSchema.parse(mcp);
  for (const timestamp of [
    hub.generatedAt,
    details.generatedAt,
    registry.fetchedAt,
  ]) {
    const age = now - Date.parse(timestamp);
    if (age < -300_000 || age > MAX_SNAPSHOT_AGE_MS) {
      throw new Error(
        `Registry snapshot outside the allowed 30-day window: ${timestamp}`,
      );
    }
  }
  const hubIds = new Set(hub.plugins.map((plugin) => plugin.identifier));
  if (
    hubIds.size !== hub.plugins.length ||
    new Set(details.plugins.map((plugin) => plugin.identifier)).size !==
      details.plugins.length ||
    new Set(registry.servers.map((entry) => entry.server.name)).size !==
      registry.count ||
    details.discoveryGeneratedAt !== hub.generatedAt ||
    details.plugins.some((plugin) => !hubIds.has(plugin.identifier))
  ) {
    throw new Error(
      "Registry snapshots have duplicates or mismatched provenance",
    );
  }
  return {
    hubFetchedAt: hub.generatedAt,
    mcpFetchedAt: registry.fetchedAt,
    hubCount: hub.plugins.length,
    mcpCount: registry.count,
  };
}

export function validateCountChange(
  current: { hubCount: number; mcpCount: number },
  previous: { hubCount: number; mcpCount: number },
) {
  for (const key of ["hubCount", "mcpCount"] as const) {
    if (current[key] < previous[key] * 0.5) {
      throw new Error(
        `Suspicious registry count drop: ${key} ${previous[key]} → ${current[key]}`,
      );
    }
  }
}
