import { expect, test } from "@playwright/test"

test("galeri /dev/ui terbuka dan memuat tombol", async ({ page }) => {
  await page.goto("/dev/ui")

  /* Galeri komponen hanya dirender di server pengembangan (ARCHITECTURE §4);
     di server produksi halamannya cuma satu kalimat. Kedua keadaan ditunggu
     dulu, lalu ujinya dilewati bila galerinya memang tidak ada, supaya suite
     yang sama bisa dijalankan di kedua mode (verifikasi CSP M9). */
  const galeri = page.getByRole("heading", { name: "Galeri komponen" })
  await expect(
    galeri.or(page.getByText("Hanya saat pengembangan."))
  ).toBeVisible()
  test.skip(
    !(await galeri.isVisible()),
    "galeri /dev/ui tidak dirender di server produksi"
  )

  await expect(page.getByRole("button", { name: "Mulai Foto" })).toBeVisible()
})
