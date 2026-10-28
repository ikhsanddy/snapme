import type { NextConfig } from "next";

/* ARCHITECTURE §8: header keamanan. Kamera dibatasi ke origin sendiri, halaman
   strip tidak mengirim referrer dan tidak diindeks, dan halaman itu tidak boleh
   dibingkai situs lain. M9 memasang CSP penuh: seluruh halaman dan rutenya
   memakai satu kebijakan yang sama, termasuk `frame-ancestors 'none'` yang
   sebelumnya hanya dipasang di `/s` dan `/r`. */

/* Semua aset dan permintaan snapme berasal dari origin sendiri: fon di-host
   sendiri, wasm dan model MediaPipe di-host sendiri, dan tidak ada unggahan
   ke layanan luar, jadi CSP tidak punya host luar yang perlu diizinkan. */

/* Alasan tiap direktif (rinciannya di docs/DECISIONS.md, M9):

   - `script-src 'unsafe-inline'`: skrip bootstrap App Router ditulis inline dan
     tanpa nonce. Nonce memaksa render dinamis di setiap permintaan, yang
     bertabrakan dengan `cacheComponents` dan target LCP Welcome (PRD §8).
   - `script-src 'wasm-unsafe-eval'`: Gesture Snap menjalankan model MediaPipe
     yang di-host sendiri (ARCHITECTURE §6, §8).
   - `'unsafe-eval'` hanya di pengembangan, karena React memakainya untuk
     menyusun ulang jejak galat di peramban; produksi tidak butuh itu.
   - `img-src`/`media-src` `blob:` dan `data:`: pratinjau dan ekspor lewat
     kanvas (`toDataURL`), bingkai klip sebagai ImageBitmap, dan hasil
     MediaRecorder sebagai URL blob.
   - `connect-src` `blob:` dan `data:`: konversi hasil ekspor jadi Blob lewat
     `fetch(dataUrl)`, tanpa jaringan keluar.
   - `worker-src 'self' blob:`: MediaPipe membuat worker dari berkasnya sendiri
     dan dari blob.
   - `font-src 'self' data:`: fon di-host sendiri lewat next/font.
   - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
     `frame-ancestors 'none'`: pagar dasar tanpa pemakaian yang sah di produk
     ini. */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
  }`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data:`,
  `media-src 'self' blob: data:`,
  `connect-src 'self' blob: data:`,
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Permissions-Policy", value: "camera=(self)" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const PRIVATE_HEADERS = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex" },
];

const nextConfig: NextConfig = {
  /* config options here */
  /* M10: `cacheComponents`, `partialPrefetching`, dan `htmlLimitedBots`
     DILEPAS. Ketiganya semula dipakai untuk PPR dan status 404 yang benar di
     `/s/[id]` dan `/r/[id]`, tetapi mesin Cache Components menolak berjalan
     stabil di bawah permintaan bersamaan: `CacheSignal` melempar
     "Cannot perform I/O on behalf of a different request" (penanda waktu yang
     dibuat di konteks permintaan lain) dan server menjawab 500 untuk semua
     permintaan berikutnya. Tanpa PPR, kedua halaman itu dirender dinamis dan
     `notFound()` tetap menjawab 404 sungguhan. Rinciannya di
     `docs/DECISIONS.md` M10. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      /* `/r/[id]` milik M8; aturannya sudah dipasang sekarang supaya halaman
         estafet tidak pernah bocor referrer saat dibangun. CSP-nya sudah
         ikut dari baris pertama. */
      { source: "/s/:path*", headers: PRIVATE_HEADERS },
      { source: "/r/:path*", headers: PRIVATE_HEADERS },
    ];
  },
};

export default nextConfig;
