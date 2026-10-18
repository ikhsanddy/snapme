import { expect, test } from "@playwright/test"

test("alur Welcome ke pilih layout ke kerangka foto", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Foto strip tanpa antre." })
  ).toBeVisible()

  await page.getByRole("link", { name: "Mulai Foto" }).last().click()
  await expect(page).toHaveURL("/booth/layout")

  await page.getByRole("radio", { name: "Strip 4 foto" }).check()

  const lanjut = page.getByRole("button", { name: "Mulai Foto" })
  await expect(lanjut).toBeEnabled()
  await lanjut.click()

  await expect(page).toHaveURL("/booth/capture")
  await expect(page.getByRole("heading", { name: "Ambil Foto" })).toBeVisible()

  const langkahFoto = page
    .getByRole("listitem")
    .filter({ hasText: "Foto" })
    .first()
  await expect(langkahFoto).toHaveAttribute("aria-current", "step")
})

test("langkah tanpa prasyarat dialihkan ke pilih layout", async ({ page }) => {
  await page.goto("/booth/capture")

  await expect(page).toHaveURL("/booth/layout")
})

test("halaman privasi terbuka", async ({ page }) => {
  await page.goto("/privasi")

  await expect(page.getByRole("heading", { name: "Privasi" })).toBeVisible()
})

/* FR-01: aksi utama terlihat tanpa menggulir pada 360 x 640 dan 1366 x 768. */
for (const viewport of [
  { width: 360, height: 640 },
  { width: 1366, height: 768 },
]) {
  test(`aksi utama terlihat tanpa menggulir pada ${viewport.width} x ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto("/")

    const cta = page.getByRole("link", { name: "Mulai Foto" }).last()
    await expect(cta).toBeVisible()

    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    const box = await cta.boundingBox()
    expect(box).not.toBeNull()
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
      viewport.height
    )
  })
}
