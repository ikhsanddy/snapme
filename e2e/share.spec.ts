import { existsSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"

import { masukHias, masukHiasDenganQr, pasangSidangBaru } from "./helpers"

/* M6 (SH-04 sampai SH-06): link strip dan QR.

   Bagian yang bisa dijalankan tanpa proyek Supabase memeriksa sakelar QR, kartu
   bagikan, jalur "belum tersedia" saat env kosong, dan halaman 404. Alur
   sungguhan (buat link, buka di konteks lain, hapus) butuh proyek Supabase;
   jalankan dengan `$env:SUPABASE_E2E="1"; npx playwright test share.spec.ts`. */

const PERLU_PROYEK =
  "Butuh proyek Supabase: jalankan dengan SUPABASE_E2E=1 setelah .env.local diisi."
/* Uji jalur 503 hanya bermakna saat server belum punya proyek Supabase, dan
   `.env.local` adalah penanda tunggalnya di mesin ini. */
const ADA_ENV_LOKAL = existsSync(".env.local")

/** Sidik jari kanvas penyunting: cukup untuk membuktikan ada yang berubah. */
async function sidikJariKanvas(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas")
    if (canvas === null) {
      return 0
    }
    const data = canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height).data
    if (data === undefined) {
      return 0
    }
    let total = 0
    for (let index = 0; index < data.length; index += 997) {
      total += data[index]
    }
    return total
  })
}

test.describe("QR di strip tanpa proyek Supabase", () => {
  test("sakelar QR menyalakan kotak QR di kanvas dan pemberitahuan izin", async ({
    page,
  }) => {
    await masukHias(page)
    const sebelum = await sidikJariKanvas(page)

    const sakelar = page.getByRole("switch", { name: "QR di strip" })
    await expect(sakelar).not.toBeChecked()
    await sakelar.click()
    await expect(sakelar).toBeChecked()
    await expect(
      page.getByText("Kamu akan dimintai izin unggah saat mengunduh.")
    ).toBeVisible()
    /* Kanvas digambar ulang setelah state berubah, jadi kotak QR-nya ditunggu
       (M9: penggambaran ulang tidak sinkron dengan klik di server produksi). */
    await expect.poll(() => sidikJariKanvas(page)).not.toBe(sebelum)

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
    test.skip(ADA_ENV_LOKAL, "Sudah ada .env.local: jalur 503 hanya untuk server tanpa proyek.")
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

test.describe("alur bagikan dengan proyek Supabase", () => {
  test.skip(process.env.SUPABASE_E2E !== "1", PERLU_PROYEK)

  test("buat link, buka dari perangkat lain, lalu hapus pemiliknya", async ({
    page,
    browser,
  }) => {
    /* Alur ini menembus jaringan sungguhan (unggah ke Storage, rute complete,
       dua konteks browser), jadi batas bawaan 30 detik terlalu ketat. */
    test.setTimeout(180_000)
    /* Sidang pembatasan laju sendiri: kuota 10 link per jam dihitung per
       sidang, jadi uji ber-link lain tidak boleh memakai kuncinya bersama. */
    await pasangSidangBaru(page)
    await masukHiasDenganQr(page)
    await page.getByRole("link", { name: "Selesai & Unduh" }).click()
    await page.waitForURL("**/booth/result")
    await expect(page.getByAltText("Pratinjau strip")).toBeVisible()

    await page.getByRole("button", { name: "Buat Link dan Unggah" }).click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Buat Link dan Unggah" })
      .click()

    await expect(page.getByText("Link strip dibuat.")).toBeVisible({
      timeout: 30_000,
    })
    const alamat = page.getByTestId("strip-url")
    await expect(alamat).toContainText("/s/")
    const stripUrl = (await alamat.textContent())?.trim() ?? ""
    expect(stripUrl).toMatch(/\/s\/[A-Za-z0-9_-]{12,}$/)
    await expect(page.getByText(/Terhapus otomatis/)).toBeVisible()
    await expect(
      page.getByText("Strip kamu ada di link pribadi")
    ).toBeVisible()

    /* Konteks kedua mewakili teman: tanpa token hapus di perangkatnya. */
    const teman = await browser.newContext()
    const halamanTeman = await teman.newPage()
    await halamanTeman.goto(stripUrl)
    await expect(halamanTeman.getByAltText("Strip")).toBeVisible()
    /* M7: strip tanpa klip tidak menampilkan pemutar versi hidup. */
    await expect(halamanTeman.locator("video")).toHaveCount(0)
    await expect(
      halamanTeman.getByRole("button", { name: "Hapus strip" })
    ).toHaveCount(0)
    await teman.close()

    /* Pembuat membuka linknya sendiri: tombol hapus muncul. */
    await page.goto(stripUrl)
    await expect(page.getByAltText("Strip")).toBeVisible()
    await page.getByRole("button", { name: "Hapus strip" }).click()
    await page.getByRole("button", { name: "Hapus" }).click()
    await expect(page.getByText("Strip dihapus.")).toBeVisible()
    await expect(page.getByText("Halaman tidak ditemukan.")).toBeVisible()
  })
})
