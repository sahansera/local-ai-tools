import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { gzipSync } from "node:zlib";
import { createSearchIndex, searchScores } from "../apps/web/public/search.js";

const file = process.argv[2] ?? "apps/web/dist/browse.json";
const bytes = readFileSync(file);
const start = performance.now();
const tools = JSON.parse(bytes.toString()).tools;
const parsed = performance.now();
const heap = process.memoryUsage().heapUsed;
const index = createSearchIndex(tools);
const indexed = performance.now();
const rows = [
  "edit videos",
  "search the internet",
  "remember conversations",
  "read my documents",
  "vidoe",
  "postgres",
].map((query) => {
  const samples: number[] = [];
  let count = 0;
  for (let i = 0; i < 11; i++) {
    const before = performance.now();
    count = searchScores(index, query)?.size ?? tools.length;
    samples.push(performance.now() - before);
  }
  const firstMs = samples.shift()!;
  samples.sort((a, b) => a - b);
  return { query, count, firstMs, medianMs: samples[5], p95Ms: samples[9] };
});
console.log(
  JSON.stringify(
    {
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      tools: tools.length,
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
      jsonParseMs: parsed - start,
      indexBuildMs: indexed - parsed,
      approximateIndexHeapBytes: process.memoryUsage().heapUsed - heap,
      rows,
      limitations:
        "Node desktop CPU benchmark; excludes network, browser layout, rendering and mobile CPU. Heap delta includes query allocations and is not peak RSS.",
    },
    null,
    2,
  ),
);
