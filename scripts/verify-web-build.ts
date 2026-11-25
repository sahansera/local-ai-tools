import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolRoutes } from "../apps/web/src/lib/catalog.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "apps/web/dist");
const base =
  `/${(process.env.SITE_BASE ?? "").replace(/^\/+|\/+$/g, "")}`.replace(
    /\/$/,
    "",
  );
const browse = JSON.parse(
  readFileSync(path.join(dist, "browse.json"), "utf8"),
) as {
  count: number;
  tools: { id: string; href: string }[];
};
assert.equal(browse.count, toolRoutes.canonical.size);
assert.equal(browse.tools.length, browse.count);
assert.equal(new Set(browse.tools.map((tool) => tool.href)).size, browse.count);
for (const tool of browse.tools) {
  assert.match(tool.href, /^tools\/[a-z0-9-]+\/$/);
  const slug = tool.href.split("/")[1];
  assert.equal(toolRoutes.canonical.get(slug)?.id, tool.id);
  assert.ok(
    existsSync(path.join(dist, tool.href, "index.html")),
    `Missing page for ${tool.id}`,
  );
}
for (const [legacy, canonical] of toolRoutes.redirects) {
  const html = readFileSync(
    path.join(dist, "tools", legacy, "index.html"),
    "utf8",
  );
  assert.ok(
    html.includes(`${base}/tools/${canonical}/`),
    `Incorrect redirect for ${legacy}`,
  );
  assert.ok(
    !html.includes("data-pagefind-body"),
    `Redirect indexed as a listing: ${legacy}`,
  );
}
const homepage = readFileSync(path.join(dist, "index.html"), "utf8");
assert.ok(
  homepage.includes(`href="${base}/tools/`),
  "Incorrect base path on homepage",
);
assert.deepEqual(
  readFileSync(path.join(root, "apps/web/public/app-icon.png")),
  readFileSync(path.join(dist, "app-icon.png")),
);
console.log(
  `Verified ${browse.count} unique listing pages and ${toolRoutes.redirects.size} legacy redirects.`,
);

// GitHub Pages limits published sites to 1 GB. Reject oversized output before
// saving it as known-good or handing it to the deployment action.
function outputBytes(directory: string): number {
  return readdirSync(directory, { withFileTypes: true }).reduce(
    (total, entry) => {
      const file = path.join(directory, entry.name);
      return (
        total + (entry.isDirectory() ? outputBytes(file) : statSync(file).size)
      );
    },
    0,
  );
}
const bytes = outputBytes(dist);
console.log(
  `Static output: ${bytes.toLocaleString("en-US")} bytes (1 GB Pages limit).`,
);
assert.ok(
  bytes < 1_000_000_000,
  "Static output exceeds GitHub Pages' 1 GB limit",
);
