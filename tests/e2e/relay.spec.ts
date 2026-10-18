import { expect, test } from "@playwright/test"

import { izinkanKamera, jepret, matikanGesture, undangEstafet } from "./helpers"

/* M8 (SE-01 sampai SE-09): Strip Estafet.

   Bagian yang bisa dijalankan tanpa proyek Supabase memeriksa halaman /r yang
   tidak ada. Alur sungguhan (undang lewat dialog, ambil giliran di konteks
   kedua, giliran kedua ditolak, dua permintaan klaim bersamaan) menembus
   jaringan, jadi dijalankan dengan
   `$env:CLOUDFLARE_E2E="1"; npx playwright test relay.spec.ts`. */

const PERLU_PROYEK =
  "Butuh binding Cloudflare: jalankan dengan CLOUDFLARE_E2E=1 setelah .dev.vars diisi."

test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

/** Setiap uji memakai sidang pembatasan laju sendiri supaya kuota 10 link per
 *  jam tidak dipakai bersama antar-uji maupun antar-jalankan. */
function idDari(url: string): string {
  return new URL(url).pathname.split("/").pop() ?? ""
}

test("halaman estafet yang tidak ada menjawab 404 dan tidak diindeks", async ({
  page,
}) => {
  /* Di server pengembangan yang baru dinyalakan, kompilasi rute bisa memicu
     muat ulang halaman setelah `goto`; asersinya diulang supaya uji ini tidak
     bergantung pada itu. */
  await expect(async () => {
    const response = await page.goto("/r/tidakada1234")
    expect(response?.status()).toBe(404)
    await expect(page.getByText("Halaman tidak ditemukan.")).toBeVisible({
      timeout: 5_000,
    })
  }).toPass({ timeout: 60_000 })
})

test.describe("alur estafet dengan binding Cloudflare", () => {
  test.skip(process.env.CLOUDFLARE_E2E !== "1", PERLU_PROYEK)

  test("pembuat mengisi slot 1 dan 3, teman slot 2 dan 4, keduanya ke strip yang sama", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)
    const relayUrl = await undangEstafet(page)

    /* Konteks kedua mewakili teman: tanpa token apa pun di perangkatnya. */
    const temanCtx = await browser.newContext()
    const teman = await temanCtx.newPage()
    await matikanGesture(teman)
    await teman.goto(relayUrl)
    await expect(
      teman.getByRole("heading", { name: "Lengkapi strip ini" })
    ).toBeVisible()
    /* SE-04: foto pembuat terlihat di slotnya, slot teman masih putus-putus. */
    await expect(teman.getByLabel("Slot 1, sudah terisi")).toBeVisible()
    await expect(teman.getByLabel("Slot 3, sudah terisi")).toBeVisible()
    await expect(teman.getByLabel("Slot 2", { exact: true })).toBeVisible()
    await expect(teman.getByLabel("Slot 4", { exact: true })).toBeVisible()
    await expect(teman.locator("img")).toHaveCount(2)

    await teman.getByRole("button", { name: "Ambil Giliran" }).click()
    const dialog = teman.getByRole("dialog")
    await expect(
      dialog.getByText(/Foto yang kamu ambil akan diunggah ke link ini/)
    ).toBeVisible()
    await dialog.getByRole("button", { name: "Ambil Giliran" }).click()

    await teman.waitForURL("**/booth/capture")
    await izinkanKamera(teman)
    /* SE-04: slot pembuat terkunci, lencananya gembok. */
    await expect(teman.getByLabel("Slot teman 1")).toBeVisible()
    await expect(teman.getByLabel("Slot teman 3")).toBeVisible()
    await expect(teman.getByRole("button", { name: "Ulang foto 1" })).toHaveCount(0)
    /* SE-05: bayangan pose pembuat menyala secara bawaan. */
    const bayangan = teman.getByRole("switch", { name: "Bayangan pose teman" })
    await expect(bayangan).toBeChecked()
    await expect(teman.getByTestId("stage-overlay")).toBeVisible()

    await jepret(teman)
    await jepret(teman)
    await expect(teman.getByText("4/4")).toBeVisible()
    await teman.getByRole("button", { name: "Lanjut Hias" }).click()
    await teman.waitForURL("**/booth/customize")
    await expect(teman.locator("canvas")).toBeVisible()
    /* Teman tidak menawarkan QR: estafet tidak mengunggah versi hidup. */
    await expect(teman.getByText("QR di strip")).toHaveCount(0)

    await teman.getByRole("link", { name: "Selesai & Unduh" }).click()
    await teman.waitForURL("**/booth/result")
    await expect(teman.getByAltText("Pratinjau strip")).toBeVisible()
    await expect(
      teman.getByRole("button", { name: "Buat Link dan Unggah" })
    ).toHaveCount(0)

    /* SE-07: menuntaskan estafet membawa teman ke halaman strip. */
    await teman.getByRole("button", { name: "Selesai & Unduh" }).click()
    await teman.waitForURL("**/s/**", { timeout: 60_000 })
    await expect(teman.getByAltText("Strip", { exact: true })).toBeVisible()
    const stripPath = new URL(teman.url()).pathname
    expect(stripPath).toMatch(/^\/s\/[A-Za-z0-9_-]{12,}$/)

    /* Konteks ketiga tanpa token: estafetnya sudah selesai, tanpa tautan. */
    const orangLainCtx = await browser.newContext()
    const orangLain = await orangLainCtx.newPage()
    await orangLain.goto(relayUrl)
    await expect(
      orangLain.getByText("Estafet ini sudah selesai.")
    ).toBeVisible()
    await expect(
      orangLain.getByRole("link", { name: "Lihat strip" })
    ).toHaveCount(0)
    /* Temuan major security-reviewer: gate token tidak boleh cuma di DOM.
       Payload halaman (HTML + data RSC) tidak boleh membawa tautan strip
       maupun URL bertanda tangan. */
    const htmlOrangLain = await orangLain.content()
    expect(htmlOrangLain).not.toContain(stripPath)
    expect(htmlOrangLain).not.toContain("r2.cloudflarestorage.com")
    await orangLainCtx.close()

    /* SE-07: pembuat melihat status selesai dan tautan strip yang sama. */
    await page.goto(relayUrl)
    await expect(page.getByText("Estafet ini sudah selesai.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Lihat strip" })).toHaveAttribute(
      "href",
      stripPath
    )

    /* SE-10 (P1): pembuat bisa menghias salinan lokal dari foto slot; semua
       empat slot termuat, dan kartu QR tidak ditawarkan supaya hiasannya tidak
       menimpa versi temannya. */
    await page.getByRole("button", { name: "Hias ulang salinanmu" }).click()
    await page.waitForURL("**/booth/customize")
    await expect(page.locator("canvas")).toBeVisible()
    await expect(page.getByText("4 foto siap")).toBeVisible()
    await expect(page.getByText("QR di strip")).toHaveCount(0)

    /* SE-09: pembuat membatalkan; stripnya ikut terhapus dan halamannya
       berubah jadi tampilan batal. */
    await page.goto(relayUrl)
    await page.getByRole("button", { name: "Batalkan dan Hapus" }).click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Batalkan dan Hapus" })
      .click()
    await expect(page.getByText("Estafet dibatalkan.")).toBeVisible()
    await expect(
      page.getByText("Estafet sudah dibatalkan pembuatnya.")
    ).toBeVisible()
    await teman.goto(stripPath)
    await expect(teman.getByText("Halaman tidak ditemukan.")).toBeVisible()
    await temanCtx.close()
  })

  test("konteks ketiga melihat estafet yang sudah diambil", async ({
    page,
    request,
    browser,
  }) => {
    test.setTimeout(180_000)
    const relayUrl = await undangEstafet(page)
    const id = idDari(relayUrl)

    /* Giliran diambil tanpa token (perangkat teman yang sebenarnya tidak
       penting di sini): yang diuji adalah apa yang dilihat pengunjung lain. */
    const klaim = await request.post(`/api/relays/${id}/claim`, { data: {} })
    expect(klaim.status()).toBe(200)

    const lainCtx = await browser.newContext()
    const lain = await lainCtx.newPage()
    await lain.goto(relayUrl)
    /* SE-06. */
    await expect(lain.getByText("Estafet ini sudah diambil.")).toBeVisible()
    await expect(
      lain.getByRole("button", { name: "Ambil Giliran" })
    ).toHaveCount(0)
    await lainCtx.close()

    await page.goto(relayUrl)
    await page.getByRole("button", { name: "Batalkan dan Hapus" }).click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Batalkan dan Hapus" })
      .click()
    await expect(
      page.getByText("Estafet sudah dibatalkan pembuatnya.")
    ).toBeVisible()
  })

  test("dua permintaan claim bersamaan hanya satu yang berhasil", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000)
    const relayUrl = await undangEstafet(page)
    const id = idDari(relayUrl)

    const [satu, dua] = await Promise.all([
      request.post(`/api/relays/${id}/claim`, { data: {} }),
      request.post(`/api/relays/${id}/claim`, { data: {} }),
    ])
    expect([satu.status(), dua.status()].sort()).toEqual([200, 409])

    await page.goto(relayUrl)
    await page.getByRole("button", { name: "Batalkan dan Hapus" }).click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Batalkan dan Hapus" })
      .click()
    await expect(
      page.getByText("Estafet sudah dibatalkan pembuatnya.")
    ).toBeVisible()
  })
})
