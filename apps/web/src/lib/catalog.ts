import catalogData from '../../../../generated/catalog.json';

export interface Tool {
  schemaVersion: 1;
  id: string;
  name: string;
  type: 'lmstudio-plugin' | 'mcp';
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
    local: boolean;
    networkRequired: boolean;
    apiKeyRequired: boolean;
  };
  platforms: Array<'macos' | 'windows' | 'linux'>;
}

export const tools = (catalogData.tools as Tool[]).toSorted((a, b) => a.name.localeCompare(b.name));

export function toolSlug(tool: Tool): string {
  return tool.id.replaceAll('/', '-').replaceAll(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => toolSlug(tool) === slug);
}

export const categories = [...new Set(tools.flatMap((tool) => tool.categories))].sort();
export const platforms = [...new Set(tools.flatMap((tool) => tool.platforms))].sort();
