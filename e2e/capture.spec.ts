import { expect, test, type Page } from "@playwright/test"

/* FR-04 sampai FR-07 dengan kamera palsu Chromium (ARCHITECTURE §10).
   Konvensi navigasi mengikuti e2e/welcome-to-capture.spec.ts. */

declare global {
  interface Window {
    __flashSeen?: boolean
  }
}

async function masukAmbilFoto(page: Page) {
  await page.goto("/booth/layout")
  await page.getByRole("radio", { name: "Strip 4 foto" }).check()
  await page.getByRole("button", { name: "Mulai Foto" }).click()
  await page.waitForURL("**/booth/capture")
}

async function izinkanKamera(page: Page) {
  await page.getByRole("button", { name: "Izinkan Kamera" }).click()
  await expect(page.locator("video")).toBeVisible()
  /* Elemen video muncul sebelum izin selesai: tunggu bingkai pertama. */
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("video")?.videoWidth ?? 0)
    )
    .toBeGreaterThan(0)
}

async function jepret(page: Page) {
  await page.getByRole("button", { name: "Ambil foto" }).click()
  await expect(page.getByRole("status")).toBeVisible()
  await expect(page.getByRole("status")).toHaveCount(0)
}

async function srcSlot(page: Page, nomor: number) {
  return page
    .getByRole("button", { name: `Ulang foto ${nomor}` })
    .locator("img")
    .getAttribute("src")
}

test("empat foto terambil, satu diulang, lalu lanjut ke hias", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Mulai Foto" }).last().click()
  await page.waitForURL("**/booth/layout")
  await page.getByRole("radio", { name: "Strip 4 foto" }).check()
  await page.getByRole("button", { name: "Mulai Foto" }).click()
  await expect(page).toHaveURL("/booth/capture")

  /* FR-04: layar penjelas dulu, kamera belum diminta. */
  await expect(
    page.getByRole("button", { name: "Izinkan Kamera" })
  ).toBeVisible()
  await expect(page.locator("video")).toHaveCount(0)

  await izinkanKamera(page)
  await expect(page.getByText("0/4")).toBeVisible()

  await jepret(page)
  await expect(page.getByText("1/4")).toBeVisible()

  await jepret(page)
  await expect(page.getByText("2/4")).toBeVisible()
  await expect(page.getByRole("button", { name: "Ulang foto 1" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Ulang foto 2" })).toBeVisible()

  /* FR-07: ulang foto terakhir mengganti slot 2 tanpa menghapus slot 1. */
  const sebelum = await srcSlot(page, 2)
  await page.getByRole("button", { name: "Ulang foto terakhir" }).click()
  await expect(page.getByRole("status")).toBeVisible()
  await expect(page.getByRole("status")).toHaveCount(0)
  await expect.poll(() => srcSlot(page, 2)).not.toBe(sebelum)

  const slot1Sesudah = await srcSlot(page, 1)
  expect(slot1Sesudah).not.toBeNull()
  await expect(page.getByText("2/4")).toBeVisible()

  await jepret(page)
  await jepret(page)
  await expect(page.getByText("4/4")).toBeVisible()
  await expect(page.getByText("Semua foto sudah ada.")).toBeVisible()

  /* FR-07: ulang foto tertentu saat semua slot terisi. */
  const slot1Lengkap = await srcSlot(page, 1)
  await page.getByRole("button", { name: "Ulang foto 1" }).click()
  await expect(page.getByRole("status")).toBeVisible()
  await expect(page.getByRole("status")).toHaveCount(0)
  await expect.poll(() => srcSlot(page, 1)).not.toBe(slot1Lengkap)
  await expect(page.getByText("4/4")).toBeVisible()

  const lanjut = page.getByRole("button", { name: "Lanjut Hias" })
  await expect(lanjut).toBeEnabled()
  await lanjut.click()

  await expect(page).toHaveURL("/booth/customize")
  await expect(page.getByRole("heading", { name: "Hias Strip" })).toBeVisible()
  await expect(page.getByText("4 foto siap")).toBeVisible()
})

test("izin ditolak menampilkan pesan dan jalan keluar", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Denied in test", "NotAllowedError"))
  })

  await masukAmbilFoto(page)
  await page.getByRole("button", { name: "Izinkan Kamera" }).click()

  await expect(
    page.getByText(
      "Kamera belum diizinkan. Buka pengaturan situs di browser, izinkan kamera, lalu muat ulang."
    )
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Coba Lagi" })).toBeVisible()
  await expect(page.locator("video")).toHaveCount(0)
})

test("Spasi mengambil foto saat fokus di area kamera", async ({ page }) => {
  await masukAmbilFoto(page)
  await izinkanKamera(page)

  await page.getByRole("group", { name: "Area kamera" }).focus()
  await page.keyboard.press("Space")

  await expect(page.getByRole("status")).toHaveText("3")
  await expect(page.getByText("1/4")).toBeVisible()
})

test("kilat tidak muncul saat prefers-reduced-motion", async ({ page }) => {
  /* MutationObserver mencatat kalau lapisan kilat sempat dirender. */
  await page.addInitScript(() => {
    window.__flashSeen = false
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (
            node instanceof HTMLElement &&
            (node.dataset.testid === "flash" ||
              node.querySelector('[data-testid="flash"]') !== null)
          ) {
            window.__flashSeen = true
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true })
  })
  await page.emulateMedia({ reducedMotion: "reduce" })

  await masukAmbilFoto(page)
  await izinkanKamera(page)
  await jepret(page)

  await expect(page.getByText("1/4")).toBeVisible()
  expect(await page.evaluate(() => window.__flashSeen)).toBe(false)
})

test("foto tersimpan sama dengan pratinjau tercermin dan berasio slot", async ({
  page,
}) => {
  /* Stream sintetis: kanvas hijau dengan persegi merah di kiri tengah.
     Stream baru tiap panggilan: react-webcam meminta ulang saat mount ganda
     dan menghentikan stream yang dianggap basi. */
  await page.addInitScript(() => {
    const buatStream = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 1280
      canvas.height = 720
      canvas.style.cssText =
        "position:fixed;top:0;left:0;width:4px;height:4px;opacity:0.01;pointer-events:none"
      const context = canvas.getContext("2d")
      if (context === null) {
        throw new Error("Konteks 2D tidak tersedia untuk stream uji")
      }
      const gambar = () => {
        context.fillStyle = "#00e000"
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = "#e00000"
        context.fillRect(200, 320, 80, 80)
      }
      gambar()
      document.body.appendChild(canvas)
      const stream = canvas.captureStream(30)
      /* Kanvas harus terus digambar supaya bingkai mengalir ke elemen video. */
      setInterval(gambar, 100)
      return stream
    }
    navigator.mediaDevices.getUserMedia = async () => buatStream()
  })

  await masukAmbilFoto(page)
  await izinkanKamera(page)
  await jepret(page)
  await expect(page.getByText("1/4")).toBeVisible()

  const sample = await page.evaluate(async () => {
    const img = document.querySelector<HTMLImageElement>(
      'button[aria-label="Ulang foto 1"] img'
    )
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (img === null || context === null) {
      return null
    }
    await img.decode()
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    context.drawImage(img, 0, 0)
    const baca = (x: number, y: number) =>
      Array.from(context.getImageData(x, y, 1, 1).data)
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      kiriTengah: baca(Math.round(img.naturalWidth * 0.109), Math.round(img.naturalHeight * 0.5)),
      kananTengah: baca(Math.round(img.naturalWidth * 0.891), Math.round(img.naturalHeight * 0.5)),
    }
  })

  expect(sample).not.toBeNull()
  if (sample === null) {
    return
  }

  /* Rasio crop mengikuti slot strip-4 (528 x 372). */
  expect(sample.width / sample.height).toBeCloseTo(528 / 372, 2)

  /* Persegi merah semula di kiri; hasil tercermin menaruhnya di kanan. */
  const [kiriR, kiriG] = sample.kiriTengah
  const [kananR, kananG] = sample.kananTengah
  expect(kiriG).toBeGreaterThan(180)
  expect(kiriR).toBeLessThan(80)
  expect(kananR).toBeGreaterThan(180)
  expect(kananG).toBeLessThan(80)
})
