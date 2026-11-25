export const SITEMAP_CHUNK_SIZE = 10_000;

export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function canonicalUrl(site: string, base: string, route = ""): string {
  const prefix = base.replace(/^\/+|\/+$/g, "");
  return new URL(
    `/${[prefix, route.replace(/^\//, "")].filter(Boolean).join("/")}`,
    site,
  ).href;
}

export function urlset(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${xmlEscape(url)}</loc></url>`).join("")}</urlset>`;
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
