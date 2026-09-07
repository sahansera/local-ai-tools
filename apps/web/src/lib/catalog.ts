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

const catalogTools = catalogData.tools as Tool[];
export const tools = [...catalogTools];
tools.sort((a, b) => a.name.localeCompare(b.name));

export function toolSlug(tool: Tool): string {
  const slashless = tool.id.replaceAll('/', '-');
  const normalized = slashless.replaceAll(/[^a-zA-Z0-9-]/g, '-');
  return normalized.toLowerCase();
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => toolSlug(tool) === slug);
}

const categoryValues = tools.flatMap((tool) => tool.categories);
const platformValues = tools.flatMap((tool) => tool.platforms);

export const categories = [...new Set(categoryValues)].sort();
export const platforms = [...new Set(platformValues)].sort();
