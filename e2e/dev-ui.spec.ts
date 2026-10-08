import { expect, test } from "@playwright/test"

test("galeri /dev/ui terbuka dan memuat tombol", async ({ page }) => {
  await page.goto("/dev/ui")

  await expect(
    page.getByRole("heading", { name: "Galeri komponen" })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Mulai Foto" })).toBeVisible()
})
