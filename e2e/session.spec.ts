import path from "node:path"
import { expect, test } from "@playwright/test"

import {
  izinkanKamera,
  jepret,
  masukAmbilFoto,
  masukHasil,
  masukHias,
  matikanGesture,
  srcSlot,
} from "./helpers"

/* FR-14: sesi bertahan saat halaman dimuat ulang lewat IndexedDB. SessionSync
   menyimpan dengan jeda 400 ms setelah perubahan terakhir, jadi uji ini
   menunggu jeda itu sebelum memuat ulang. */

const FIXTURE_DIR = path.join(process.cwd(), "e2e", "fixtures")
const JEDA_SIMPAN_MS = 700

test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

test("foto pulih setelah dimuat ulang", async ({ page }) => {
  await masukAmbilFoto(page)
  await izinkanKamera(page)
  await jepret(page)
  await jepret(page)
  await expect(page.getByText("2/4")).toBeVisible()
  await page.waitForTimeout(JEDA_SIMPAN_MS)

  await page.reload()

  await expect(page.getByText("2/4")).toBeVisible()
  await expect(page.getByRole("button", { name: "Ulang foto 1" })).toBeVisible()
  await expect.poll(() => srcSlot(page, 1)).not.toBeNull()
  await expect.poll(() => srcSlot(page, 2)).not.toBeNull()
})

test("pilihan hias pulih setelah dimuat ulang", async ({ page }) => {
  await masukHias(page)
  await page.getByRole("button", { name: "Malam", exact: true }).click()
  await page.waitForTimeout(JEDA_SIMPAN_MS)

  await page.reload()

  await expect(page.locator("canvas")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Malam", exact: true })
  ).toHaveClass(/ring-selected/)
})

test("Mulai dari awal menghapus penyimpanan", async ({ page }) => {
  await masukHasil(page)

  await page.getByRole("button", { name: "Mulai dari awal" }).click()
  await page.waitForURL("**/booth/layout")
  await expect(page.getByText("Belum dipilih")).toBeVisible()

  /* Muat ulang membuktikan rekaman lama tidak kembali. */
  await page.goto("/booth/capture")
  await page.waitForURL("**/booth/layout")
  await page.reload()
  await page.waitForURL("**/booth/layout")
  await expect(page.getByText("Belum dipilih")).toBeVisible()
})

test("alur galeri dari Welcome tidak tertimpa rekaman lama", async ({ page }) => {
  /* Sesi pertama tersimpan lewat kamera: satu foto. */
  await masukAmbilFoto(page)
  await izinkanKamera(page)
  await jepret(page)
  await page.waitForTimeout(JEDA_SIMPAN_MS)

  /* Dari Welcome, empat foto galeri harus menggantikan rekaman itu utuh. */
  await page.goto("/")
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Pakai Foto Galeri" }).click()
  await (await chooser).setFiles([
    path.join(FIXTURE_DIR, "foto-1.png"),
    path.join(FIXTURE_DIR, "foto-2.png"),
    path.join(FIXTURE_DIR, "foto-3.png"),
    path.join(FIXTURE_DIR, "foto-4.png"),
  ])

  await page.waitForURL("**/booth/customize")
  await expect(page.getByText("4 foto siap", { exact: true })).toBeVisible()
})
