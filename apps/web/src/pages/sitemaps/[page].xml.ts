import type { APIRoute } from "astro";
import { sitemapRoutes } from "../../lib/sitemap";
import { canonicalUrl, SITEMAP_CHUNK_SIZE, urlset } from "../../lib/seo";

export function getStaticPaths() {
  return Array.from(
    { length: Math.ceil(sitemapRoutes.length / SITEMAP_CHUNK_SIZE) },
    (_, page) => ({ params: { page: String(page) }, props: { page } }),
  );
}
export const GET: APIRoute = ({ props }) => {
  const urls = sitemapRoutes
    .slice(
      props.page * SITEMAP_CHUNK_SIZE,
      (props.page + 1) * SITEMAP_CHUNK_SIZE,
    )
    .map((route) =>
      canonicalUrl(
        import.meta.env.SITE ?? "http://localhost",
        import.meta.env.BASE_URL,
        route,
      ),
    );
  return new Response(urlset(urls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
