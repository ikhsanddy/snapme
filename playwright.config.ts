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
