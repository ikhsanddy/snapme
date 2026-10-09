import path from "node:path"
import { expect, type Page } from "@playwright/test"

const FIXTURE_DIR = path.join(process.cwd(), "e2e", "fixtures")

/* Konvensi navigasi bersama untuk e2e. Berkas ini dipakai capture.spec.ts,
   customize.spec.ts, dan a11y.spec.ts supaya alur menuju tiap langkah booth
   ditulis sekali.

   Gesture Snap selalu dimatikan lewat localStorage di alur spesifikasi ini:
   Chromium headless tanpa GPU butuh ratusan milidetik per inferensi sehingga
   hitung mundur bisa meleset. Perilaku sakelar menyala (bawaan) diuji berkas
   `e2e/gesture.spec.ts`. */

export async function matikanGesture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("snapme:gesture-enabled", "0")
  })
}

/** Pilih layout mana pun lalu masuk ke langkah Ambil Foto.

 *  Pemilihan radio diulang sampai tombolnya benar-benar menyala: di server
 *  pengembangan yang baru dinyalakan, halaman bisa dikompilasi (dan dimuat
 *  ulang) setelah `goto`, jadi klik pertama kadang jatuh sebelum React
 *  terhidrasi dan tidak mengubah state. */
export async function masukAmbilFotoLayout(
  page: Page,
  label: string
): Promise<void> {
  await page.goto("/booth/layout")
  await expect(async () => {
    await page.getByRole("radio", { name: label }).check()
    await expect(page.getByRole("button", { name: "Mulai Foto" })).toBeEnabled({
      timeout: 1_000,
    })
  }).toPass({ timeout: 30_000 })
  await page.getByRole("button", { name: "Mulai Foto" }).click()
  await page.waitForURL("**/booth/capture")
}

export async function masukAmbilFoto(page: Page): Promise<void> {
  await masukAmbilFotoLayout(page, "Strip 4 foto")
}

export async function izinkanKamera(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Izinkan Kamera" }).click()
  await expect(page.locator("video")).toBeVisible()
  /* Elemen video muncul sebelum izin selesai: tunggu bingkai pertama. */
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("video")?.videoWidth ?? 0)
    )
    .toBeGreaterThan(0)
}

export async function jepret(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Ambil foto" }).click()
  await expect(page.getByTestId("countdown")).toBeVisible()
  await expect(page.getByTestId("countdown")).toHaveCount(0)
}

export async function srcSlot(
  page: Page,
  nomor: number
): Promise<string | null> {
  return page
    .getByRole("button", { name: `Ulang foto ${nomor}` })
    .locator("img")
    .getAttribute("src")
}

/** Empat foto dengan kamera palsu, siap dilanjutkan ke langkah Hias. */
export async function lengkapiEmpatFoto(page: Page): Promise<void> {
  await masukAmbilFoto(page)
  await izinkanKamera(page)
  for (let nomor = 0; nomor < 4; nomor += 1) {
    await jepret(page)
  }
  await expect(page.getByText("4/4")).toBeVisible()
}

export async function masukHias(page: Page): Promise<void> {
  await lengkapiEmpatFoto(page)
  await page.getByRole("button", { name: "Lanjut Hias" }).click()
  await page.waitForURL("**/booth/customize")
  /* Penyunting dimuat dengan import() dinamis, jadi kanvas baru ada setelah
     potongan kodenya siap. Menunggunya di sini menjaga tiap uji hias tidak
     berlomba dengan pemuatan itu. */
  await expect(page.locator("canvas")).toBeVisible()
}

/** Hias lalu lanjut ke langkah Hasil, dengan pratinjau hasil sudah siap. */
export async function masukHasil(page: Page): Promise<void> {
  await masukHias(page)
  await page.getByRole("link", { name: "Selesai & Unduh" }).click()
  await page.waitForURL("**/booth/result")
  await expect(page.getByAltText("Pratinjau strip")).toBeVisible()
}

/** M6: hias dengan QR menyala, jalur yang dipakai uji ber-link. */
export async function masukHiasDenganQr(page: Page): Promise<void> {
  await masukHias(page)
  await page.getByRole("switch", { name: "QR di strip" }).click()
  await expect(
    page.getByText("Kamu akan dimintai izin unggah saat mengunduh.")
  ).toBeVisible()
}

/** FR-13 tanpa kamera: empat berkas galeri mengisi sesi bawaan lalu langsung
 *  masuk langkah Hias. Dipakai uji lintas peramban dan uji kinerja ekspor. */
export async function masukHiasDariGaleri(page: Page): Promise<void> {
  await page.goto("/")
  await expect(page.getByRole("link", { name: "Mulai Foto" }).first()).toBeVisible()

  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Pakai Foto Galeri" }).click()
  await (await chooser).setFiles(
    ["foto-1.png", "foto-2.png", "foto-3.png", "foto-4.png"].map((nama) =>
      path.join(FIXTURE_DIR, nama)
    )
  )
  await page.waitForURL("**/booth/customize")
  await expect(page.getByText("4 foto siap", { exact: true })).toBeVisible()
  await expect(page.locator("canvas")).toBeVisible()
}

/** Setiap uji ber-link memakai sidang pembatasan laju sendiri supaya kuota 10
 *  link per jam tidak dipakai bersama antar-uji maupun antar-jalankan.
 *  `x-real-ip` memang header yang dibaca rute; di produksi diisi platform
 *  hosting. */
export async function pasangSidangBaru(page: Page): Promise<void> {
  const oktet = 20 + Math.floor(Math.random() * 200)
  await page.setExtraHTTPHeaders({ "x-real-ip": `198.51.100.${oktet}` })
}

/** M8 (SE-01, SE-02): pembuat mengisi dua foto lalu membuat link estafet;
 *  hasilnya URL `/r/{id}`. Dipakai relay.spec.ts dan a11y.spec.ts. */
export async function undangEstafet(page: Page): Promise<string> {
  await pasangSidangBaru(page)
  await masukAmbilFoto(page)
  await izinkanKamera(page)
  await jepret(page)
  await jepret(page)
  await expect(page.getByText("2/4")).toBeVisible()

  await page.getByRole("button", { name: "Estafet ke Teman" }).click()
  const dialog = page.getByRole("dialog")
  /* SE-02: apa yang diunggah, siapa yang bisa melihat, kapan terhapus. */
  await expect(
    dialog.getByText("Unggah foto estafet?", { exact: true })
  ).toBeVisible()
  await expect(
    dialog.getByText(/Hanya orang yang kamu kirimi link yang bisa melengkapi/)
  ).toBeVisible()
  await dialog.getByRole("button", { name: "Buat Link Estafet" }).click()

  await expect(page.getByText("Link estafet dibuat.")).toBeVisible({
    timeout: 30_000,
  })
  const alamat = page.getByTestId("relay-url")
  await expect(alamat).toContainText("/r/")
  const url = (await alamat.textContent())?.trim() ?? ""
  expect(url).toMatch(/\/r\/[A-Za-z0-9_-]{12,}$/)
  return url
}
