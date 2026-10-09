import { statSync } from "node:fs"
import path from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { masukHias, masukHasil, matikanGesture, pasangSidangBaru } from "./helpers"

/* M7 (SH-01 sampai SH-03): Strip Hidup. Uji ini memakai kamera palsu Chromium,
   jadi klip benar-benar terekam selama hitung mundur. Bagian ber-jaringan
   (unggah klip lalu pemutarannya di /s/[id]) digerbang CLOUDFLARE_E2E seperti
   share.spec.ts. */

const PERLU_PROYEK =
  "Butuh binding Cloudflare: jalankan dengan CLOUDFLARE_E2E=1 setelah .dev.vars diisi."
const FIXTURE_DIR = path.join(process.cwd(), "e2e", "fixtures")

test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

/** Sidik jari kanvas penyunting: cukup untuk membuktikan ada yang berubah. */
async function sidikJariKanvas(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas")
    if (canvas === null) {
      return -1
    }
    const data = canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height).data
    if (data === undefined) {
      return -1
    }
    let total = 0
    for (let index = 0; index < data.length; index += 97) {
      total += data[index]
    }
    return total
  })
}

test("sakelar Strip Hidup memutar klip di kanvas", async ({ page }) => {
  await masukHias(page)
  const sakelar = page.getByRole("switch", { name: "Strip Hidup" })
  await expect(sakelar).toBeEnabled()
  await expect(sakelar).not.toBeChecked()

  /* Sebelum dinyalakan kanvas diam. */
  const diamSatu = await sidikJariKanvas(page)
  await page.waitForTimeout(500)
  expect(await sidikJariKanvas(page)).toBe(diamSatu)

  await sakelar.click()
  await expect(sakelar).toBeChecked()
  await expect(page.getByText("Nyala", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Versi hidup ikut diunggah saat kamu membuat link.")
  ).toBeVisible()

  /* SH-02: pratinjau benar-benar berputar, bukan hanya lencananya muncul.
     Penggambaran ulang kanvas tidak sinkron dengan klik, jadi hasilnya
     ditunggu, bukan dibandingkan tepat setelah sakelar dinyalakan (M9). */
  await expect.poll(() => sidikJariKanvas(page)).not.toBe(diamSatu)

  await sakelar.click()
  await expect(sakelar).not.toBeChecked()
  /* Kembali ke foto tetap: nilainya sama dengan sebelum dinyalakan. */
  await expect.poll(() => sidikJariKanvas(page)).toBe(diamSatu)
  const matiSatu = await sidikJariKanvas(page)
  await page.waitForTimeout(500)
  expect(await sidikJariKanvas(page)).toBe(matiSatu)
})

test("prefers-reduced-motion: pratinjau berhenti dengan tombol Putar", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await masukHias(page)

  const tanpaHidup = await sidikJariKanvas(page)
  await page.getByRole("switch", { name: "Strip Hidup" }).click()

  /* Berhenti: bingkai klip tidak berjalan, tetapi lencana "Klip" membuktikan
     bingkainya memang terekam (tampilannya berbeda dari saat sakelar mati).
     Penggambaran ulangnya ditunggu karena tidak sinkron dengan klik (M9). */
  await expect.poll(() => sidikJariKanvas(page)).not.toBe(tanpaHidup)
  const berhentiSatu = await sidikJariKanvas(page)
  await page.waitForTimeout(500)
  expect(await sidikJariKanvas(page)).toBe(berhentiSatu)

  const putar = page.getByRole("button", { name: "Putar" })
  await expect(putar).toBeVisible()
  await putar.click()
  await expect(page.getByRole("button", { name: "Jeda" })).toBeVisible()

  const jalanSatu = await sidikJariKanvas(page)
  await expect.poll(() => sidikJariKanvas(page)).not.toBe(jalanSatu)
  await page.waitForTimeout(500)
  expect(await sidikJariKanvas(page)).not.toBe(jalanSatu)

  await page.getByRole("button", { name: "Jeda" }).click()
  /* Berhenti lagi pada bingkai pertama, jadi tampilannya kembali ke keadaan
     sebelum diputar. */
  await expect.poll(() => sidikJariKanvas(page)).toBe(berhentiSatu)
  const jedaSatu = await sidikJariKanvas(page)
  await page.waitForTimeout(500)
  expect(await sidikJariKanvas(page)).toBe(jedaSatu)
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

test.describe("versi hidup dengan binding Cloudflare", () => {
  test.skip(process.env.CLOUDFLARE_E2E !== "1", PERLU_PROYEK)

  test("link menyertakan klip dan halaman strip memutarnya", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)
    /* Sidang pembatasan laju sendiri: kuota 10 link per jam dihitung per
       sidang, jadi uji ini tidak boleh berbagi kunci dengan uji ber-link lain
       (M9, temuan tinjauan). */
    await pasangSidangBaru(page)
    await masukHias(page)
    await page.getByRole("switch", { name: "QR di strip" }).click()
    await page.getByRole("switch", { name: "Strip Hidup" }).click()
    await expect(
      page.getByText("Versi hidup ikut diunggah saat kamu membuat link.")
    ).toBeVisible()

    await page.getByRole("link", { name: "Selesai & Unduh" }).click()
    await page.waitForURL("**/booth/result")
    await expect(page.getByAltText("Pratinjau strip")).toBeVisible()

    await page.getByRole("button", { name: "Buat Link dan Unggah" }).click()
    const dialog = page.getByRole("dialog")
    /* SE-02: persetujuannya menyebut klipnya juga. */
    await expect(dialog.getByText(/klip pendek/)).toBeVisible()
    await dialog
      .getByRole("button", { name: "Buat Link dan Unggah" })
      .click()

    await expect(page.getByText("Link strip dibuat.")).toBeVisible({
      timeout: 60_000,
    })
    const alamat = page.getByTestId("strip-url")
    await expect(alamat).toContainText("/s/")
    const stripUrl = (await alamat.textContent())?.trim() ?? ""

    /* Konteks kedua mewakili teman: strip diam dan versi hidupnya tampil. */
    const teman = await browser.newContext()
    const halamanTeman = await teman.newPage()
    await halamanTeman.goto(stripUrl)
    await expect(halamanTeman.getByAltText("Strip")).toBeVisible()
    const video = halamanTeman.locator("video")
    await expect(video).toBeVisible()
    await expect(video).toHaveAttribute("src", /r2\.cloudflarestorage\.com/)
    await expect(halamanTeman.getByText("Strip Hidup")).toBeVisible()
    await teman.close()

    /* Pemilik menghapus: berkas dan barisnya hilang. */
    await page.goto(stripUrl)
    await page.getByRole("button", { name: "Hapus strip" }).click()
    await page.getByRole("button", { name: "Hapus" }).click()
    await expect(page.getByText("Strip dihapus.")).toBeVisible()
    await expect(page.getByText("Halaman tidak ditemukan.")).toBeVisible()
  })
})
