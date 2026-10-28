import { expect, test } from "@playwright/test"

import {
  canvasChecksum,
  masukHias,
  masukHiasDenganQr,
  matikanGesture,
} from "./helpers"

/* M6 (SH-04 sampai SH-06): link strip dan QR. Server tidak lagi menyimpan
   apa pun (backend Cloudflare dibongkar), jadi spek ini memeriksa sakelar QR,
   kartu bagikan, jalur "belum tersedia" dari rute yang selalu 503, dan
   halaman strip yang selalu 404. */

/* Konvensi yang sama dengan spek lain (lihat helpers.ts): Gesture Snap
   dimatikan lewat localStorage. Di Chromium headless tanpa GPU, inferensi
   MediaPipe menahan main thread beberapa ratus milidetik per bingkai, dan alur
   kamera empat foto di berkas ini bisa melewati batas 30 detik uji saat mesin
   sedang sibuk. Perilaku gesture sendiri diuji `gesture.spec.ts`. */
test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

test.describe("QR di strip", () => {
  test("sakelar QR menyalakan kotak QR di kanvas dan pemberitahuan izin", async ({
    page,
  }) => {
    await masukHias(page)
    const sebelum = await canvasChecksum(page)

    const sakelar = page.getByRole("switch", { name: "QR di strip" })
    await expect(sakelar).not.toBeChecked()
    await sakelar.click()
    await expect(sakelar).toBeChecked()
    await expect(
      page.getByText("Kamu akan dimintai izin unggah saat mengunduh.")
    ).toBeVisible()
    /* Kanvas digambar ulang setelah state berubah, jadi kotak QR-nya ditunggu
       (M9: penggambaran ulang tidak sinkron dengan klik di server produksi). */
    await expect.poll(() => canvasChecksum(page)).not.toBe(sebelum)

    /* Ledakan kartu mengikuti teks acuan customize.html. */
    await expect(
      page.getByText(
        "QR membuka halaman strip. Fotomu diunggah ke link pribadi dan terhapus otomatis setelah 7 hari."
      )
    ).toBeVisible()

    await sakelar.click()
    await expect(
      page.getByText("Kamu akan dimintai izin unggah saat mengunduh.")
    ).toHaveCount(0)
  })

  test("persetujuan unggah muncul dan server tanpa env menjawab belum tersedia", async ({
    page,
  }) => {
    await masukHiasDenganQr(page)
    await page.getByRole("link", { name: "Selesai & Unduh" }).click()
    await page.waitForURL("**/booth/result")
    await expect(page.getByAltText("Pratinjau strip")).toBeVisible()

    await expect(page.getByText("Semua diproses di perangkat ini")).toBeVisible()
    await page.getByRole("button", { name: "Buat Link dan Unggah" }).click()

    /* SE-02: apa yang diunggah, siapa yang bisa melihat, kapan terhapus. */
    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByText("Unggah strip?", { exact: true })
    ).toBeVisible()
    await expect(
      dialog.getByText(/Siapa pun yang punya link bisa melihatnya sampai 7 hari/)
    ).toBeVisible()

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Buat Link dan Unggah" })
      .click()
    await expect(page.getByText("Pembuatan link belum tersedia.")).toBeVisible()
    /* Gagal berarti belum ada yang terunggah, jadi tawaran unggah tetap ada. */
    await expect(
      page.getByRole("button", { name: "Buat Link dan Unggah" })
    ).toBeVisible()
  })

  test("halaman strip yang tidak ada menjawab 404 dan tidak diindeks", async ({
    page,
  }) => {
    const response = await page.goto("/s/tidakada1234")
    expect(response?.status()).toBe(404)
    await expect(page.getByText("Halaman tidak ditemukan.")).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Mulai Foto" })
    ).toBeVisible()
  })
})
