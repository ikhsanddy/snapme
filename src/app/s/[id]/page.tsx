import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { DownloadSimple, Lock, Timer } from "@phosphor-icons/react/ssr"

import { SiteHeader } from "@/components/site/SiteHeader"
import { Button } from "@/components/ui/button"
import { LiveStripVideo } from "@/features/live/LiveStripVideo"
import { StripOwnerActions } from "@/features/share/StripOwnerActions"
import { isExpired } from "@/lib/expiry"
import { STORAGE_BUCKET } from "@/lib/schemas"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { STRIP_COLUMNS, type StripRow } from "@/lib/supabase/strips"

/* SH-05: halaman strip yang dibuka dari QR atau link pribadi. Komponen server,
   `noindex` lewat metadata, dan berkasnya diambil lewat URL bertanda tangan
   berumur pendek supaya tautan Storage tidak pernah tersimpan di perangkat.

   Penyimpangan tercatat (DECISIONS M6): App Router tidak bisa memasang status
   410 pada halaman, jadi strip yang lewat 7 hari dirender sebagai tampilan
   kedaluwarsa; status 410 harfiah dijawab rute API. Di luar itu halaman ini
   menjawab 404 (strip tidak ada, masih draf, atau berkasnya sudah hilang). */

const SIGNED_URL_SECONDS = 3_600

/* Halaman ini isinya seluruhnya bergantung pada satu baris basis data: tidak
   ada bagian statis yang berguna untuk di-stream lebih dulu. Rutenya sengaja
   blocking (`instant = false`, Next 16 Cache Components) supaya `notFound()`
   benar-benar menjawab 404, bukan 200 yang menyusul tampilan tidak ditemukan
   di tengah aliran. */
export const instant = false

const EXPIRY_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export const metadata: Metadata = {
  title: "Strip | snapme",
  robots: { index: false, follow: false },
}

function StripShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage-grid flex min-h-dvh flex-1 flex-col">
      <div className="page-container flex flex-1 flex-col gap-6 py-6">
        {/* Halaman ini bukan halaman pemasaran: aksi utama ada di panel, jadi
            baris atas tidak membawa CTA (DESIGN-SYSTEM §14: satu primary). */}
        <SiteHeader ctaVariant="none" />
        <main className="flex flex-col items-start gap-6 rounded-panel border-3 border-ink bg-paper p-6 shadow-hard-lg">
          {children}
        </main>
      </div>
    </div>
  )
}

export default async function StripPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await connection()
  const { id } = await params

  const admin = getSupabaseAdmin()
  if (admin === null) {
    notFound()
  }
  const { data, error } = await admin
    .from("strips")
    .select(STRIP_COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error !== null) {
    console.error("Halaman /s/[id] gagal membaca strip:", error.message)
    notFound()
  }
  const row = data as StripRow | null
  /* Draf belum pernah selesai diunggah, jadi belum ada yang bisa dilihat. */
  if (row === null || row.status !== "complete") {
    notFound()
  }

  if (isExpired(row.expires_at, new Date())) {
    return (
      <StripShell>
        <h1 className="heading flex items-center gap-3 text-ink">
          <Lock weight="bold" className="size-8 shrink-0" aria-hidden />
          Strip ini sudah kedaluwarsa.
        </h1>
        <p className="max-w-[65ch] text-base leading-[1.5]">
          Berkasnya sudah terhapus otomatis. Minta pengirimnya membuat link
          baru, atau mulai sesi sendiri.
        </p>
        <Button size="lg" asChild>
          <Link href="/booth/layout">Mulai Foto</Link>
        </Button>
      </StripShell>
    )
  }

  const signed =
    row.still_path === null
      ? null
      : await admin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.still_path, SIGNED_URL_SECONDS)
  if (signed === null || signed.error !== null) {
    notFound()
  }
  /* M7: versi hidup ikut ditampilkan bila stripnya punya klip. Bila tautannya
     gagal dibuat, halaman tetap utuh dengan versi diamnya saja. */
  const liveSigned =
    row.live_path === null
      ? null
      : await admin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.live_path, SIGNED_URL_SECONDS)
  const liveUrl =
    liveSigned === null || liveSigned.error !== null
      ? null
      : liveSigned.data.signedUrl
  const downloadUrl = new URL(signed.data.signedUrl)
  downloadUrl.searchParams.set("download", `snapme-${row.id}.png`)

  return (
    <StripShell>
      <h1 className="heading text-ink">Strip ini</h1>
      {/* DataURL/URL bertanda tangan dari Storage, bukan aset: next/image
          tidak dipakai. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={signed.data.signedUrl}
        alt="Strip"
        className="h-auto w-full max-w-[420px] border-2 border-ink bg-cream"
      />
      {liveUrl === null ? null : (
        <LiveStripVideo src={liveUrl} poster={signed.data.signedUrl} />
      )}
      <p className="flex items-center gap-2 text-sm text-muted">
        <Timer weight="bold" className="size-5 shrink-0" aria-hidden />
        {row.expires_at === null
          ? "Strip ini terhapus otomatis setelah 7 hari."
          : `Terhapus otomatis ${EXPIRY_FORMAT.format(new Date(row.expires_at))}`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" asChild>
          <a href={downloadUrl.toString()}>
            <DownloadSimple weight="bold" className="size-[22px]" aria-hidden />
            Unduh
          </a>
        </Button>
        <StripOwnerActions id={row.id} />
      </div>
    </StripShell>
  )
}
