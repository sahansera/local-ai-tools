import { canonicalUrl } from "../lib/seo";
export function GET() {
  const site = import.meta.env.SITE;
  return new Response(
    `User-agent: *\nAllow: /\n${site ? `Sitemap: ${canonicalUrl(site, import.meta.env.BASE_URL, "sitemap.xml")}\n` : ""}`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
