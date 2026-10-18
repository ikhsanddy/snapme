import { expect, test } from "@playwright/test"

import { izinkanKamera, jepret, masukAmbilFoto } from "./helpers"

/* M3 PRD §7.2 dengan kamera palsu Chromium (ARCHITECTURE §10):
   GS-01 (deteksi lokal, aset di-host sendiri), GS-06 (sakelar mati dan diingat),
   GS-07 (gagal muat), dan HUD selesai. Keadaan `holding` tidak bisa dipicu tanpa
   tangan sungguhan: dibuktikan uji komponen di tests/features/gesture/gesture-hud.test.tsx.
   Navigasi dan kamera memakai konvensi bersama di tests/e2e/helpers.ts; sakelar
   gesture sengaja TIDAK dimatikan di berkas ini. */

const HUD_SIAP = "Angkat dua jari, tahan sebentar"

test("model dimuat dari origin sendiri tanpa permintaan membawa gambar", async ({
  page,
}) => {
  test.setTimeout(90_000)

  const requests: {
    url: string
    method: string
    type: string
    body: string
  }[] = []
  page.on("request", (request) => {
    requests.push({
      url: request.url(),
      method: request.method(),
      type: request.resourceType(),
      body: request.postData() ?? "",
    })
  })

  await masukAmbilFoto(page)
  await izinkanKamera(page)
  /* GS-07: status "Menyiapkan gesture..." boleh terlewat kalau model cepat,
     jadi yang dijamin adalah HUD siap setelah model termuat. */
  await expect(page.getByText(HUD_SIAP)).toBeVisible({ timeout: 30_000 })

  for (let nomor = 0; nomor < 4; nomor += 1) {
    await jepret(page)
  }
  await expect(page.getByText("4 foto siap dihias")).toBeVisible()

  /* GS-01: tidak ada permintaan yang membawa gambar. Semua permintaan GET dan
     seorigin; model serta wasm datang dari /public, bukan CDN. `__nextjs_`
     adalah diagnostik Next dev yang muncul saat MediaPipe menulis peringatan ke
     konsol, bukan bagian dari alur foto. */
  const halaman = requests.filter(
    (request) =>
      request.type !== "websocket" && !request.url.includes("/__nextjs_")
  )
  expect(
    halaman
      .filter((request) => request.method !== "GET")
      .map((request) => `${request.method} ${request.url}`)
  ).toEqual([])
  expect(
    halaman
      .filter(
        (request) => request.body.includes("data:image") || request.body.includes("/9j/")
      )
      .map((request) => request.url)
  ).toEqual([])
  expect(
    halaman.filter((request) => !request.url.startsWith("http://localhost:3000"))
  ).toEqual([])
  expect(
    halaman.some((request) =>
      request.url.includes("/models/gesture_recognizer.task")
    )
  ).toBe(true)
  expect(
    halaman.some((request) => request.url.includes("/mediapipe/wasm/"))
  ).toBe(true)
})

test("sakelar mati: model tidak dimuat dan HUD menyebut jalan tombol", async ({
  page,
}) => {
  const requests: string[] = []
  page.on("request", (request) => requests.push(request.url()))

  await masukAmbilFoto(page)
  const toggle = page.getByRole("button", { name: /Gesture Snap/ })
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-pressed", "false")

  await izinkanKamera(page)
  await expect(
    page.getByText("Gesture mati. Pakai tombol kamera.")
  ).toBeVisible()
  await page.waitForTimeout(1500)

  expect(
    requests.filter(
      (url) => url.includes("/models/") || url.includes("/mediapipe/")
    )
  ).toEqual([])
})

test("pilihan sakelar diingat setelah halaman dimuat ulang", async ({ page }) => {
  await masukAmbilFoto(page)
  const toggle = page.getByRole("button", { name: /Gesture Snap/ })
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-pressed", "false")

  /* FR-14 menyimpan sesi dengan jeda 400 ms; tunggu tulisannya selesai supaya
     muat ulang di bawah benar-benar menguji ingatan sakelar. Sesi foto ikut
     lintas muat ulang, jadi halaman tetap di langkah yang sama. */
  await page.waitForTimeout(600)
  await page.reload()
  await expect(page).toHaveURL(/\/booth\/capture$/)

  await expect(
    page.getByRole("button", { name: /Gesture Snap/ })
  ).toHaveAttribute("aria-pressed", "false")
})

test("model gagal dimuat: sakelar hilang, toast tampil, tombol kamera tetap jalan", async ({
  page,
}) => {
  await page.route("**/models/**", (route) => route.abort())

  await masukAmbilFoto(page)
  await izinkanKamera(page)

  await expect(
    page.getByText(
      "Gesture Snap gagal dimuat. Tombol kamera tetap bisa dipakai."
    )
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("button", { name: /Gesture Snap/ })).toHaveCount(0)

  await jepret(page)
  await expect(page.getByText("1/4")).toBeVisible()
})
