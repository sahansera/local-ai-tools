import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolSchema, type Tool } from "@local-ai-tools/schema";
import YAML from "yaml";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageDir, "../../..");
const dataDir = path.join(repoRoot, "data", "tools");
const generatedDir = path.join(repoRoot, "generated");

export async function loadTools(): Promise<Tool[]> {
  const files = (await readdir(dataDir))
    .filter((file) => /\.ya?ml$/i.test(file))
    .sort();
  const tools: Tool[] = [];
  const ids = new Set<string>();

  for (const file of files) {
    const raw = await readFile(path.join(dataDir, file), "utf8");
    const parsed = toolSchema.parse(YAML.parse(raw));
    if (ids.has(parsed.id)) {
      throw new Error(`Duplicate tool id: ${parsed.id}`);
    }
    ids.add(parsed.id);
    tools.push(parsed);
  }

  return tools;
}

export async function validateCatalog(): Promise<Tool[]> {
  return loadTools();
}

export async function generateCatalog(): Promise<void> {
  const tools = await loadTools();
  await mkdir(generatedDir, { recursive: true });
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    tools,
  };
  await writeFile(
    path.join(generatedDir, "catalog.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}
