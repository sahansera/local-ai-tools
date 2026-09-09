import assert from "node:assert/strict";
import test from "node:test";
import {
  createToolRoutes,
  legacyToolSlug,
  toolSlug,
} from "../apps/web/src/lib/tool-routes.ts";

test("distinct registry IDs retain distinct routes despite punctuation and case", () => {
  const tools = [
    "mcp:io.github.daedalus/mcp_reverse_engineering",
    "mcp:io.github.daedalus/mcp-reverse-engineering",
    "mcp:io.github.dfch/biz-dfch-specmgr",
    "mcp:io.github.dfch/biz.dfch.specmgr",
    "mcp:io.github.Clocknext/mcp",
    "mcp:io.github.ClockNext/mcp",
  ].map((id) => ({ id }));
  const routes = createToolRoutes(tools);
  assert.equal(routes.canonical.size, tools.length);
  assert.equal(routes.redirects.size, 0);
  for (const tool of tools) {
    assert.equal(routes.canonical.get(toolSlug(tool))?.id, tool.id);
    assert.equal(
      createToolRoutes([tool]).canonical.keys().next().value,
      toolSlug(tool),
    );
  }
});

test("unambiguous old routes redirect to the exact tool's canonical route", () => {
  const tool = { id: "sahansera/local-video-tools" };
  const routes = createToolRoutes([tool]);
  assert.equal(
    routes.redirects.get("sahansera-local-video-tools"),
    toolSlug(tool),
  );
  assert.equal(
    routes.canonical.get(routes.redirects.get(legacyToolSlug(tool))!),
    tool,
  );
});

test("duplicate tool identities fail the build instead of overwriting a page", () => {
  assert.throws(
    () => createToolRoutes([{ id: "example/tool" }, { id: "example/tool" }]),
    /Duplicate tool route/,
  );
});

test("long identifiers produce filesystem-safe stable slugs", () => {
  const tool = { id: `io.example/${"long-".repeat(100)}` };
  assert.ok(toolSlug(tool).length < 255);
  assert.match(toolSlug(tool), /^[a-z0-9-]+$/);
  assert.equal(createToolRoutes([tool]).redirects.size, 0);
});
