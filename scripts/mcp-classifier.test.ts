import assert from "node:assert/strict";
import test from "node:test";
import { classifyMcp } from "./mcp-classifier.ts";

test("capabilities include source field, rule, confidence and excerpt", () => {
  const result = classifyMcp({
    title: "Memory",
    description:
      "Read PDF documents from a PostgreSQL database and automate workflows.",
  });
  for (const category of ["memory", "files", "databases", "automation"])
    assert.ok(result.capabilities[category]?.length, category);
  assert.equal(result.capabilities.memory[0].field, "title");
  assert.match(result.capabilities.databases[0].excerpt, /PostgreSQL/);
  assert.equal(result.capabilities.databases[0].confidence, "medium");
});

test("unknown capabilities and runtime remain unknown; negation is conservative", () => {
  const result = classifyMcp({
    description: "A general-purpose integration. No database support.",
  });
  assert.deepEqual(result.capabilities, {});
  assert.equal(result.runtime.local, "unknown");
  assert.equal(result.runtime.offlineCapable, "unknown");
  assert.equal(result.runtime.apiKeyRequired, "unknown");
});

test("local package execution does not establish offline or API-key claims", () => {
  const result = classifyMcp({
    description: "Web search through a cloud API",
    packages: [{}],
  });
  assert.equal(result.runtime.local, true);
  assert.equal(result.runtime.networkRequired, "unknown");
  assert.equal(result.runtime.offlineCapable, "unknown");
  assert.equal(result.runtime.apiKeyRequired, "unknown");
  assert.ok(result.capabilities["web-search"]);
});

test("remote-only transport needs a network; mixed modes remain unknown", () => {
  assert.deepEqual(classifyMcp({ remotes: [{}] }).runtime, {
    local: false,
    networkRequired: true,
    apiKeyRequired: "unknown",
    offlineCapable: false,
  });
  assert.equal(
    classifyMcp({ packages: [{}], remotes: [{}] }).runtime.local,
    "unknown",
  );
});
