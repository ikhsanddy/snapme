import { defineConfig, devices } from "@playwright/test"

/* M10: uji e2e terhadap server pratinjau produksi-fidelitas (`npm run
   preview:e2e` = build OpenNext lalu `wrangler dev --env e2e`), bukan `next
   dev`. Empat spek ber-jaringan (share, live, relay, a11y halaman ber-link)
   dijalankan penuh di sini; spek lain tetap di `playwright.config.ts` dengan
   dev server biasa karena butuh kamera palsu Chromium dan berkas statis yang
   lebih cepat.

   Konfigurasi utama sengaja tidak diubah supaya `npx playwright test` tetap
   berjalan apa adanya. */

const PORT = 8787
/* Server pratinjau dinormalkan `wrangler dev` ke host `localhost`: `request.url`
   di dalam Worker selalu memakai host itu, dan gerbang anti-situs-lain di rute
   POST membandingkan `Origin` peramban dengan origin URL itu. Karena itu uji
   memakai `localhost` juga; dengan `127.0.0.1` semua POST dari peramban dijawab
   400 "Permintaan tidak valid" (terbukti di docs/DECISIONS.md M10). Kesiapan
   server diperiksa lewat TCP (`webServer.port`), bukan permintaan HTTP. */
const BASE_URL = `http://localhost:${PORT}`

/* Gerbang spek ber-jaringan: server pratinjau ini selalu punya binding D1/R2/KV,
   jadi gerbangnya dinyalakan dari berkas ini, bukan dari env shell. */
process.env.CLOUDFLARE_E2E = "1"

export default defineConfig({
  testDir: "tests/e2e",
  projects: [
    {
      name: "cloudflare",
      testMatch: [
        "**/share.spec.ts",
        "**/live.spec.ts",
        "**/relay.spec.ts",
        "**/a11y.spec.ts",
      ],
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
  /* Headless Chromium merender MediaPipe tanpa GPU: inisialisasi model dan
     inferensi pertama bisa memblokir main thread beberapa detik sehingga timer
     hitung mundur meleset (M3, DECISIONS.md). */
  expect: { timeout: 15_000 },
  use: { baseURL: BASE_URL },
  webServer: {
    command: "npm run preview:e2e",
    /* Kesiapan diperiksa lewat TCP (`port`), bukan permintaan HTTP (`url`).
       Proksi `wrangler dev` menggantung untuk klien Node `http` (tanpa header
       `Accept`/`User-Agent`) padahal peramban dan `curl` dilayani normal, jadi
       pemeriksaan HTTP membuat Playwright menyerah di gerbang padahal
       servernya sehat. Diuji di docs/DECISIONS.md M10. */
    port: PORT,
    reuseExistingServer: true,
    timeout: 240_000,
  },
})
