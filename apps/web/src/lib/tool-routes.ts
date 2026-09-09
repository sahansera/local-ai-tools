import { createHash } from "node:crypto";

interface IdentifiedTool {
  id: string;
}

export function legacyToolSlug(tool: IdentifiedTool): string {
  return tool.id.replaceAll(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
}

export function toolSlug(tool: IdentifiedTool): string {
  const digest = createHash("sha256")
    .update(tool.id)
    .digest("hex")
    .slice(0, 16);
  return `${legacyToolSlug(tool).slice(0, 150)}--${digest}`;
}

export function createToolRoutes<T extends IdentifiedTool>(tools: T[]) {
  const canonical = new Map<string, T>();
  const legacy = new Map<string, T[]>();
  for (const tool of tools) {
    const slug = toolSlug(tool);
    if (canonical.has(slug)) {
      throw new Error(`Duplicate tool route: ${slug} (${tool.id})`);
    }
    canonical.set(slug, tool);
    const oldSlug = legacyToolSlug(tool);
    legacy.set(oldSlug, [...(legacy.get(oldSlug) ?? []), tool]);
  }

  // Ambiguous old URLs cannot safely redirect to either listing.
  const redirects = new Map<string, string>();
  for (const [slug, matches] of legacy) {
    if (matches.length === 1 && slug.length <= 200 && !canonical.has(slug)) {
      redirects.set(slug, toolSlug(matches[0]));
    }
  }
  return { canonical, redirects };
}
