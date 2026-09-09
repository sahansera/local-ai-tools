import assert from "node:assert/strict";
import test from "node:test";
import { toolSchema } from "../packages/schema/src/index.ts";
import { safeWebUrl } from "./web-url.ts";

const baseTool = {
  schemaVersion: 1 as const,
  id: "example/tool",
  name: "Example Tool",
  type: "mcp" as const,
  description: "Example description",
  author: { name: "Example" },
  categories: ["example"],
  tags: [],
  runtime: {
    local: true,
    networkRequired: false,
    apiKeyRequired: false,
  },
  platforms: ["macos" as const],
  source: { type: "manual" as const },
};

test("safeWebUrl only allows HTTP and HTTPS", () => {
  assert.equal(
    safeWebUrl("https://example.com/path"),
    "https://example.com/path",
  );
  assert.equal(
    safeWebUrl("http://localhost:3000"),
    "http://localhost:3000/",
  );
  assert.equal(safeWebUrl("javascript:alert(1)"), undefined);
  assert.equal(safeWebUrl("file:///tmp/example"), undefined);
  assert.equal(safeWebUrl("not a url"), undefined);
});

test("catalogue schema rejects non-web link schemes", () => {
  assert.equal(
    toolSchema.safeParse({
      ...baseTool,
      links: { homepage: "https://example.com" },
    }).success,
    true,
  );

  assert.equal(
    toolSchema.safeParse({
      ...baseTool,
      links: { homepage: "javascript:alert(1)" },
    }).success,
    false,
  );

  assert.equal(
    toolSchema.safeParse({
      ...baseTool,
      links: {
        homepage: "https://example.com",
        repository: "file:///tmp/repo",
      },
    }).success,
    false,
  );
});
