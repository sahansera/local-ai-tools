import { categories, toolRoutes } from "./catalog";
export const categorySlugs = categories.filter(
  (category) => category !== "uncategorized" && /^[a-z0-9-]+$/.test(category),
);
export const sitemapRoutes = [
  "",
  ...categorySlugs.map((category) => `categories/${category}/`),
  ...[...toolRoutes.canonical.keys()].map((slug) => `tools/${slug}/`),
];
