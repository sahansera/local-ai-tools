import { sitemapRoutes } from "../lib/sitemap";
import { canonicalUrl, SITEMAP_CHUNK_SIZE, xmlEscape } from "../lib/seo";

export function GET() {
  const site = import.meta.env.SITE ?? "http://localhost";
  const base = import.meta.env.BASE_URL;
  const locations = Array.from(
    { length: Math.ceil(sitemapRoutes.length / SITEMAP_CHUNK_SIZE) },
    (_, page) => canonicalUrl(site, base, `sitemaps/${page}.xml`),
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map((url) => `<sitemap><loc>${xmlEscape(url)}</loc></sitemap>`).join("")}</sitemapindex>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
