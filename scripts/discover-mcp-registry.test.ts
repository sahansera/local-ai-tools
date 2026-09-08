import assert from "node:assert/strict";
import test from "node:test";
import { fetchMcpRegistry } from "./discover-mcp-registry.ts";

test("fetchMcpRegistry follows cursors, requests latest versions, and removes deleted entries", async () => {
  const requested: string[] = [];
  const pages = [
    {
      servers: [
        {
          server: {
            name: "io.example/alpha",
            description: "Alpha server",
            version: "1.0.0",
          },
          _meta: {
            "io.modelcontextprotocol.registry/official": {
              status: "active",
            },
          },
        },
      ],
      metadata: { nextCursor: "next-page" },
    },
    {
      servers: [
        {
          server: {
            name: "io.example/beta",
            description: "Beta server",
            version: "2.0.0",
          },
          _meta: {
            "io.modelcontextprotocol.registry/official": {
              status: "deleted",
            },
          },
        },
        {
          server: {
            name: "io.example/gamma",
            description: "Gamma server",
            version: "3.0.0",
          },
        },
      ],
      metadata: {},
    },
  ];

  const fetcher = (async (input: URL | RequestInfo) => {
    const url = new URL(input.toString());
    requested.push(url.toString());
    const payload = pages.shift();
    assert.ok(payload);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  const result = await fetchMcpRegistry(
    fetcher,
    "https://registry.example.test",
  );

  assert.deepEqual(
    result.map((entry) => entry.server.name),
    ["io.example/alpha", "io.example/gamma"],
  );
  assert.equal(requested.length, 2);
  assert.equal(new URL(requested[0]).searchParams.get("version"), "latest");
  assert.equal(new URL(requested[0]).searchParams.get("limit"), "100");
  assert.equal(new URL(requested[1]).searchParams.get("cursor"), "next-page");
});

test("fetchMcpRegistry fails closed on malformed responses", async () => {
  const fetcher = (async () =>
    new Response(JSON.stringify({ metadata: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  await assert.rejects(
    () => fetchMcpRegistry(fetcher, "https://registry.example.test"),
    /servers array/,
  );
});
