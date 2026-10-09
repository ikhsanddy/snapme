"use client"

import { useState } from "react"
import { CopySimple, Timer } from "@phosphor-icons/react"
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
import type { ShareState } from "@/stores/booth"

/* M6 (SH-04, SH-06): kartu bagikan di rel kanan langkah Hasil. Tiga keadaan:
   belum ada link (tombol + dialog persetujuan), sedang dibuat, dan sudah jadi
   (alamat, tombol salin, tanggal kedaluwarsa).

   Tidak ada aksi `tangerine` baru di sini: aksi utama layar Hasil tetap
   "Selesai & Unduh" (DESIGN-SYSTEM §2). */

const EXPIRY_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function ShareCard({
  strip,
  busy,
  onCreate,
  withLive = false,
  statusText,
}: {
  strip: ShareState["strip"]
  busy: boolean
  onCreate: () => void
  /** M7: klip Strip Hidup ikut diunggah, jadi persetujuannya menyebutnya. */
  withLive?: boolean
  /** Keadaan sementara dari pemanggil (mis. "Merekam versi hidup..."). */
  statusText?: string
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  /* Halaman Hasil dimuat tanpa SSR (`next/dynamic`, ARCHITECTURE §9), jadi
     alamat lengkap bisa dibaca di sini. */
  const shareUrl =
    strip === null
      ? ""
      : `${typeof window === "undefined" ? "" : window.location.origin}/s/${strip.id}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Tautan disalin.")
    } catch {
      toast.error("Tautan belum bisa disalin. Salin manual dari alamat di atas.")
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border-2 border-ink bg-paper p-4">
      <h2 className="font-display text-base font-extrabold">QR di strip</h2>

      {strip === null || strip.expiresAt === null ? (
        <>
          <p className="text-[15px] leading-[1.4]">
            Buat link pribadi supaya QR di strip bisa dibuka orang lain.
          </p>
          {strip !== null || busy || statusText !== undefined ? (
            <p role="status" className="text-sm leading-[1.4] text-muted">
              {statusText ??
                (busy ? "Menyiapkan link..." : "Mengunggah strip ke link pribadi...")}
            </p>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setConfirmOpen(true)}
            >
              Buat Link dan Unggah
            </Button>
          )}
        </>
      ) : (
        <>
          <p data-testid="strip-url" className="font-mono text-[13px] break-all">
            {shareUrl}
          </p>
          <Button variant="neutral" size="sm" className="w-full" onClick={copyLink}>
            <CopySimple weight="bold" className="size-[18px]" aria-hidden />
            Salin tautan
          </Button>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Timer weight="bold" className="size-4 shrink-0" aria-hidden />
            {`Terhapus otomatis ${EXPIRY_FORMAT.format(new Date(strip.expiresAt))}`}
          </p>
        </>
      )}

      {/* SE-02: persetujuan menyebut apa yang diunggah, siapa yang bisa
          melihat, dan kapan terhapus. Pintunya satu pintu, dipakai QR (SH-04). */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="title text-ink">Unggah strip?</DialogTitle>
            <DialogDescription className="text-[15px] leading-[1.5]">
              {withLive
                ? "Foto dan klip pendek strip kamu diunggah ke server snapme. Siapa pun yang punya link bisa melihatnya sampai 7 hari, lalu terhapus otomatis. Kamu bisa menghapusnya kapan saja."
                : "Foto strip kamu diunggah ke server snapme. Siapa pun yang punya link bisa melihatnya sampai 7 hari, lalu terhapus otomatis. Kamu bisa menghapusnya kapan saja."}
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
                onCreate()
              }}
            >
              Buat Link dan Unggah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
