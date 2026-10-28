import { expect, test } from "@playwright/test"

import { matikanGesture } from "./helpers"

/* M8 (SE-01 sampai SE-09): Strip Estafet. Backend Cloudflare sudah dibongkar,
   jadi tidak ada estafet yang tersimpan: spek ini memeriksa halaman /r yang
   selalu menjawab 404 dan tidak diindeks. Alur estafet penuh tidak bisa
   dijalankan lagi tanpa server. */

test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

test("halaman estafet yang tidak ada menjawab 404 dan tidak diindeks", async ({
  page,
}) => {
  /* Di server pengembangan yang baru dinyalakan, kompilasi rute bisa memicu
     muat ulang halaman setelah `goto`; asersinya diulang supaya uji ini tidak
     bergantung pada itu. */
  await expect(async () => {
    const response = await page.goto("/r/tidakada1234")
    expect(response?.status()).toBe(404)
    await expect(page.getByText("Halaman tidak ditemukan.")).toBeVisible({
      timeout: 5_000,
    })
  }).toPass({ timeout: 60_000 })
})
