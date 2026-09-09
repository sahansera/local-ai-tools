import type { APIRoute } from "astro";
import { toolSlug, tools } from "../lib/catalog";
import { lmStudioInstallUrl, lmStudioStatus } from "../lib/lmstudio-install";

export const GET: APIRoute = () => {
  const browseTools = tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    type: tool.type,
    description: tool.description,
    author: tool.author.handle ?? tool.author.name,
    categories: tool.categories,
    tags: tool.tags.filter((tag) => !tag.startsWith("lm-studio-")),
    platforms: tool.platforms,
    runtime: tool.runtime,
    homepage: tool.links.homepage,
    risks: tool.risks ?? [],
    source: {
      kind: tool.source.kind,
      downloads: tool.source.downloads,
      likes: tool.source.likes,
      updatedAt: tool.source.updatedAt,
    },
    version: tool.setup?.version,
    compatibility: lmStudioStatus(tool),
    installUrl: lmStudioInstallUrl(tool),
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
