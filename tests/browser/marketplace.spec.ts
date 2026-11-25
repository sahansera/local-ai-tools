import { test, expect } from "@playwright/test";

test("search URL, filters, pagination and browser history", async ({
  page,
}) => {
  await page.goto("?q=edit+videos&type=mcp&sort=name");
  await expect(page.getByRole("searchbox")).toHaveValue("edit videos");
  await expect(page.locator("#result-count")).toHaveText("30 tools");
  await expect(page.locator("#tool-grid .tool-card")).toHaveCount(24);
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.locator("#tool-grid .tool-card")).toHaveCount(30);
  await page.locator("#compatibility-filter").selectOption("unknown");
  await expect(page.locator("#result-count")).toHaveText("0 tools");
  await expect(page).toHaveURL(/compatibility=unknown/);
  await page.goBack();
  await expect(page.locator("#compatibility-filter")).toHaveValue("ready");
  await expect(page.locator("#result-count")).toHaveText("30 tools");
  await page.reload();
  await expect(page.locator("#result-count")).toHaveText("30 tools");
});

test("initial and dynamic cards retain details, icons and installation links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("");
  const card = page.locator('[data-id="sahansera/local-video-tools"]');
  const initialHref = await card
    .locator('[data-role="install-link"]')
    .getAttribute("href");
  const initialDetails = await card
    .locator('[data-role="link"]')
    .getAttribute("href");
  await page.locator("#type-filter").selectOption("lmstudio-plugin");
  await expect(page.locator("#result-count")).toHaveText("1 tool");
  await expect(card.locator('[data-role="install-link"]')).toHaveAttribute(
    "href",
    initialHref!,
  );
  await expect(card.locator('[data-role="link"]')).toHaveAttribute(
    "href",
    new URL(initialDetails!, page.url()).href,
  );
  await expect(card.locator("svg")).toHaveCount(2);
  await card.locator('[data-role="link"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('a[href^="lmstudio://plugin"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("MCP details expose config and withholds installation until credentials are configured", async ({
  page,
}) => {
  await page.goto("?q=Registry+Video+01&type=mcp");
  await expect(page.locator("#result-count")).toHaveText("1 tool");
  const card = page.locator("#tool-grid .tool-card");
  await expect(card.locator('[data-role="install-link"]')).toHaveAttribute(
    "href",
    /^lmstudio:\/\//,
  );
  await card.locator('[data-role="link"]').click();
  await expect(page.locator("pre")).toContainText("npx");
  await page.goto("?q=Credential&compatibility=all");
  await expect(page.locator("#result-count")).toHaveText("1 tool");
  await expect(
    page.locator('[data-role="install-link"]').first(),
  ).toHaveAttribute("aria-disabled", "true");
});

test("failed browse fetch retains initial cards and offers a working retry", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/browse.json", async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({ status: 503, body: "unavailable" });
    else await route.continue();
  });
  await page.goto("");
  const initialCount = await page.locator("#tool-grid .tool-card").count();
  await page.getByRole("searchbox").fill("video");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.locator("#tool-grid .tool-card")).toHaveCount(initialCount);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator("#result-count")).toContainText("tools");
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
  expect(attempts).toBe(2);
});
