import { z } from "zod";

const text = z.string().trim().min(1);
const date = z.iso.datetime({ offset: true });
const runtime = z.object({
  local: z.union([z.boolean(), z.literal("unknown")]),
  networkRequired: z.union([z.boolean(), z.literal("unknown")]),
  apiKeyRequired: z.union([z.boolean(), z.literal("unknown")]),
});
const variable = z
  .object({
    name: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    valueHint: z.string().optional(),
    placeholder: z.string().optional(),
    format: z.string().optional(),
    choices: z.array(z.string()).optional(),
    value: z.string().optional(),
    default: z.string().optional(),
    isRequired: z.boolean().optional(),
    isSecret: z.boolean().optional(),
  })
  .passthrough();
const transport = z
  .object({
    type: z.string().optional(),
    url: z.string().optional(),
    headers: z.array(variable).optional(),
    variables: z.record(z.string(), variable).optional(),
  })
  .passthrough();
export const registryEntrySchema = z
  .object({
    server: z
      .object({
        name: text,
        description: z.string(),
        title: z.string().optional(),
        version: text,
        websiteUrl: z.string().optional(),
        repository: z
          .object({ url: z.string().optional() })
          .passthrough()
          .optional(),
        packages: z
          .array(
            z
              .object({
                registryType: text,
                identifier: text,
                version: z.string().optional(),
                runtimeHint: z.string().optional(),
                runtimeArguments: z.array(variable).optional(),
                packageArguments: z.array(variable).optional(),
                environmentVariables: z.array(variable).optional(),
                transport: transport.optional(),
              })
              .passthrough(),
          )
          .optional(),
        remotes: z.array(transport).optional(),
      })
      .passthrough(),
    _meta: z
      .object({
        "io.modelcontextprotocol.registry/official": z
          .object({
            status: z.string().optional(),
            updatedAt: z.string().optional(),
            publishedAt: z.string().optional(),
            isLatest: z.boolean().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const hubPlugin = z
  .object({
    identifier: text,
    owner: text,
    name: text,
    description: z.string(),
    family: text,
    hubUrl: z.url(),
    updatedAt: z.string().nullable(),
    downloads: z.number().finite().nonnegative(),
    likes: z.number().finite().nonnegative(),
    score: z.number().finite(),
  })
  .passthrough();
export const discoverySchema = z
  .object({
    source: z.literal("https://lmstudio.ai/api/v1/artifacts"),
    generatedAt: date,
    plugins: z.array(hubPlugin).min(1),
  })
  .passthrough();
const evidence = z.record(
  z.string(),
  z.array(
    z
      .object({
        confidence: z.enum(["low", "medium", "high"]),
      })
      .passthrough(),
  ),
);
export const enrichedSchema = z
  .object({
    source: z.literal("https://lmstudio.ai/api/v1/artifacts"),
    discoveryGeneratedAt: date,
    generatedAt: date,
    plugins: z
      .array(
        hubPlugin.extend({
          enrichment: z
            .object({
              detailFetched: z.boolean(),
              capabilities: evidence,
              risks: evidence,
              runtime,
            })
            .passthrough(),
        }),
      )
      .min(1),
  })
  .passthrough();
export const mcpSnapshotSchema = z
  .object({
    source: z.literal("mcp-registry"),
    apiVersion: z.literal("v0.1"),
    fetchedAt: date,
    count: z.number().int().positive(),
    servers: z.array(registryEntrySchema).min(1),
  })
  .passthrough()
  .refine(
    (snapshot) => snapshot.count === snapshot.servers.length,
    "MCP count mismatch",
  );
