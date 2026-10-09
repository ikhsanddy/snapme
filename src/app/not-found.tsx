import Link from "next/link"

import { SiteHeader } from "@/components/site/SiteHeader"
import { Button } from "@/components/ui/button"

/* Halaman 404. Dipakai untuk link strip yang salah atau yang sudah dihapus.
   Susunannya mengikuti Privasi (panel di atas panggung lime), dan baris atasnya
   tanpa CTA supaya satu-satunya aksi `primary` adalah tombol di panel. */

export default function NotFoundPage() {
  return (
    <div className="stage-grid flex min-h-dvh flex-1 flex-col">
      <div className="page-container flex flex-1 flex-col gap-6 py-6">
        <SiteHeader ctaVariant="none" />

        <main className="flex flex-col items-start gap-4 rounded-panel border-3 border-ink bg-paper p-6 shadow-hard-lg">
          <h1 className="heading text-ink">Halaman tidak ditemukan.</h1>
          <p className="max-w-[65ch] text-base leading-[1.5]">
            Link mungkin salah atau stripnya sudah dihapus.
          </p>
          <Button size="lg" asChild>
            <Link href="/">Mulai Foto</Link>
          </Button>
        </main>
      </div>
    </div>
  )
}
