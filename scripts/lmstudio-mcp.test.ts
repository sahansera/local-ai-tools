import assert from "node:assert/strict";
import test from "node:test";
import type { Tool } from "../apps/web/src/lib/catalog.ts";
import {
  lmStudioInstallUrl,
  lmStudioStatus,
} from "../apps/web/src/lib/lmstudio-install.ts";
import { evaluateLmStudioCompatibility } from "../apps/web/src/lib/lmstudio-mcp.ts";

test("rejects non-web and invalid resolved remote endpoints", () => {
  for (const remote of [
    { type: "streamable-http", url: "javascript:alert(1)" },
    {
      type: "streamable-http",
      url: "https://{tenant}.example.com/mcp",
      variables: { tenant: { default: "invalid host" } },
    },
  ]) {
    const result = evaluateLmStudioCompatibility({
      name: "io.example/invalid",
      remotes: [remote],
    });
    assert.equal(result.status, "unknown");
    assert.equal(result.deeplink, undefined);
  }
});

test("marks a single streamable HTTP remote as LM Studio ready", () => {
  const result = evaluateLmStudioCompatibility({
    name: "io.example/search",
    remotes: [
      {
        type: "streamable-http",
        url: "https://example.com/mcp",
      },
    ],
  });

  assert.equal(result.status, "ready");
  assert.equal(result.mode, "remote");
  assert.deepEqual(result.config, { url: "https://example.com/mcp" });
  assert.match(result.deeplink ?? "", /^lmstudio:\/\/add_mcp\?/);
});

test("keeps Add to LM Studio available when a remote MCP only needs header setup", () => {
  const result = evaluateLmStudioCompatibility({
    name: "io.example/private-search",
    remotes: [
      {
        type: "streamable-http",
        url: "https://example.com/mcp",
        headers: [
          {
            name: "Authorization",
            isRequired: true,
            placeholder: "API token",
            isSecret: true,
          },
        ],
      },
    ],
  });

  assert.equal(result.status, "setup-required");
  assert.match(result.deeplink ?? "", /^lmstudio:\/\/add_mcp\?/);
  assert.equal(result.config?.headers?.Authorization, "<API_TOKEN>");
  assert.deepEqual(result.requiredInputs, ["API token"]);
});

test("does not install unresolved remote URL templates", () => {
  const result = evaluateLmStudioCompatibility({
    name: "io.example/tenant",
    remotes: [
      {
        type: "streamable-http",
        url: "https://{tenant}.example.com/mcp",
        variables: {
          tenant: {
            isRequired: true,
            placeholder: "Tenant",
          },
        },
      },
    ],
  });

  assert.equal(result.status, "setup-required");
  assert.equal(result.config?.url, "https://<TENANT>.example.com/mcp");
  assert.equal(result.deeplink, undefined);
});

test("generates deterministic npm stdio config", () => {
  const result = evaluateLmStudioCompatibility({
    name: "io.example/files",
    packages: [
      {
        registryType: "npm",
        identifier: "@example/files-mcp",
        version: "1.2.3",
        runtimeHint: "npx",
        transport: { type: "stdio" },
      },
    ],
  });

  assert.equal(result.status, "ready");
  assert.equal(result.mode, "stdio");
  assert.deepEqual(result.config, {
    command: "npx",
    args: ["-y", "@example/files-mcp@1.2.3"],
  });
  assert.match(result.deeplink ?? "", /^lmstudio:\/\/add_mcp\?/);
});

test("does not guess unsupported package runtime hints", () => {
  const result = evaluateLmStudioCompatibility({
    name: "io.example/custom",
    packages: [
      {
        registryType: "npm",
        identifier: "@example/custom-mcp",
        runtimeHint: "node",
        transport: { type: "stdio" },
      },
    ],
  });

  assert.equal(result.status, "unknown");
  assert.equal(result.deeplink, undefined);
});

test("keeps Add to LM Studio available for stdio config templates with required env", () => {
  const result = evaluateLmStudioCompatibility({
    name: "io.example/weather",
    packages: [
      {
        registryType: "npm",
        identifier: "@example/weather-mcp",
        transport: { type: "stdio" },
        environmentVariables: [
          {
            name: "WEATHER_API_KEY",
            isRequired: true,
            isSecret: true,
          },
        ],
      },
    ],
  });

  assert.equal(result.status, "setup-required");
  assert.match(result.deeplink ?? "", /^lmstudio:\/\/add_mcp\?/);
  assert.equal(result.config?.env?.WEATHER_API_KEY, "<WEATHER_API_KEY>");
});

test("native LM Studio plugins always get the plugin deeplink", () => {
  const tool = {
    type: "lmstudio-plugin",
    id: "sahansera/local-video-tools",
  } as Tool;

  assert.equal(lmStudioStatus(tool), "ready");
  assert.equal(
    lmStudioInstallUrl(tool),
    "lmstudio://plugin?owner=sahansera&name=local-video-tools",
  );
});

test("setup-required MCPs expose their generated install template when safe", () => {
  const tool = {
    type: "mcp",
    id: "mcp:io.example/weather",
    lmStudio: {
      status: "setup-required",
      installName: "weather",
      reason: "Needs an API key",
      requirements: [],
      requiredInputs: ["WEATHER_API_KEY"],
      deeplink: "lmstudio://add_mcp?name=weather&config=abc",
    },
  } as Tool;

  assert.equal(
    lmStudioInstallUrl(tool),
    "lmstudio://add_mcp?name=weather&config=abc",
  );
});
