import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { masukHasil, masukHias, matikanGesture } from "./helpers"

/* Audit aksesibilitas otomatis (WCAG 2.2 AA) untuk halaman M1 sampai M4.
   Alat otomatis hanya menangkap sebagian hambatan: uji keyboard dan
   pembaca layar manual tetap dijalankan terpisah (MILESTONES M9). */

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

test.beforeEach(async ({ page }) => {
  await matikanGesture(page)
})

async function pilihLayoutLaluMasukFoto(page: Page) {
  await page.goto("/booth/layout")
  await page.getByRole("radio", { name: "Strip 4 foto" }).check()
  await page.getByRole("button", { name: "Mulai Foto" }).click()
  await page.waitForURL("**/booth/capture")
}

const HALAMAN: {
  nama: string
  siapkan: (page: Page) => Promise<void>
}[] = [
  {
    nama: "welcome",
    siapkan: async (page) => {
      await page.goto("/")
    },
  },
  {
    nama: "privasi",
    siapkan: async (page) => {
      await page.goto("/privasi")
    },
  },
  {
    nama: "pilih layout",
    siapkan: async (page) => {
      await page.goto("/booth/layout")
    },
  },
  { nama: "ambil foto", siapkan: pilihLayoutLaluMasukFoto },
  { nama: "hias strip", siapkan: masukHias },
  { nama: "hasil", siapkan: masukHasil },
  {
    /* M6: panggung yang sama dengan halaman strip, tanpa proyek Supabase
       halaman /s/[id] merender 404 ini. */
    nama: "strip tidak ditemukan",
    siapkan: async (page) => {
      await page.goto("/s/tidakada1234")
    },
  },
]

for (const viewport of [
  { width: 360, height: 640 },
  { width: 1280, height: 900 },
]) {
  for (const halaman of HALAMAN) {
    test(`${halaman.nama} bersih dari pelanggaran axe pada ${viewport.width} px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await halaman.siapkan(page)

      const { violations } = await new AxeBuilder({ page })
        .withTags(TAGS)
        .analyze()

      expect(
        violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          nodes: violation.nodes.map((node) => node.target.join(" ")),
        }))
      ).toEqual([])
    })
  }
}
