import { expect, test } from "@playwright/test";

test("title screen opens and game canvas boots", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("banner").getByRole("heading", { name: "GNFL" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Game Canvas" })).toBeVisible();

  await page.getByRole("button", { name: "Open Game Canvas" }).click();

  const host = page.getByTestId("phaser-host");
  await expect(host).toBeVisible();
  await expect(page.getByTestId("phaser-status")).toHaveText(/Phaser: ready/, {
    timeout: 15_000,
  });
  await expect(host.locator("canvas")).toBeVisible({ timeout: 15_000 });
});
