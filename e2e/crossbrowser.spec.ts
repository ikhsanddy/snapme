import { expect, test } from "@playwright/test"

import { masukHiasDariGaleri } from "./helpers"

/* M9: uji lintas peramban (PRD §8: dua versi mayor terakhir Chrome, Edge,
   Firefox, dan Safari).

   Berkas ini sengaja tidak menyentuh kamera: perangkat media palsu adalah
   bendera Chromium, sedangkan WebKit dan Firefox tidak punya padanannya.
   Karena itu jalur foto dari galeri yang dipakai (FR-13), dan asersi pratinjau
   cetak tetap di chromium-only result.spec.ts. Berkas ini dijalankan proyek
   chromium, firefox, webkit, dan msedge (playwright.config.ts). */

test("welcome memuat aksi utama dan halaman statis menjawab judulnya", async ({
  page,
}) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Foto strip tanpa antre." })
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Mulai Foto" }).first()).toBeVisible()

  await page.goto("/privasi")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Privasi")

  await page.goto("/s/tidakada1234")
  await expect(page.getByText("Halaman tidak ditemukan.")).toBeVisible()

  await page.goto("/r/tidakada1234")
  await expect(page.getByText("Halaman tidak ditemukan.")).toBeVisible()
})

test("header keamanan terpasang di rute publik dan halaman pribadi", async ({
  page,
}) => {
  /* M9: CSP penuh berlaku untuk semua rute. Tanpa asersi ini, satu suntingan
     di `next.config.ts` bisa menghapusnya tanpa ada uji yang gagal (halaman
     tanpa CSP tetap "jalan"). */
  const beranda = await page.goto("/")
  const csp = beranda?.headers()["content-security-policy"] ?? ""
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("frame-ancestors 'none'")
  expect(csp).toContain("object-src 'none'")
  expect(csp).toContain("base-uri 'self'")
  expect(csp).toContain("wasm-unsafe-eval")

  /* Produksi tidak boleh memakai 'unsafe-eval'; server pengembangan memakainya
     untuk React, dan penandanya halaman /dev/ui (ARCHITECTURE §4). */
  await page.goto("/dev/ui")
  const produksi = await page.getByText("Hanya saat pengembangan.").isVisible()
  if (produksi) {
    expect(csp).not.toContain("'unsafe-eval'")
  }

  const privat = await page.goto("/s/tidakada1234")
  expect(privat?.headers()["x-robots-tag"]).toBe("noindex")
  expect(privat?.headers()["referrer-policy"]).toBe("no-referrer")
  expect(privat?.headers()["content-security-policy"]).toBe(csp)
})

test("alur galeri sampai unduh PNG berjalan di peramban ini", async ({ page }) => {
  test.setTimeout(120_000)
  await masukHiasDariGaleri(page)

  /* Tiga jenis hias yang mesinnya berbeda: swatch frame (kanvas), daftar
     stiker (dek), dan input teks (formulir). */
  await page.getByRole("button", { name: "Malam", exact: true }).click()
  await page.getByRole("radio", { name: "Stiker" }).click()
  await page.getByRole("button", { name: "Tempel Bintang" }).click()
  await expect(page.getByText("Stiker Bintang")).toBeVisible()

  await page.getByRole("radio", { name: "Teks" }).click()
  await page.locator("#strip-text").fill("halo dari peramban lain")
  await expect(page.locator("#strip-text")).toHaveValue("halo dari peramban lain")

  await page.getByRole("link", { name: "Selesai & Unduh" }).click()
  await page.waitForURL("**/booth/result")
  await expect(page.getByAltText("Pratinjau strip")).toBeVisible({
    timeout: 30_000,
  })

  /* Galeri tidak punya klip, jadi tombol unduh versi hidup (SH-03) memang
     tidak ada; yang diperiksa di sini tombol cetak tetap tersedia. */
  await expect(page.getByRole("button", { name: "Cetak 4R" })).toBeEnabled()

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: "Selesai & Unduh" }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^snapme-\d{8}-\d{4}\.png$/)
})
