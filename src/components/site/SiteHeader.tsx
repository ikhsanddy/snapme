import Link from "next/link"

import { Wordmark } from "@/components/site/Wordmark"
import { Button } from "@/components/ui/button"

/* DESIGN-SYSTEM §10.1: baris atas Welcome dan halaman Privasi.
   Varian CTA: `secondary` saat hero memegang satu-satunya aksi `primary`
   (§1 dan §14), `primary` di halaman yang tidak punya aksi lain. */
export function SiteHeader({
  ctaVariant = "secondary",
}: {
  ctaVariant?: "primary" | "secondary"
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Wordmark />
      <nav className="flex flex-wrap items-center gap-4">
        <Link
          href="/privasi"
          className="inline-flex min-h-11 items-center px-1 font-mono text-xs font-bold tracking-[0.06em] uppercase focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet"
        >
          Privasi
        </Link>
        <Button variant={ctaVariant} size="sm" asChild>
          <Link href="/booth/layout">Mulai Foto</Link>
        </Button>
      </nav>
    </header>
  )
}
