import type { NextConfig } from "next";

/* ARCHITECTURE §8: header keamanan. Kamera dibatasi ke origin sendiri, halaman
   strip tidak mengirim referrer dan tidak diindeks, dan halaman itu tidak boleh
   dibingkai situs lain. CSP penuh (termasuk `wasm-unsafe-eval` untuk MediaPipe)
   menyusul di M9; tanpa CSP pun wasm satu origin sudah berjalan. */

const SECURITY_HEADERS = [
  { key: "Permissions-Policy", value: "camera=(self)" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const PRIVATE_HEADERS = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
         estafet tidak pernah bocor referrer saat dibangun. */
      { source: "/s/:path*", headers: PRIVATE_HEADERS },
      { source: "/r/:path*", headers: PRIVATE_HEADERS },
    ];
  },
};

export default nextConfig;
