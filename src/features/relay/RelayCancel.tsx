"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { useBoothStore } from "@/stores/booth"
import { cancelRelay } from "./api"
import { clearRelayToken } from "./relayToken"

/* M8 (SE-09): pembuat membatalkan estafetnya dari halaman /r/[id], kapan pun
   statusnya. Satu permintaan menghapus berkas slot, strip hasilnya bila sudah
   ada, dan menandai barisnya batal; halaman ini komponen server, jadi setelah
   barisnya berubah, render ulang menampilkan tampilan "dibatalkan". */

export function RelayCancelButton({ id, token }: { id: string; token: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleCancel() {
    setBusy(true)
    try {
      await cancelRelay(id, token)
      clearRelayToken(id)
      useBoothStore.getState().setRelay(null)
      toast.success("Estafet dibatalkan.")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Estafet belum bisa dihapus. Coba lagi sebentar lagi."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        Batalkan dan Hapus
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="title text-ink">
              Batalkan estafet?
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-[1.5]">
              Fotonya dihapus permanen. Bila strip hasilnya sudah jadi,
              stripnya ikut terhapus.
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
                setOpen(false)
                void handleCancel()
              }}
            >
              Batalkan dan Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
