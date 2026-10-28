import type { Metadata } from "next"
import { notFound } from "next/navigation"

/* M8: halaman gabung estafet. Backend Cloudflare (D1/R2) sudah dibongkar, jadi
   tidak ada estafet yang tersimpan dan halaman ini selalu menjawab 404. Header
   `noindex` dan `no-referrer` untuk `/r/*` tetap dipasang `next.config.ts`. */

export const metadata: Metadata = {
  title: "Estafet | snapme",
  robots: { index: false, follow: false },
}

export default function RelayPage() {
  notFound()
}
