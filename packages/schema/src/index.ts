import { z } from 'zod';

export const toolTypeSchema = z.enum(['lmstudio-plugin', 'mcp']);
export const platformSchema = z.enum(['macos', 'windows', 'linux']);

export const toolSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  type: toolTypeSchema,
  description: z.string().min(1),
  author: z.object({
    name: z.string().min(1),
    handle: z.string().min(1).optional(),
  }),
  categories: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string().min(1)).default([]),
  links: z.object({
    homepage: z.url(),
    repository: z.url().optional(),
  }),
  runtime: z.object({
    local: z.boolean(),
    networkRequired: z.boolean(),
    apiKeyRequired: z.boolean(),
  }),
  platforms: z.array(platformSchema).min(1),
  source: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('lmstudio-hub'),
      owner: z.string().min(1),
      slug: z.string().min(1),
    }),
    z.object({
      type: z.literal('mcp-registry'),
      id: z.string().min(1),
    }),
    z.object({
      type: z.literal('manual'),
    }),
  ]),
});

export type Tool = z.infer<typeof toolSchema>;
export type ToolType = z.infer<typeof toolTypeSchema>;
export type Platform = z.infer<typeof platformSchema>;

export const toolJsonSchema = z.toJSONSchema(toolSchema, {
  target: 'draft-2020-12',
});
