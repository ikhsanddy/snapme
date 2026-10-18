import { expect, test } from "@playwright/test"

import { masukHiasDariGaleri } from "./helpers"

/* M9: waktu ekspor strip diukur di sini dan dicatat di docs/DECISIONS.md.
   PRD §8 menargetkan ekspor selesai di bawah 2 detik; asersi di berkas ini
   sengaja longgar (10 detik) supaya tidak rapuh di mesin yang lebih lambat,
   sedangkan angka sesungguhnya diambil dari server produksi. */

test("hias sampai unduh PNG terukur", async ({ page }) => {
  test.setTimeout(120_000)
  await masukHiasDariGaleri(page)

  /* Dari mengklik "Selesai & Unduh" di langkah Hias sampai langkah Hasil siap
     mengunduh: di dalamnya termasuk ekspor kanvas (FR-11). */
  const mulaiSiap = Date.now()
  await page.getByRole("link", { name: "Selesai & Unduh" }).click()
  await page.waitForURL("**/booth/result")
  const tombol = page.getByRole("button", { name: "Selesai & Unduh" })
  await expect(tombol).toBeEnabled({ timeout: 60_000 })
  const siapMs = Date.now() - mulaiSiap

  const mulaiUnduh = Date.now()
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    tombol.click(),
  ])
  const unduhMs = Date.now() - mulaiUnduh
  expect(download.suggestedFilename()).toMatch(/^snapme-\d{8}-\d{4}\.png$/)

  /* Angka ini yang dikutip di DECISIONS.md; dibiarkan terlihat di keluaran uji
     supaya bisa dibandingkan antar-jalankan. */
  console.log(`ekspor+siap: ${siapMs} ms; unduh: ${unduhMs} ms`)
  expect(siapMs).toBeLessThan(10_000)
  expect(unduhMs).toBeLessThan(10_000)
})
