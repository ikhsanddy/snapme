import { readFileSync } from "node:fs"
import path from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { canvasChecksum, masukAmbilFoto, masukHias, matikanGesture } from "./helpers"

/* M4: halaman Hias Strip dan ekspor PNG (FR-09, FR-11, FR-10, FR-13).
   Konvensi navigasi ada di tests/e2e/helpers.ts. */

const PNG_BYTE_LIMIT = 2_097_152
const FIXTURE_DIR = path.join(process.cwd(), "tests", "e2e", "fixtures")

test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

/** Warna piksel kanvas strip dalam koordinat kanvas (device pixel). */
async function canvasPixel(
  page: Page,
  x: number,
  y: number
): Promise<number[] | null> {
  return page.evaluate(
    ({ px, py }) => {
      const canvas = document.querySelector("canvas")
      if (canvas === null) {
        return null
      }
      const context = canvas.getContext("2d")
      if (context === null) {
        return null
      }
      return Array.from(context.getImageData(px, py, 1, 1).data)
    },
    { px: x, py: y }
  )
}

/* Piksel di tengah atas strip: di antara garis tepi dan slot pertama, jadi
   isinya selalu warna latar frame. */
async function stripBackgroundPixel(page: Page): Promise<number[] | null> {
  const size = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")
    return canvas === null ? null : [canvas.width, canvas.height]
  })
  if (size === null) {
    return null
  }
  return canvasPixel(page, Math.round(size[0] / 2), Math.round(size[0] * 0.02))
}

async function collectScriptText(page: Page): Promise<string> {
  const sources = await page.evaluate(() =>
    Array.from(document.scripts)
      .map((script) => script.src)
      .filter((src) => src.length > 0)
  )

  const codes: string[] = []
  for (const source of sources) {
    const response = await page.request.get(source)
    if (response.ok()) {
      codes.push(await response.text())
    }
  }
  return codes.join("\n")
}

test("hias lalu unduh PNG 600 x 1800 di bawah 2 MB", async ({ page }) => {
  await masukHias(page)
  await expect(page.getByRole("heading", { name: "Hias Strip" })).toBeVisible()

  /* Token warna benar-benar terbaca kanvas: latar bawaan Klasik adalah paper. */
  await expect
    .poll(() => stripBackgroundPixel(page))
    .toEqual([255, 253, 247, 255])

  await page.getByRole("button", { name: "Malam", exact: true }).click()
  await expect
    .poll(() => stripBackgroundPixel(page))
    .toEqual([20, 20, 20, 255])

  /* Filter efek benar-benar mengubah gambar di kanvas. */
  const sebelumEfek = await canvasChecksum(page)
  await page.getByRole("radio", { name: "Efek" }).click()
  await page.getByRole("button", { name: "Retro", exact: true }).click()
  await expect.poll(() => canvasChecksum(page)).not.toBe(sebelumEfek)

  await page.getByRole("radio", { name: "Stiker" }).click()
  await page.getByRole("button", { name: "Tempel Bintang" }).click()
  await expect(page.getByText("Stiker Bintang")).toBeVisible()

  /* M5: aksi utama menavigasi ke langkah Hasil; unduhan dipicu di sana. */
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
  const bytes = readFileSync(berkas)

  /* FR-11: PNG 600 x 1800 px, di bawah 2 MB, tanpa metadata (kanvas tidak
     pernah menulis EXIF). */
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect(bytes.toString("ascii", 12, 16)).toBe("IHDR")
  expect(bytes.readUInt32BE(16)).toBe(600)
  expect(bytes.readUInt32BE(20)).toBe(1800)
  expect(bytes.byteLength).toBeLessThan(PNG_BYTE_LIMIT)
})

test("stiker dikelola hanya dengan keyboard", async ({ page }) => {
  await masukHias(page)

  /* Menempel, memindah, memutar, memperbesar, dan menghapus tanpa satu pun
     klik penunjuk: fokus dipindah lalu Enter ditekan. Tab "Stiker" dibuka
     dengan cara yang sama. */
  const tabStiker = page.getByRole("radio", { name: "Stiker" })
  await tabStiker.focus()
  await page.keyboard.press("Enter")

  const tempel = page.getByRole("button", { name: "Tempel Bintang" })
  await tempel.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("x 300 · y 900 · 120 px · -6°")).toBeVisible()

  const pindah = page.getByRole("button", { name: "Pindah kanan: Bintang" })
  await pindah.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("x 308 · y 900 · 120 px · -6°")).toBeVisible()

  const putar = page.getByRole("button", { name: "Putar: Bintang" })
  await putar.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("x 308 · y 900 · 120 px · 9°")).toBeVisible()

  const perbesar = page.getByRole("button", { name: "Perbesar: Bintang" })
  await perbesar.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("x 308 · y 900 · 132 px · 9°")).toBeVisible()

  const hapus = page.getByRole("button", { name: "Hapus: Bintang" })
  await hapus.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Stiker Bintang")).toHaveCount(0)
  await expect(page.getByRole("region", { name: "Isi strip" })).toHaveCount(0)
})

test("pilihan hias di lembar bawah pada 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await masukHias(page)

  /* Di layar sempit hanya tombol pembuka yang tampil, bukan rel pilihan. */
  const pembuka = page.getByRole("button", { name: "Hiasan" })
  await expect(pembuka).toBeVisible()
  await pembuka.click()

  const lembar = page.getByRole("dialog")
  await expect(lembar.getByRole("radio", { name: "Stiker" })).toBeVisible()
  await lembar.getByRole("radio", { name: "Stiker" }).click()
  await lembar.getByRole("button", { name: "Tempel Bintang" }).click()
  await expect(page.getByText("Stiker Bintang")).toBeVisible()

  await lembar.getByRole("radio", { name: "Frame" }).click()
  await lembar.getByRole("button", { name: "Malam", exact: true }).click()
  /* Kanvas digambar ulang setelah state berubah, jadi pikselnya ditunggu:
     di server produksi, penggambaran ulang itu baru mendarat di bingkai
     berikutnya (M9). */
  await expect.poll(() => stripBackgroundPixel(page)).toEqual([20, 20, 20, 255])
})

test("konva tidak ikut termuat di / dan /booth/capture", async ({ page }) => {
  /* Konva memasang dirinya ke `window` saat modulnya dievaluasi
     (`_injectGlobal` di Global.js), jadi ada tidaknya `window.Konva` adalah
     bukti langsung bahwa pustakanya tidak ikut bundel halaman ini. Pemeriksaan
     teks skrip dipakai untuk menyisir potongan kode penyunting kami, bukan
     pustaka Konva: kata "Konva" juga muncul di komentar biasa. */
  const konvaLoaded = () => page.evaluate(() => "Konva" in window)

  await page.goto("/")
  await expect(page.getByRole("link", { name: "Mulai Foto" }).first()).toBeVisible()
  expect(await konvaLoaded()).toBe(false)
  expect(await collectScriptText(page)).not.toContain("editor-overlay")

  /* Langkah Ambil Foto butuh layout terpilih, jadi masuk lewat alurnya. */
  await masukAmbilFoto(page)
  await expect(page.getByRole("button", { name: "Izinkan Kamera" })).toBeVisible()
  expect(await konvaLoaded()).toBe(false)
  expect(await collectScriptText(page)).not.toContain("editor-overlay")
})

test("pakai foto galeri mengisi slot tanpa kamera", async ({ page }) => {
  await page.goto("/")

  /* Empat berkas masuk ke sesi bawaan Strip 4 lalu langsung ke Hias. */
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

test("dua foto galeri dilengkapi di kamera", async ({ page }) => {
  await page.goto("/")

  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Pakai Foto Galeri" }).click()
  await (await chooser).setFiles([
    path.join(FIXTURE_DIR, "foto-1.png"),
    path.join(FIXTURE_DIR, "foto-2.png"),
  ])

  await page.waitForURL("**/booth/capture")
  await expect(page.getByText("2 foto terpasang. Lengkapi sisanya di kamera.")).toBeVisible()
  await expect(page.getByText("2/4")).toBeVisible()
})

test("teks dibatasi 24 karakter dan tanggal bisa dinyalakan", async ({ page }) => {
  await masukHias(page)

  await page.getByRole("radio", { name: "Teks" }).click()
  const input = page.locator("#strip-text")
  const panjang = "tiga puluh karakter lebih panjang"
  await input.fill(panjang)
  /* FR-10: maksimal 24 karakter, dijaga oleh store, bukan hanya oleh input. */
  await expect(input).toHaveValue(panjang.slice(0, 24))

  await page.getByRole("switch", { name: "Tanggal" }).click()
  await expect(page.getByText("Nyala", { exact: true }).last()).toBeVisible()
})
