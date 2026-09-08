import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.SITE_URL,
  base: process.env.SITE_BASE ?? "/",
});
