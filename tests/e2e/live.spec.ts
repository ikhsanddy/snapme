import { statSync } from "node:fs"
import path from "node:path"
import { expect, test } from "@playwright/test"

import {
  canvasChecksum,
  masukHias,
  masukHasil,
  matikanGesture,
} from "./helpers"

/* M7 (SH-01 sampai SH-03): Strip Hidup. Uji ini memakai kamera palsu Chromium,
   jadi klip benar-benar terekam selama hitung mundur. Semuanya berjalan lokal
   di peramban: tidak ada lagi klip yang diunggah ke server. */
const FIXTURE_DIR = path.join(process.cwd(), "tests", "e2e", "fixtures")

test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

test("sakelar Strip Hidup memutar klip di kanvas", async ({ page }) => {
  await masukHias(page)
  const sakelar = page.getByRole("switch", { name: "Strip Hidup" })
  await expect(sakelar).toBeEnabled()
  await expect(sakelar).not.toBeChecked()

  /* Sebelum dinyalakan kanvas diam. */
  const diamSatu = await canvasChecksum(page)
  await page.waitForTimeout(500)
  expect(await canvasChecksum(page)).toBe(diamSatu)

  await sakelar.click()
  await expect(sakelar).toBeChecked()
  await expect(page.getByText("Nyala", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Versi hidup ikut diunggah saat kamu membuat link.")
  ).toBeVisible()

  /* SH-02: pratinjau benar-benar berputar, bukan hanya lencananya muncul.
     Penggambaran ulang kanvas tidak sinkron dengan klik, jadi hasilnya
     ditunggu, bukan dibandingkan tepat setelah sakelar dinyalakan (M9). */
  await expect.poll(() => canvasChecksum(page)).not.toBe(diamSatu)

  await sakelar.click()
  await expect(sakelar).not.toBeChecked()
  /* Kembali ke foto tetap: nilainya sama dengan sebelum dinyalakan. */
  await expect.poll(() => canvasChecksum(page)).toBe(diamSatu)
  const matiSatu = await canvasChecksum(page)
  await page.waitForTimeout(500)
  expect(await canvasChecksum(page)).toBe(matiSatu)
})

test("prefers-reduced-motion: pratinjau berhenti dengan tombol Putar", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await masukHias(page)

  const tanpaHidup = await canvasChecksum(page)
  await page.getByRole("switch", { name: "Strip Hidup" }).click()

  /* Berhenti: bingkai klip tidak berjalan, tetapi lencana "Klip" membuktikan
     bingkainya memang terekam (tampilannya berbeda dari saat sakelar mati).
     Penggambaran ulangnya ditunggu karena tidak sinkron dengan klik (M9). */
  await expect.poll(() => canvasChecksum(page)).not.toBe(tanpaHidup)
  const berhentiSatu = await canvasChecksum(page)
  await page.waitForTimeout(500)
  expect(await canvasChecksum(page)).toBe(berhentiSatu)

  const putar = page.getByRole("button", { name: "Putar" })
  await expect(putar).toBeVisible()
  await putar.click()
  await expect(page.getByRole("button", { name: "Jeda" })).toBeVisible()

  const jalanSatu = await canvasChecksum(page)
  await expect.poll(() => canvasChecksum(page)).not.toBe(jalanSatu)
  await page.waitForTimeout(500)
  expect(await canvasChecksum(page)).not.toBe(jalanSatu)

  await page.getByRole("button", { name: "Jeda" }).click()
  /* Berhenti lagi pada bingkai pertama, jadi tampilannya kembali ke keadaan
     sebelum diputar. */
  await expect.poll(() => canvasChecksum(page)).toBe(berhentiSatu)
  const jedaSatu = await canvasChecksum(page)
  await page.waitForTimeout(500)
  expect(await canvasChecksum(page)).toBe(jedaSatu)
})

test("tanpa klip: sakelar nonaktif dengan penjelasannya", async ({ page }) => {
  /* Foto dari galeri tidak punya klip, jadi Strip Hidup tidak punya bahan. */
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
  await expect(page.locator("canvas")).toBeVisible()

  const sakelar = page.getByRole("switch", { name: "Strip Hidup" })
  await expect(sakelar).toBeDisabled()
  await expect(sakelar).not.toBeChecked()
  await expect(
    page.getByText("Klip hanya terekam saat memotret lewat kamera.")
  ).toBeVisible()
})

test("unduh video versi hidup di langkah Hasil", async ({ page }) => {
  /* Rekaman dua putaran butuh sekitar 3 detik; batas bawaannya cukup, tetapi
     headless menambah waktu penyandian, jadi diberi ruang. */
  test.setTimeout(120_000)
  await masukHasil(page)

  const unduh = page.getByRole("button", { name: "Unduh Video" })
  await expect(unduh).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    unduh.click(),
  ])

  await expect(
    page.getByText("Video strip tersimpan di perangkatmu.")
  ).toBeVisible()
  expect(download.suggestedFilename()).toMatch(/^snapme-\d{8}-\d{4}\.(webm|mp4)$/)

  /* SH-03: durasi sekitar 3 detik, berkasnya di bawah 5 MB. */
  const berkas = await download.path()
  if (berkas === null) {
    throw new Error("Berkas unduhan tidak tersedia di disk")
  }
  const ukuran = statSync(berkas).size
  expect(ukuran).toBeGreaterThan(0)
  expect(ukuran).toBeLessThan(5_242_880)
})
