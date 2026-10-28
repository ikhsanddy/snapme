import type { Metadata } from "next"
import { notFound } from "next/navigation"

/* SH-05: halaman strip yang dibuka dari QR atau link pribadi. Backend
   Cloudflare (D1/R2) sudah dibongkar, jadi tidak ada strip yang tersimpan dan
   halaman ini selalu menjawab 404. Header `noindex` dan `no-referrer` untuk
   `/s/*` tetap dipasang `next.config.ts`. */

export const metadata: Metadata = {
  title: "Strip | snapme",
  robots: { index: false, follow: false },
}

export default function StripPage() {
  notFound()
}
