import assert from "node:assert/strict";
import test from "node:test";
import { classifyPlugin } from "./lmstudio-classifier.js";

test("classifies local video tooling conservatively", () => {
  const result = classifyPlugin(
    "Fully local FFmpeg video inspection, trimming and HEVC conversion. No API key and no network required.",
  );

  assert.ok(result.capabilities.video);
  assert.equal(result.runtime.local, true);
  assert.equal(result.runtime.networkRequired, false);
  assert.equal(result.runtime.apiKeyRequired, false);
});

test("detects memory and context management separately", () => {
  const result = classifyPlugin(
    "Persistent memory plus a context compactor that reduces token usage in long conversations.",
  );

  assert.ok(result.capabilities.memory);
  assert.ok(result.capabilities["context-management"]);
  assert.equal(result.runtime.apiKeyRequired, "unknown");
});

test("detects filesystem and shell risk signals", () => {
  const result = classifyPlugin(
    "Agent toolkit can read files, edit files, and execute shell commands from the local workspace.",
  );

  assert.ok(result.capabilities.files);
  assert.ok(result.capabilities.shell);
  assert.ok(result.risks["filesystem-read"]);
  assert.ok(result.risks["filesystem-write"]);
  assert.ok(result.risks["shell-execution"]);
});

test("does not interpret ordinary context tokens as credentials", () => {
  const result = classifyPlugin(
    "Compresses old context to reduce token usage and preserve the context window.",
  );

  assert.equal(result.risks.credentials, undefined);
  assert.equal(result.runtime.apiKeyRequired, "unknown");
});

test("web search implies network access but not necessarily an API key", () => {
  const result = classifyPlugin(
    "Web search plugin using public search engines to research current information.",
  );

  assert.ok(result.capabilities["web-search"]);
  assert.ok(result.risks["network-access"]);
  assert.equal(result.runtime.networkRequired, true);
  assert.equal(result.runtime.apiKeyRequired, "unknown");
});
