"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { Timer, Users } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getLayout, type LayoutId } from "@/lib/layouts"
import type { RelayRole } from "@/lib/relaySlots"
import { cn } from "@/lib/utils"
import { claimRelay } from "./api"
import { RelayCancelButton } from "./RelayCancel"
import {
  bootstrapGuestSession,
  guestSessionMatches,
  type SlotPhoto,
} from "./bootstrap"
import { parseRelayToken, rawRelayToken, saveRelayToken } from "./relayToken"
import { shareLink } from "./shareLink"

/* M8 (SE-04 sampai SE-06): halaman /r/[id] untuk estafet yang belum selesai.
   Yang membedakan pembuat, teman, dan pengunjung lain hanyalah token yang
   tersimpan di perangkat masing-masing (localStorage), jadi tokennya dibaca
   lewat `useSyncExternalStore` seperti StripOwnerActions: snapshot di server
   null, dan hasil hidrasi tidak berbeda.

   Foto yang sudah ada datang dari server sebagai URL bertanda tangan berumur
   pendek; teman melihatnya sebagai bayangan slot yang sudah terisi. */

const EXPIRY_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
})

const subscribeNone = () => () => {}

export function RelayJoinView({
  id,
  layout,
  status,
  expiresAt,
  slots,
  hostPhotos,
}: {
  id: string
  layout: LayoutId
  status: "waiting" | "claimed"
  expiresAt: string | null
  slots: { index: number; owner: RelayRole }[]
  hostPhotos: SlotPhoto[]
}) {
  const router = useRouter()
  /* Snapshot `useSyncExternalStore` harus primitif: objek hasil parse selalu
     baru dan akan memicu render tanpa henti. */
  const rawToken = useSyncExternalStore(
    subscribeNone,
    () => rawRelayToken(id),
    () => null
  )
  const stored = useMemo(() => parseRelayToken(rawToken), [rawToken])
  const [claimOpen, setClaimOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const photoUrl = new Map<number, string>(
    hostPhotos.map((photo) => [photo.index, photo.url])
  )
  const shotCount = slots.length
  const hostCount = slots.filter((slot) => slot.owner === "host").length
  const guestCount = shotCount - hostCount
  const slotRatio = getLayout(layout).slot.width / getLayout(layout).slot.height

  /** SE-06: hanya satu perangkat yang bisa mengambil giliran; kalau kalah
   *  balapan, server menjawab 409 dan pesannya muncul apa adanya. */
  async function handleClaim() {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      const claimed = await claimRelay(id)
      saveRelayToken(id, "guest", claimed.guestToken)
      await bootstrapGuestSession({ id, layout }, hostPhotos)
      router.push("/booth/capture")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Giliran belum bisa diambil. Coba lagi sebentar lagi."
      )
    } finally {
      setBusy(false)
    }
  }

  /** Sesi teman yang sudah ada (foto pembuat lengkap) tidak dibangun ulang,
   *  supaya foto yang sempat diambil lokal tidak hilang. */
  async function handleContinue() {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      if (!guestSessionMatches(id, layout)) {
        await bootstrapGuestSession({ id, layout }, hostPhotos)
      }
      router.push("/booth/capture")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sesi estafet belum bisa dibuka. Coba lagi sebentar lagi."
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleShare() {
    const outcome = await shareLink(
      `${window.location.origin}/r/${id}`,
      "Strip Estafet snapme"
    )
    if (outcome === "copied") {
      toast.success("Tautan disalin.")
    } else if (outcome === "shared") {
      toast.success("Tautan dibagikan.")
    } else {
      toast.error(
        "Tautan belum bisa dibagikan. Salin manual dari alamat di atas."
      )
    }
  }

  const preview = (
    <div className="grid max-w-[420px] grid-cols-2 gap-2.5">
      {slots.map((slot) => {
        const url = photoUrl.get(slot.index)
        return url === undefined ? (
          <div
            key={slot.index}
            style={{ aspectRatio: slotRatio }}
            role="group"
            aria-label={`Slot ${slot.index + 1}`}
            className="flex items-center justify-center rounded-thumb border-2 border-dashed border-muted bg-cream"
          >
            <span className="font-mono text-sm font-bold text-muted">
              {slot.index + 1}
            </span>
          </div>
        ) : (
          <div
            key={slot.index}
            role="group"
            aria-label={`Slot ${slot.index + 1}, sudah terisi`}
          >
            {/* URL bertanda tangan dari Storage, bukan aset: next/image tidak
                dipakai. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              style={{ aspectRatio: slotRatio }}
              className="w-full rounded-thumb border-2 border-ink object-cover"
            />
          </div>
        )
      })}
    </div>
  )

  /* Pembuat membuka linknya sendiri: status dan tombol pembatalan. */
  if (stored?.role === "host") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-3">
          <p className={cn("rounded-pill border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold tracking-[0.06em] uppercase", status === "waiting" ? "bg-lime" : "bg-violet-soft")}>
            {status === "waiting" ? "Menunggu teman" : "Teman sudah mulai"}
          </p>
          {expiresAt === null ? null : (
            <span className="flex items-center gap-2 text-sm text-muted">
              <Timer weight="bold" className="size-5 shrink-0" aria-hidden />
              {`Link aktif sampai ${EXPIRY_FORMAT.format(new Date(expiresAt))}`}
            </span>
          )}
        </div>
        {preview}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" disabled={busy} onClick={() => void handleShare()}>
            Bagikan tautan
          </Button>
          <RelayCancelButton id={id} token={stored.token} />
        </div>
      </>
    )
  }

  if (status === "claimed" && stored?.role !== "guest") {
    return (
      <>
        <h1 className="heading text-ink">Estafet ini sudah diambil.</h1>
        <p className="max-w-[65ch] text-base leading-[1.5]">
          Temanmu sedang mengisi slotnya di perangkat lain. Kalau kamu
          pembuatnya, buka link ini dari perangkat yang membuatnya.
        </p>
      </>
    )
  }

  if (status === "claimed") {
    return (
      <>
        <h1 className="heading flex items-center gap-3 text-ink">
          <Users weight="bold" className="size-8 shrink-0" aria-hidden />
          Lanjutkan slotmu
        </h1>
        <p className="max-w-[65ch] text-base leading-[1.5]">
          {`Fotonya tersimpan di perangkat ini. Sisa ${guestCount} slot menunggu diisi.`}
        </p>
        {preview}
        <Button size="lg" disabled={busy} onClick={() => void handleContinue()}>
          {busy ? "Menyiapkan sesi..." : "Lanjut isi slot"}
        </Button>
      </>
    )
  }

  return (
    <>
      <h1 className="heading flex items-center gap-3 text-ink">
        <Users weight="bold" className="size-8 shrink-0" aria-hidden />
        Lengkapi strip ini
      </h1>
      <p className="max-w-[65ch] text-base leading-[1.5]">
        {`Temanmu sudah mengisi ${hostCount} foto. Isi ${guestCount} slot sisanya, lalu hias stripnya.`}
      </p>
      {preview}
      <Button size="lg" disabled={busy} onClick={() => setClaimOpen(true)}>
        Ambil Giliran
      </Button>

      {/* Persetujuan teman: apa yang diunggah, siapa yang bisa melihat, kapan
          terhapus (SE-02, SE-09). */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="title text-ink">
              Ambil giliran ini?
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-[1.5]">
              Foto yang kamu ambil akan diunggah ke link ini dan terhapus
              maksimal 7 hari setelah selesai. Kamu bisa menghapusnya kapan
              saja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="neutral">Batal</Button>
            </DialogClose>
            <Button
              disabled={busy}
              onClick={() => {
                setClaimOpen(false)
                void handleClaim()
              }}
            >
              Ambil Giliran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
