import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalUrl,
  jsonLd,
  SITEMAP_CHUNK_SIZE,
  urlset,
} from "../apps/web/src/lib/seo.ts";

test("canonical URLs preserve the project base without duplication", () => {
  assert.equal(
    canonicalUrl(
      "https://example.com",
      "/local-ai-tools/",
      "categories/video/",
    ),
    "https://example.com/local-ai-tools/categories/video/",
  );
  assert.equal(
    canonicalUrl("https://example.com", "/", ""),
    "https://example.com/",
  );
});
test("sitemap XML escapes URLs and chunks below the protocol limit", () => {
  assert.match(urlset(["https://example.com/?a=1&b=2"]), /a=1&amp;b=2/);
  assert.ok(SITEMAP_CHUNK_SIZE < 50_000);
});

test("JSON-LD preserves text without allowing a closing script tag", () => {
  const value = { name: "</script><script>alert(1)</script>" };
  const json = jsonLd(value);
  assert.ok(!json.includes("<"));
  assert.deepEqual(JSON.parse(json), value);
});
