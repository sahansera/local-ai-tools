import catalogData from '../../../../generated/catalog.json';

export type Tool = (typeof catalogData.tools)[number];

export const tools = [...catalogData.tools].sort((a, b) => a.name.localeCompare(b.name));

export function toolSlug(tool: Tool): string {
  return tool.id.replaceAll('/', '-').replaceAll(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => toolSlug(tool) === slug);
}

export const categories = [...new Set(tools.flatMap((tool) => tool.categories))].sort();
export const platforms = [...new Set(tools.flatMap((tool) => tool.platforms))].sort();
