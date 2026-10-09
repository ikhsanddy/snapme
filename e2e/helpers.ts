import { expect, type Page } from "@playwright/test"

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

/** Pilih layout mana pun lalu masuk ke langkah Ambil Foto. */
export async function masukAmbilFotoLayout(
  page: Page,
  label: string
): Promise<void> {
  await page.goto("/booth/layout")
  await page.getByRole("radio", { name: label }).check()
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
