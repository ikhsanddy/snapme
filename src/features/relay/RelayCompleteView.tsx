"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Check } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { LayoutId } from "@/lib/layouts"
import { fetchRelayStrip, type RelayStripInfo } from "./api"
import { bootstrapLocalCopy } from "./bootstrap"
import { RelayCancelButton } from "./RelayCancel"
import { parseRelayToken, rawRelayToken } from "./relayToken"

/* M8 (SE-07, SE-10): halaman /r/[id] untuk estafet yang sudah selesai.
   Pengunjung tanpa token hanya melihat bahwa estafetnya selesai, tanpa apa pun
   yang bisa dibuka; halaman server memang tidak mengirim tautan strip atau URL
   foto ke klien. Pemegang token memintanya lewat POST /api/relays/[id]/strip,
   dan hanya jawaban itulah yang membawa tautan serta URL bertanda tangan.

   SE-10 (P1): pembuat bisa menghias ulang salinannya secara lokal dari foto
   slot yang tersimpan. Salinan itu ditandai `localOnly` di store, jadi langkah
   Hias tidak menawarkan unggahan yang akan menimpa versi temannya. */

const subscribeNone = () => () => {}

type StripState =
  | { status: "memuat" }
  | { status: "siap"; info: RelayStripInfo }
  | { status: "gagal" }

export function RelayCompleteView({
  id,
  layout,
}: {
  id: string
  layout: LayoutId
}) {
  const router = useRouter()
  /* Snapshot `useSyncExternalStore` harus primitif (lihat RelayJoinView). */
  const rawToken = useSyncExternalStore(
    subscribeNone,
    () => rawRelayToken(id),
    () => null
  )
  const stored = useMemo(() => parseRelayToken(rawToken), [rawToken])
  const [strip, setStrip] = useState<StripState>({ status: "memuat" })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (stored === null) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const info = await fetchRelayStrip(id, stored.token)
        if (!cancelled) {
          setStrip({ status: "siap", info })
        }
      } catch {
        if (!cancelled) {
          setStrip({ status: "gagal" })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, stored])

  if (stored === null) {
    return (
      <>
        <h1 className="heading flex items-center gap-3 text-ink">
          <Check weight="bold" className="size-8 shrink-0" aria-hidden />
          Estafet ini sudah selesai.
        </h1>
        <p className="max-w-[65ch] text-base leading-[1.5]">
          Stripnya sudah lengkap dan dikunci. Minta tautan stripnya kepada
          pembuat atau temanmu.
        </p>
      </>
    )
  }

  if (strip.status === "memuat") {
    return (
      <>
        <h1 className="heading flex items-center gap-3 text-ink">
          <Check weight="bold" className="size-8 shrink-0" aria-hidden />
          Estafet ini sudah selesai.
        </h1>
        <p role="status" className="text-sm text-muted">
          Memeriksa status...
        </p>
      </>
    )
  }

  if (strip.status === "gagal") {
    return (
      <>
        <h1 className="heading flex items-center gap-3 text-ink">
          <Check weight="bold" className="size-8 shrink-0" aria-hidden />
          Estafet ini sudah selesai.
        </h1>
        <p role="alert" className="max-w-[65ch] text-base leading-[1.5] text-danger">
          Status estafet belum bisa dibaca. Muat ulang halaman, lalu coba lagi.
        </p>
      </>
    )
  }

  const { info } = strip
  const stripId = info.stripId

  /** SE-10: semua foto dimuat ke sesi lokal, tanpa unggahan baru. */
  async function handleRemix() {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      await bootstrapLocalCopy(layout, info.slots)
      router.push("/booth/customize")
    } catch {
      toast.error("Salinan belum bisa dibuka. Coba lagi sebentar lagi.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="heading flex items-center gap-3 text-ink">
        <Check weight="bold" className="size-8 shrink-0" aria-hidden />
        Estafet ini sudah selesai.
      </h1>
      <p className="max-w-[65ch] text-base leading-[1.5]">
        {stripId === null
          ? "Stripnya sudah dihapus pemiliknya. Salinan lokalnya masih bisa kamu hias sendiri."
          : info.role === "host"
            ? "Strip sudah lengkap. Buka stripnya, atau hias salinanmu sendiri tanpa mengubah versi temanmu."
            : "Strip sudah lengkap berkat foto darimu dan temanmu."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {stripId === null ? null : (
          <Button size="lg" asChild>
            <Link href={`/s/${stripId}`}>
              Lihat strip
              <ArrowRight weight="bold" className="size-[22px]" aria-hidden />
            </Link>
          </Button>
        )}
        {info.role === "host" ? (
          <Button
            variant="neutral"
            size="lg"
            disabled={busy || info.slots.length === 0}
            onClick={() => void handleRemix()}
          >
            {busy ? "Menyiapkan salinan..." : "Hias ulang salinanmu"}
          </Button>
        ) : null}
        {/* SE-09: pembuat tetap bisa menghapus estafetnya walau sudah selesai;
            strip hasilnya ikut terhapus. */}
        {info.role === "host" ? (
          <RelayCancelButton id={id} token={stored.token} />
        ) : null}
      </div>
    </>
  )
}
