import type { APIRoute } from "astro";
import { toolSlug, tools } from "../lib/catalog";

export const GET: APIRoute = () => {
  const browseTools = tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    type: tool.type,
    description: tool.description,
    author: tool.author.handle ?? tool.author.name,
    categories: tool.categories,
    tags: tool.tags,
    platforms: tool.platforms,
    runtime: tool.runtime,
    source: {
      kind: tool.source.kind,
      downloads: tool.source.downloads,
      likes: tool.source.likes,
      updatedAt: tool.source.updatedAt,
    },
    version: tool.setup?.version,
    lmStudio: tool.lmStudio
      ? {
          status: tool.lmStudio.status,
          mode: tool.lmStudio.mode,
        }
      : undefined,
    href: `tools/${toolSlug(tool)}/`,
  }));

  return new Response(
    JSON.stringify({
      schemaVersion: 1,
      count: browseTools.length,
      tools: browseTools,
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
};
