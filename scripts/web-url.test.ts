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
  const cases = [
    ["https://example.com/path", "https://example.com/path"],
    ["http://localhost:3000", "http://localhost:3000/"],
    ["javascript:alert(1)", undefined],
    ["file:///tmp/example", undefined],
    ["not a url", undefined],
  ] as const;

  for (const [input, expected] of cases) {
    assert.equal(safeWebUrl(input), expected);
  }
});

test("catalogue schema rejects non-web link schemes", () => {
  const valid = toolSchema.safeParse({
    ...baseTool,
    links: { homepage: "https://example.com" },
  });
  const scriptUrl = toolSchema.safeParse({
    ...baseTool,
    links: { homepage: "javascript:alert(1)" },
  });
  const fileUrl = toolSchema.safeParse({
    ...baseTool,
    links: {
      homepage: "https://example.com",
      repository: "file:///tmp/repo",
    },
  });

  assert.equal(valid.success, true);
  assert.equal(scriptUrl.success, false);
  assert.equal(fileUrl.success, false);
});
