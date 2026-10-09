import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "e2e",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /* ARCHITECTURE §10: kamera palsu supaya alur kamera bisa diuji otomatis. */
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
    /* M9: lintas peramban. Hanya `crossbrowser.spec.ts` yang dijalankan di
       sini, karena berkas lain butuh perangkat media palsu (bendera Chromium)
       atau asersi khusus Chromium. Proyek `chromium` tetap memuat semua berkas,
       termasuk crossbrowser.spec.ts. Edge memakai Edge yang terpasang di mesin
       (`channel: "msedge"`). */
    {
      name: "firefox",
      testMatch: "**/crossbrowser.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: "**/crossbrowser.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
    /* Proyek `msedge` dilepas: `npx playwright install msedge` gagal di mesin
       ini ("insufficient privileges") dan Edge tidak terpasang, sedangkan
       mesinnya sama dengan Chromium. Edge sungguhan masuk tabel uji manual
       pengguna di docs/DECISIONS.md (M9). */
  ],
  use: { baseURL: "http://localhost:3000" },
  /* Headless Chromium merender MediaPipe tanpa GPU: inisialisasi model dan
     inferensi pertama bisa memblokir main thread beberapa detik sehingga timer
     hitung mundur meleset. Batas bawaan 5 detik terlalu ketat untuk lingkungan
     itu (M3, DECISIONS.md). */
  expect: { timeout: 15_000 },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
