import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Lock } from "@phosphor-icons/react/ssr"

import { SiteHeader } from "@/components/site/SiteHeader"
import { Button } from "@/components/ui/button"
import type { SlotPhoto } from "@/features/relay/bootstrap"
import { RelayCompleteView } from "@/features/relay/RelayCompleteView"
import { RelayJoinView } from "@/features/relay/RelayJoinView"
import { getBindings } from "@/lib/cloudflare"
import { selectRelay } from "@/lib/db/relays"
import { relaySlotsOf } from "@/lib/db/rows"
import { isExpired } from "@/lib/expiry"
import { LAYOUTS, type LayoutId } from "@/lib/layouts"
import { presignGet } from "@/lib/r2/presign"

/* M8 (SE-04 sampai SE-07, SE-08): halaman gabung estafet. Komponen server,
   `noindex` lewat metadata, dan berkas slot diambil lewat URL presigned R2
   berumur pendek seperti halaman /s/[id].

   Penyimpangan yang sama dengan /s/[id] juga berlaku: App Router tidak bisa
   memasang status 410 pada halaman, jadi estafet yang lewat 48 jam atau
   dibatalkan dirender sebagai tampilan pesan; status 410 harfiah dijawab rute
   API. Untuk baris yang tidak ada, halamannya menjawab 404. */

export const metadata: Metadata = {
  title: "Estafet | snapme",
  robots: { index: false, follow: false },
}

function RelayShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage-grid flex min-h-dvh flex-1 flex-col">
      <div className="page-container flex flex-1 flex-col gap-6 py-6">
        {/* Bukan halaman pemasaran: aksi utama ada di panel (DESIGN-SYSTEM §14). */}
        <SiteHeader ctaVariant="none" />
        <main className="flex flex-col items-start gap-6 rounded-panel border-3 border-ink bg-paper p-6 shadow-hard-lg">
          {children}
        </main>
      </div>
    </div>
  )
}

function RelayMessage({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <>
      <h1 className="heading flex items-center gap-3 text-ink">
        <Lock weight="bold" className="size-8 shrink-0" aria-hidden />
        {title}
      </h1>
      <p className="max-w-[65ch] text-base leading-[1.5]">{body}</p>
      <Button size="lg" asChild>
        <Link href="/booth/layout">Mulai Foto</Link>
      </Button>
    </>
  )
}

export default async function RelayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await connection()
  const { id } = await params

  const bindings = getBindings()
  if (bindings === null) {
    notFound()
  }
  let row
  try {
    row = await selectRelay(bindings.db, id)
  } catch (error) {
    console.error("Halaman /r/[id] gagal membaca estafet:", error)
    notFound()
  }
  if (row === null || !Object.hasOwn(LAYOUTS, row.layout)) {
    notFound()
  }
  const layout = row.layout as LayoutId

  if (isExpired(row.expires_at, new Date())) {
    return (
      <RelayShell>
        <RelayMessage
          title="Estafet ini sudah kedaluwarsa."
          body="Link estafet aktif 48 jam. Fotonya sudah terhapus otomatis. Minta pengirimnya membuat link baru, atau mulai sesi sendiri."
        />
      </RelayShell>
    )
  }
  if (row.status === "cancelled") {
    return (
      <RelayShell>
        <RelayMessage
          title="Estafet sudah dibatalkan pembuatnya."
          body="Fotonya sudah dihapus permanen. Kamu bisa mulai sesi sendiri."
        />
      </RelayShell>
    )
  }

  /* Estafet yang sudah selesai tidak mengirim apa pun yang istimewa: tautan
     strip dan URL foto slot diminta klien lewat POST /api/relays/[id]/strip
     setelah tokennya terbaca (token lewat header, jadi halaman GET tidak bisa
     memeriksanya). Pengunjung tanpa token hanya melihat statusnya. */
  if (row.status === "complete") {
    return (
      <RelayShell>
        <RelayCompleteView id={row.id} layout={layout} />
      </RelayShell>
    )
  }

  /* Slot teman belum ada berkasnya sebelum penuntasan, jadi hanya foto pembuat
     yang ditandatangani di keadaan menunggu/diambil. */
  const slotsToSign = relaySlotsOf(row).filter((slot) => slot.owner === "host")
  const signed = await Promise.all(
    slotsToSign.map(async (slot) => {
      try {
        return { index: slot.index, url: await presignGet(bindings.s3, slot.path) }
      } catch {
        return null
      }
    })
  )
  const slotPhotos = signed.filter(
    (photo): photo is SlotPhoto => photo !== null
  )

  return (
    <RelayShell>
      <RelayJoinView
        id={row.id}
        layout={layout}
        status={row.status}
        expiresAt={row.expires_at}
        slots={relaySlotsOf(row).map((slot) => ({
          index: slot.index,
          owner: slot.owner,
        }))}
        hostPhotos={slotPhotos}
      />
    </RelayShell>
  )
}
