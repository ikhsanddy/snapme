import type { NextConfig } from "next";

/* ARCHITECTURE §8: header keamanan. Kamera dibatasi ke origin sendiri, halaman
   strip tidak mengirim referrer dan tidak diindeks, dan halaman itu tidak boleh
   dibingkai situs lain. M9 memasang CSP penuh: seluruh halaman dan rutenya
   memakai satu kebijakan yang sama, termasuk `frame-ancestors 'none'` yang
   sebelumnya hanya dipasang di `/s` dan `/r`. */

/* Satu-satunya host luar yang dipakai snapme adalah Supabase: unggahan
   langsung ke Storage dan URL bertanda tangan saat membaca. Nilainya datang
   dari env publik yang sama dengan yang dipakai klien, jadi CSP-nya mengikuti
   proyek yang sedang dipakai, dan tanpa env (mode lokal tanpa backend)
   direktifnya menyusut ke origin sendiri. */
function supabaseOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url === undefined || url === "") {
    return null;
  }
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const SUPABASE = supabaseOrigin();
/** Ruang untuk host Supabase di direktif yang membutuhkannya. */
const EXTERNAL = SUPABASE === null ? "" : ` ${SUPABASE}`;

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
  `img-src 'self' blob: data:${EXTERNAL}`,
  `media-src 'self' blob: data:${EXTERNAL}`,
  `connect-src 'self' blob: data:${EXTERNAL}`,
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
  cacheComponents: true,
  partialPrefetching: true,
  /* M9: semua permintaan ke halaman ber-PPR dirender blocking, bukan menerima
     cangkang statis lebih dulu. Alasannya status HTTP: `/s/[id]` dan `/r/[id]`
     memanggil `notFound()` untuk id yang tidak ada, dan cangkang PPR sudah
     mengirim 200 sebelum hasilnya diketahui, sehingga di server produksi
     halamannya menjawab 200 (di server pengembangan 404). `X-Robots-Tag:
     noindex` membuat dampak mesin pencarinya nihil, tetapi statusnya tetap
     dibetulkan. Halaman statis tidak terpengaruh: tidak ada metadata yang
     dialirkan di sana. */
  htmlLimitedBots: /.*/,
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
