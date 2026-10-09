"use client"

import { useState } from "react"
import { Users } from "@phosphor-icons/react"

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

/* M8 (SE-01 sampai SE-03): kartu estafet di rel kanan langkah Ambil Foto.
   Susunannya mengikuti docs/ui-reference/capture.html: kartu `violet-soft`,
   judul berikon, satu kalimat, lalu tombol sekunder.

   Tiga keadaan: belum cukup foto (tombol nonaktif dengan teks bantu), siap
   (tombol membuka dialog persetujuan), dan link sudah dibuat (alamat, tombol
   bagikan, tautan status). Tidak ada aksi `tangerine` di sini: aksi utama
   layar tetap "Lanjut Hias" (DESIGN-SYSTEM §2). */

export function RelayInviteCard({
  relayId,
  canInvite,
  filled,
  required,
  busy,
  statusText,
  onInvite,
  onShare,
}: {
  relayId: string | null
  canInvite: boolean
  filled: number
  required: number
  busy: boolean
  statusText?: string
  onInvite: () => void
  onShare: (url: string) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const relayUrl =
    relayId === null
      ? ""
      : `${typeof window === "undefined" ? "" : window.location.origin}/r/${relayId}`
  const missing = Math.max(0, required - filled)

  return (
    <div className="flex flex-col gap-2.5 rounded-card border-2 border-ink bg-violet-soft p-4">
      <h2 className="flex items-center gap-2 font-display text-base font-extrabold">
        <Users weight="bold" className="size-[22px] shrink-0" aria-hidden />
        Strip Estafet
      </h2>

      {relayId === null ? (
        <>
          <p className="text-[15px] leading-[1.4]">
            Cukup ambil {required} foto. Sisanya diisi temanmu lewat link.
          </p>
          {busy || statusText !== undefined ? (
            <p role="status" className="text-sm leading-[1.4]">
              {statusText ?? "Menyiapkan link estafet..."}
            </p>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              disabled={!canInvite}
              onClick={() => setConfirmOpen(true)}
            >
              Estafet ke Teman
            </Button>
          )}
          {missing > 0 ? (
            <p aria-live="polite" className="text-sm leading-[1.4] text-ink">
              {`Butuh ${missing} foto dulu.`}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p data-testid="relay-url" className="font-mono text-[13px] break-all">
            {relayUrl}
          </p>
          <Button
            variant="neutral"
            size="sm"
            className="w-full"
            onClick={() => onShare(relayUrl)}
          >
            Bagikan tautan
          </Button>
          <a
            href={`/r/${relayId}`}
            className="text-center text-sm font-bold underline underline-offset-4"
          >
            Lihat status
          </a>
        </>
      )}

      {/* SE-02: persetujuan menyebut apa yang diunggah, siapa yang bisa
          melihat, dan kapan terhapus. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="title text-ink">
              Unggah foto estafet?
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-[1.5]">
              {`Foto strip kamu (${required} foto) dikirim ke link pribadi. Hanya orang yang kamu kirimi link yang bisa melengkapi. Link aktif 48 jam, lalu foto terhapus otomatis.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="neutral">Batal</Button>
            </DialogClose>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmOpen(false)
                onInvite()
              }}
            >
              Buat Link Estafet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
