import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { refreshRegistries } from "./refresh-registries.ts";
import { SNAPSHOT_FILES, validateSnapshots } from "./registry-snapshots.ts";

async function fixture(
  directory: string,
  options: { date?: string; empty?: boolean; count?: number } = {},
) {
  await mkdir(directory, { recursive: true });
  const date = options.date ?? new Date().toISOString();
  const plugins = options.empty
    ? []
    : [
        {
          identifier: "test/tool",
          owner: "test",
          name: "tool",
          description: "test",
          family: "test/tool",
          hubUrl: "https://lmstudio.ai/test/tool",
          updatedAt: null,
          downloads: 0,
          likes: 0,
          score: 0,
        },
      ];
  const servers = Array.from({ length: options.count ?? 2 }, (_, i) => ({
    server: {
      name: `test/${i}`,
      version: "1",
      description: "test",
    },
  }));
  const source = "https://lmstudio.ai/api/v1/artifacts";
  const snapshots = [
    { source, generatedAt: date, plugins },
    {
      source,
      discoveryGeneratedAt: date,
      generatedAt: date,
      plugins: plugins.map((p) => ({
        ...p,
        enrichment: {
          detailFetched: false,
          capabilities: {},
          risks: {},
          runtime: {
            local: "unknown",
            networkRequired: "unknown",
            apiKeyRequired: "unknown",
          },
        },
      })),
    },
    {
      source: "mcp-registry",
      apiVersion: "v0.1",
      fetchedAt: date,
      count: servers.length,
      servers,
    },
  ];
  await Promise.all(
    SNAPSHOT_FILES.map((file, i) =>
      writeFile(path.join(directory, file), JSON.stringify(snapshots[i])),
    ),
  );
}

async function temporary(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), "registry-test-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("first refresh fails closed without a valid fallback", () =>
  temporary(async (root) => {
    const directory = path.join(root, "generated");
    await assert.rejects(
      refreshRegistries(directory, async () => {
        throw new Error("outage");
      }),
      /outage/,
    );
    await assert.rejects(
      refreshRegistries(directory, async (stage) =>
        fixture(path.join(stage, "generated"), { empty: true }),
      ),
    );
  }));

test("partial refresh, empty data and count collapse preserve original bytes", () =>
  temporary(async (root) => {
    const directory = path.join(root, "generated");
    await fixture(directory, { count: 10 });
    const original = await Promise.all(
      SNAPSHOT_FILES.map((file) =>
        readFile(path.join(directory, file), "utf8"),
      ),
    );
    const attempts = [
      async (stage: string) => {
        await fixture(path.join(stage, "generated"));
        throw new Error("second source down");
      },
      async (stage: string) =>
        fixture(path.join(stage, "generated"), { empty: true }),
      async (stage: string) =>
        fixture(path.join(stage, "generated"), { count: 1 }),
    ];
    for (const fetcher of attempts) {
      assert.equal(await refreshRegistries(directory, fetcher), "retained");
      assert.deepEqual(
        await Promise.all(
          SNAPSHOT_FILES.map((file) =>
            readFile(path.join(directory, file), "utf8"),
          ),
        ),
        original,
      );
    }
  }));

test("complete validated refresh is promoted and preserves authored catalogue", () =>
  temporary(async (root) => {
    const directory = path.join(root, "generated");
    await fixture(directory);
    await writeFile(path.join(directory, "catalog.json"), "authored");
    assert.equal(
      await refreshRegistries(directory, async (stage) =>
        fixture(path.join(stage, "generated"), { count: 3 }),
      ),
      "fresh",
    );
    assert.equal((await validateSnapshots(directory)).mcpCount, 3);
    assert.equal(
      await readFile(path.join(directory, "catalog.json"), "utf8"),
      "authored",
    );
  }));

test("stale or malformed cache cannot hide upstream failure", () =>
  temporary(async (root) => {
    const directory = path.join(root, "generated");
    await fixture(directory, { date: "2020-01-01T00:00:00Z" });
    await assert.rejects(
      refreshRegistries(directory, async () => {
        throw new Error("outage");
      }),
      /outage/,
    );
    await fixture(directory);
    await writeFile(path.join(directory, "mcp-registry.json"), "{}");
    await assert.rejects(validateSnapshots(directory));
  }));
