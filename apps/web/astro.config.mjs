import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.SITE_URL,
  base: process.env.SITE_BASE ?? "/",
  vite: {
    define: {
      __CATALOG_ROOT__: JSON.stringify(
        fileURLToPath(new URL("../../", import.meta.url)),
      ),
    },
  },
});
