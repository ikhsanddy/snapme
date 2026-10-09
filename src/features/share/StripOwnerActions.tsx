"use client"

import { useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { Trash } from "@phosphor-icons/react"
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
import { deleteStrip } from "./api"
import { clearStripToken, readStripToken } from "./stripToken"

/* SH-06: pemilik bisa menghapus stripnya dari halaman itu, tanpa akun. Yang
   membedakan pemilik dari pengunjung hanya token hapus yang tersimpan di
   perangkat pembuat (localStorage), jadi pengunjung tidak melihat tombol apa
   pun di sini.

   Token dibaca lewat `useSyncExternalStore`: pembacaan localStorage hanya
   terjadi di klien, dan snapshot di server `null`, sehingga penanda server dan
   hasil hidrasi tidak berbeda. */

const subscribeNone = () => () => {}

export function StripOwnerActions({ id }: { id: string }) {
  const router = useRouter()
  const storedToken = useSyncExternalStore(
    subscribeNone,
    () => readStripToken(id),
    () => null
  )
  const [deleted, setDeleted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const token = deleted ? null : storedToken
  if (token === null) {
    return null
  }

  async function handleDelete(stripToken: string) {
    setBusy(true)
    try {
      await deleteStrip(id, stripToken)
      clearStripToken(id)
      setDeleted(true)
      toast.success("Strip dihapus.")
      /* Halaman ini komponen server; setelah barisnya hilang, render ulang
         menjawab 404. */
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Strip belum bisa dihapus. Coba lagi sebentar lagi."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="lg"
        disabled={busy}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash weight="bold" className="size-[22px]" aria-hidden />
        Hapus strip
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="title text-ink">
              Hapus strip ini?
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-[1.5]">
              Berkasnya dihapus permanen dan linknya berhenti bekerja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="neutral">Batal</Button>
            </DialogClose>
            <Button
              variant="neutral"
              disabled={busy}
              onClick={() => {
                setConfirmOpen(false)
                void handleDelete(token)
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
