import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const HUB_ARTIFACTS_URL = "https://lmstudio.ai/api/v1/artifacts";
const DEFAULT_OUTPUT = "generated/lmstudio-discovery.json";

interface HubArtifactCurrent {
  revisionNumber?: number;
  downloadCount?: number;
  artifactUrl?: string;
}

interface HubArtifact {
  identifier: string;
  owner: string;
  name: string;
  type: string;
  private?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  restricted?: string;
  forkedFromArtifactIdentifier?: string | null;
  forkCount?: number;
  likeCount?: number;
  downloadCount?: number;
  current?: HubArtifactCurrent;
  staffPickedAt?: string | null;
  discussionCount?: number;
  url?: string;
}

interface HubArtifactsResponse {
  publicArtifacts?: HubArtifact[];
}

interface DiscoveryPlugin {
  identifier: string;
  owner: string;
  name: string;
  description: string;
  hubUrl: string;
  updatedAt: string | null;
  createdAt: string | null;
  downloads: number;
  likes: number;
  forks: number;
  discussions: number;
  revision: number | null;
  staffPicked: boolean;
  forkedFrom: string | null;
  family: string;
  score: number;
}

function numeric(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function rankPlugin(artifact: HubArtifact): number {
  const downloads = numeric(artifact.downloadCount);
  const likes = numeric(artifact.likeCount);
  const forks = numeric(artifact.forkCount);
  const discussions = numeric(artifact.discussionCount);
  const staffPickBonus = artifact.staffPickedAt ? 50 : 0;

  // Discovery ranking only. It is deliberately simple and transparent so we can
  // inspect whether Hub engagement signals are useful before productizing them.
  return Math.round(
    Math.log10(downloads + 1) * 25 +
      Math.log10(likes + 1) * 35 +
      Math.log10(forks + 1) * 15 +
      Math.log10(discussions + 1) * 10 +
      staffPickBonus,
  );
}

function normalizePlugin(artifact: HubArtifact): DiscoveryPlugin {
  const family = artifact.forkedFromArtifactIdentifier || artifact.identifier;

  return {
    identifier: artifact.identifier,
    owner: artifact.owner,
    name: artifact.name,
    description: artifact.description?.trim() || "",
    hubUrl:
      artifact.current?.artifactUrl ||
      artifact.url ||
      `https://lmstudio.ai/${artifact.identifier}`,
    updatedAt: artifact.updatedAt || null,
    createdAt: artifact.createdAt || null,
    downloads: numeric(artifact.downloadCount),
    likes: numeric(artifact.likeCount),
    forks: numeric(artifact.forkCount),
    discussions: numeric(artifact.discussionCount),
    revision: artifact.current?.revisionNumber ?? null,
    staffPicked: Boolean(artifact.staffPickedAt),
    forkedFrom: artifact.forkedFromArtifactIdentifier || null,
    family,
    score: rankPlugin(artifact),
  };
}

function pickFamilyRepresentatives(
  plugins: DiscoveryPlugin[],
): DiscoveryPlugin[] {
  const representatives = new Map<string, DiscoveryPlugin>();

  for (const plugin of plugins) {
    const existing = representatives.get(plugin.family);
    if (!existing || plugin.score > existing.score) {
      representatives.set(plugin.family, plugin);
    }
  }

  return [...representatives.values()].sort(
    (left, right) =>
      right.score - left.score || right.downloads - left.downloads,
  );
}

async function main(): Promise<void> {
  const outputArgIndex = process.argv.indexOf("--output");
  const outputPath =
    outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
      ? process.argv[outputArgIndex + 1]
      : DEFAULT_OUTPUT;

  const response = await fetch(HUB_ARTIFACTS_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "local-ai-tools-discovery/0.1 (+https://github.com/sahansera/local-ai-tools)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `LM Studio Hub request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as HubArtifactsResponse;
  const artifacts = payload.publicArtifacts;
  if (!Array.isArray(artifacts)) {
    throw new Error("LM Studio Hub response did not contain publicArtifacts[]");
  }

  const plugins = artifacts
    .filter(
      (artifact) => artifact.type === "plugin" && artifact.private !== true,
    )
    .map(normalizePlugin)
    .sort(
      (left, right) =>
        right.score - left.score || right.downloads - left.downloads,
    );

  const representatives = pickFamilyRepresentatives(plugins);
  const output = {
    source: HUB_ARTIFACTS_URL,
    generatedAt: new Date().toISOString(),
    warning:
      "Experimental discovery data from an undocumented LM Studio Hub endpoint. Review before using in the public catalogue.",
    counts: {
      artifacts: artifacts.length,
      plugins: plugins.length,
      pluginFamilies: representatives.length,
    },
    topCandidates: representatives.slice(0, 100),
    plugins,
  };

  const absoluteOutput = resolve(outputPath);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(
    absoluteOutput,
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );

  console.log(`Fetched ${artifacts.length} public Hub artifacts.`);
  console.log(
    `Found ${plugins.length} plugins across ${representatives.length} fork families.`,
  );
  console.log(`Wrote discovery snapshot to ${outputPath}.`);

  console.log("\nTop plugin candidates:");
  for (const plugin of representatives.slice(0, 15)) {
    console.log(
      `${String(plugin.score).padStart(3)}  ${String(plugin.downloads).padStart(6)} downloads  ${String(plugin.likes).padStart(3)} likes  ${plugin.identifier}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
