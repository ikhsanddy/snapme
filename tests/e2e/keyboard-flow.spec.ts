import { expect, test, type Page } from "@playwright/test"

/* M9 (DESIGN-SYSTEM §11, syarat "seluruh alur bisa diselesaikan dengan
   keyboard dan tanpa gesture"): seluruh alur dasar tanpa satu pun klik
   penunjuk. Fokus dipindah dengan Tab, radio dan pil digerakkan dengan panah,
   dan tidak ada `page.mouse` di berkas ini.

   Gesture dimatikan seperti berkas e2e lain supaya hitung mundur tidak
   berlomba dengan inferensi MediaPipe di Chromium headless. */

/** Nama aksesibel elemen yang sedang fokus: `aria-label`, teks dari
 *  `aria-labelledby`, lalu teksnya sendiri. */
async function namaFokus(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement
    if (element === null) {
      return ""
    }
    const labelled = element.getAttribute("aria-labelledby")
    const dariLabel =
      labelled === null
        ? null
        : labelled
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? "")
            .join(" ")
    return (
      element.getAttribute("aria-label") ??
      dariLabel ??
      element.textContent ??
      ""
    ).trim()
  })
}

/** Menekan Tab sampai elemen dengan nama aksesibel itu yang fokus. */
async function tabKe(page: Page, nama: string, batas = 120): Promise<void> {
  for (let langkah = 0; langkah < batas; langkah += 1) {
    await page.keyboard.press("Tab")
    if ((await namaFokus(page)).startsWith(nama)) {
      return
    }
  }
  throw new Error(`Tab tidak sampai ke "${nama}" dalam ${batas} langkah`)
}

/** Nama pil pilihan di rel kiri Hias, urut dari kiri ke kanan. */
const PIL_HIAS: readonly string[] = ["Frame", "Efek", "Stiker"]

/** Menggeser fokus pil hiasan dengan panah, satu pil tiap langkah.
 *
 *  Grup pil pilihan hiasan memperlakukan Tab sebagai masuk ke grupnya, jadi
 *  perpindahan antar-pil memang lewat panah. Tiap langkah diulang sampai fokus
 *  benar-benar sampai di pil tujuan langkah itu, karena dua hal: Radix
 *  memindahkan fokus roving-nya setelah render berikutnya, dan satu tekanan
 *  pertama setelah `focus()` tersedot untuk menyegerakan tab stop-nya. Menekan
 *  panah beruntun lalu berharap fokusnya pindah pernah gagal di runner CI: 12
 *  tekanan habis tanpa satu pun berpindah, dan galatnya muncul di langkah
 *  hiasan ini. */
async function panahKe(
  page: Page,
  ke: string,
  tombol: "ArrowRight" | "ArrowLeft"
): Promise<void> {
  const arah = tombol === "ArrowRight" ? 1 : -1
  let kini = await namaFokus(page)
  if (!PIL_HIAS.includes(kini)) {
    throw new Error(`Fokus awal bukan pil hiasan: "${kini}"`)
  }
  while (kini !== ke) {
    const berikut = PIL_HIAS[PIL_HIAS.indexOf(kini) + arah]
    if (berikut === undefined) {
      throw new Error(`Panah ${tombol} tidak punya pil berikutnya dari "${kini}"`)
    }
    const pilKini = page.getByRole("radio", { name: kini })
    const pilBerikut = page.getByRole("radio", { name: berikut })
    await expect(async () => {
      /* Fokus dipasang ulang tiap percobaan: kalau fokusnya jatuh ke badan
         halaman, tekanan panah tidak melakukan apa pun. */
      await pilKini.focus()
      await page.keyboard.press(tombol)
      await expect(pilBerikut).toBeFocused({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
    kini = berikut
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("snapme:gesture-enabled", "0")
  })
})

test("seluruh alur selesai hanya dengan keyboard", async ({ page }) => {
  test.setTimeout(180_000)

  /* Server pengembangan mengompilasi rute saat pertama diminta, dan muat ulang
     yang dipicunya bisa mengosongkan state sesi di tengah alur (catatan yang
     sama ada di docs/DECISIONS.md M8). Rutenya dihangatkan dulu supaya
     penekanan Tab tidak berlomba dengan kompilasi. */
  for (const rute of [
    "/booth/layout",
    "/booth/capture",
    "/booth/customize",
    "/booth/result",
  ]) {
    await page.goto(rute)
  }
  await page.goto("/")

  /* Welcome: "Mulai Foto" dijangkau dengan Tab, lalu dibuka dengan Enter. */
  await tabKe(page, "Mulai Foto")
  await page.keyboard.press("Enter")
  await page.waitForURL("**/booth/layout")

  /* Pilih layout: panah menggerakkan pilihan di dalam grup radio, lalu
     pilihannya dikunci dengan Space. */
  await tabKe(page, "Strip 4 foto")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("Space")
  await expect(page.getByRole("radio", { name: "Strip 4 foto" })).toBeChecked()
  await expect(page.getByRole("button", { name: "Mulai Foto" })).toBeEnabled()

  await tabKe(page, "Mulai Foto")
  await page.keyboard.press("Enter")
  await page.waitForURL("**/booth/capture")

  /* Izin kamera juga lewat tombol, bukan dialog peramban. */
  await tabKe(page, "Izinkan Kamera")
  await page.keyboard.press("Enter")
  await expect(page.locator("video")).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("video")?.videoWidth ?? 0)
    )
    .toBeGreaterThan(0)

  /* Spasi di area kamera memotret, empat kali. */
  for (let nomor = 1; nomor <= 4; nomor += 1) {
    /* Mesin keadaan hanya menerima `SHOOT` pada fase siap, dan jeda 300 ms
       setelah tiap foto (GS-04) membuat Spasi yang datang lebih awal hilang
       tanpa jejak: hitung mundur tidak pernah muncul. Tombol jepret yang aktif
       adalah penanda fase siap, jadi ditunggu lebih dulu. Di runner CI tanpa
       GPU, jeda itu berlomba dengan `expect` penghitung foto dan tekanannya
       kadang jatuh di dalamnya. */
    await expect(page.getByRole("button", { name: "Ambil foto" })).toBeEnabled()

    await tabKe(page, "Area kamera")
    /* `handleKeyDown` mengabaikan Spasi yang datang dari elemen anak
       (`event.target !== event.currentTarget`), jadi fokusnya dipastikan ada
       di kontainer area kamera sebelum Spasi ditekan. Memfokuskan elemen
       terprogram sudah dipakai di bawah untuk pil hiasan. */
    const areaKamera = page.getByRole("group", { name: "Area kamera" })
    await areaKamera.focus()
    await expect(areaKamera).toBeFocused()

    await page.keyboard.press("Space")
    await expect(page.getByTestId("countdown")).toBeVisible()
    await expect(page.getByTestId("countdown")).toHaveCount(0)
    await expect(page.getByText(`${nomor}/4`)).toBeVisible()
  }

  await tabKe(page, "Lanjut Hias")
  await page.keyboard.press("Enter")
  await page.waitForURL("**/booth/customize")
  await expect(page.locator("canvas")).toBeVisible()

  /* Hias: Tab masuk ke grup pil, lalu ke swatch frame di rel kiri. */
  await tabKe(page, "Frame")
  await tabKe(page, "Malam")
  await page.keyboard.press("Enter")

  /* Pil Stiker digerakkan panah lalu dikunci Enter. Fokus pilnya dimasukkan
     terprogram (pola uji keyboard customize.spec.ts) karena hanya pil terpilih
     yang jadi tab stop dan panah Radix tersendat satu tekanan. */
  await page.getByRole("radio", { name: "Frame" }).focus()
  await panahKe(page, "Stiker", "ArrowRight")
  await expect(page.getByRole("radio", { name: "Stiker" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("radio", { name: "Stiker" })).toBeChecked()

  await tabKe(page, "Tempel Bintang")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Stiker Bintang")).toBeVisible()

  await tabKe(page, "Pindah kanan: Bintang")
  await page.keyboard.press("Enter")
  await expect(page.getByText(/^x \d+ · y \d+ · 120 px · -6°$/)).toBeVisible()

  /* Kartu QR menyala supaya dialog persetujuan unggah muncul di langkah Hasil
     (ShareCard hanya dirender saat QR atau linknya ada). */
  await tabKe(page, "QR di strip")
  await page.keyboard.press("Space")
  await expect(page.getByRole("switch", { name: "QR di strip" })).toBeChecked()

  await tabKe(page, "Selesai & Unduh")
  await page.keyboard.press("Enter")
  await page.waitForURL("**/booth/result")
  await expect(page.getByAltText("Pratinjau strip")).toBeVisible()

  /* Dialog persetujuan unggah dibuka dengan Enter dan ditutup dengan Esc. */
  await tabKe(page, "Buat Link dan Unggah")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Buat Link dan Unggah" })
  ).toBeVisible()

  /* Enter pada aksi utama mengunduh stripnya. */
  await tabKe(page, "Selesai & Unduh")
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.keyboard.press("Enter"),
  ])
  expect(download.suggestedFilename()).toMatch(/^snapme-\d{8}-\d{4}\.png$/)
})
