import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

import {
  izinkanKamera,
  jepret,
  masukHasil,
  matikanGesture,
} from "./helpers"

/* M5: halaman Hasil, unduh PNG (FR-11), dan cetak 4R (FR-12).
   Konvensi navigasi ada di tests/e2e/helpers.ts. */

const PNG_BYTE_LIMIT = 2_097_152
const ORIGIN = "http://localhost:3000"
const HALAMAN_APP = [
  "/",
  "/privasi",
  "/booth/layout",
  "/booth/capture",
  "/booth/customize",
  "/booth/result",
]
const AWALAN_STATIS = [
  "/_next/",
  /* Rute fon server pengembangan Next.js: tetap berkas statis milik aplikasi. */
  "/__nextjs_font/",
  "/brand/",
  "/mediapipe/",
  "/models/",
  "/stickers/",
  "/favicon.ico",
  "/icon.svg",
  "/apple-icon.png",
]
/* M9 (PRD §4): satu-satunya rute server yang boleh disentuh alur dasar adalah
   analitik first-party. Isinya hanya nama peristiwa, tanpa gambar dan tanpa
   data pribadi, jadi uji privasi di bawah tetap berlaku untuk fotonya. */
const RUTE_DIIZINKAN = ["/api/events"]

test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

/** Gambar PNG: delapan bita tanda tangan lalu IHDR dengan lebarnya di offset 16. */
function periksaPng(bytes: Buffer, lebar: number, tinggi: number): void {
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect(bytes.toString("ascii", 12, 16)).toBe("IHDR")
  expect(bytes.readUInt32BE(16)).toBe(lebar)
  expect(bytes.readUInt32BE(20)).toBe(tinggi)
  expect(bytes.byteLength).toBeLessThan(PNG_BYTE_LIMIT)
}

/** Jumlah halaman dari keluaran `page.pdf` Chromium. */
function jumlahHalaman(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length
}

test("alur penuh Welcome sampai unduh tanpa permintaan non-statis", async ({
  page,
}) => {
  const requests: string[] = []
  page.on("request", (request) => requests.push(request.url()))

  await page.goto("/")
  await page.getByRole("link", { name: "Mulai Foto" }).first().click()
  await page.waitForURL("**/booth/layout")

  await page.getByRole("radio", { name: "Strip 4 foto" }).check()
  await page.getByRole("button", { name: "Mulai Foto" }).click()
  await page.waitForURL("**/booth/capture")

  await izinkanKamera(page)
  for (let nomor = 0; nomor < 4; nomor += 1) {
    await jepret(page)
  }

  await page.getByRole("button", { name: "Lanjut Hias" }).click()
  await page.waitForURL("**/booth/customize")
  await expect(page.locator("canvas")).toBeVisible()

  await page.getByRole("link", { name: "Selesai & Unduh" }).click()
  await page.waitForURL("**/booth/result")
  await expect(page.getByAltText("Pratinjau strip")).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Selesai & Unduh" }).click(),
  ])

  await expect(page.getByText("Strip tersimpan di perangkatmu.")).toBeVisible()
  expect(download.suggestedFilename()).toMatch(/^snapme-\d{8}-\d{4}\.png$/)

  const berkas = await download.path()
  if (berkas === null) {
    throw new Error("Berkas unduhan tidak tersedia di disk")
  }
  periksaPng(readFileSync(berkas), 600, 1800)

  /* FR-11 dan PRD GS-01: seluruh alur dasar hanya boleh menyentuh aset statis
     dan halaman aplikasi, tanpa satu pun permintaan ke rute server. */
  const diLuarAturan = requests.filter((url) => {
    const parsed = new URL(url)
    if (parsed.protocol === "data:" || parsed.protocol === "blob:") {
      return false
    }
    if (parsed.origin !== ORIGIN) {
      return true
    }
    if (parsed.pathname.startsWith("/api/")) {
      return !RUTE_DIIZINKAN.includes(parsed.pathname)
    }
    return !(
      HALAMAN_APP.includes(parsed.pathname) ||
      AWALAN_STATIS.some((awalan) => parsed.pathname.startsWith(awalan))
    )
  })
  expect(diLuarAturan).toEqual([])
})

test("pratinjau cetak satu halaman 4R", async ({ page }) => {
  await masukHasil(page)

  const lembar = page.locator("[data-print-sheet]")
  const gambar = page.locator("[data-print-sheet] img")

  await expect(lembar).toBeHidden()
  await expect
    .poll(() =>
      gambar.evaluate((node) => (node as HTMLImageElement).naturalWidth)
    )
    .toBeGreaterThan(0)

  await page.emulateMedia({ media: "print" })
  await expect(lembar).toBeVisible()

  /* 4 x 6 inci pada 96 dpi = 384 x 576 px. */
  const kotak = await gambar.boundingBox()
  if (kotak === null) {
    throw new Error("Lembar cetak tidak terukur")
  }
  expect(Math.round(kotak.width)).toBe(384)
  expect(Math.round(kotak.height)).toBe(576)

  const pdf = await page.pdf({ preferCSSPageSize: true })
  expect(jumlahHalaman(pdf)).toBe(1)

  await page.emulateMedia({ media: null })
})

test("Mulai dari awal mengosongkan sesi", async ({ page }) => {
  await masukHasil(page)

  await page.getByRole("button", { name: "Mulai dari awal" }).click()
  await page.waitForURL("**/booth/layout")
  await expect(page.getByText("Belum dipilih")).toBeVisible()

  await page.goto("/booth/capture")
  await page.waitForURL("**/booth/layout")
})

/* FR-03: Grid 2 x 2 diekspor 1200 x 1800 dan dicetak sebagai satu lembar 4R. */
test("Grid 2 x 2 diekspor 1200 x 1800 dan dicetak satu halaman", async ({
  page,
}) => {
  await page.goto("/booth/layout")
  await page.getByRole("radio", { name: "Grid 2 x 2" }).check()
  await expect(page.getByText("4 foto, ekspor 1200 x 1800 px.")).toBeVisible()
  await expect(
    page.getByText("Ekspor 1200 x 1800 px", { exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Mulai Foto" }).click()
  await page.waitForURL("**/booth/capture")

  await izinkanKamera(page)
  for (let nomor = 0; nomor < 4; nomor += 1) {
    await jepret(page)
  }

  await page.getByRole("button", { name: "Lanjut Hias" }).click()
  await page.waitForURL("**/booth/customize")
  await expect(page.locator("canvas")).toBeVisible()
  await expect(
    page.getByText("Ekspor 1200 x 1800 px (4 x 6 inci, 300 dpi)")
  ).toBeVisible()

  await page.getByRole("link", { name: "Selesai & Unduh" }).click()
  await page.waitForURL("**/booth/result")
  await expect(page.getByAltText("Pratinjau strip")).toBeVisible()
  await expect(page.getByText("Ekspor 1200 x 1800 px", { exact: true })).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Selesai & Unduh" }).click(),
  ])

  const berkas = await download.path()
  if (berkas === null) {
    throw new Error("Berkas unduhan tidak tersedia di disk")
  }
  periksaPng(readFileSync(berkas), 1200, 1800)

  await page.emulateMedia({ media: "print" })
  await expect(page.locator("[data-print-sheet]")).toBeVisible()
  const pdf = await page.pdf({ preferCSSPageSize: true })
  expect(jumlahHalaman(pdf)).toBe(1)
  await page.emulateMedia({ media: null })
})
