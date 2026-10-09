"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Images } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { LAYOUTS, type LayoutId } from "@/lib/layouts"
import { useBoothStore } from "@/stores/booth"

/* FR-13 di halaman Welcome. Satu-satunya pulau klien di `/`: kode pengolahan
   gambar dimuat saat berkas dipilih, bukan saat halaman dibuka (FR-01).
   Tanpa layout terpilih, sesi memakai bawaan Strip 4 (PRD SE-01). */

export function GalleryPicker() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const layoutId = useBoothStore((state) => state.layoutId)
  const setLayout = useBoothStore((state) => state.setLayout)
  const setShot = useBoothStore((state) => state.setShot)
  const [working, setWorking] = useState(false)

  async function handleFiles(files: File[]) {
    if (files.length === 0) {
      return
    }

    setWorking(true)
    try {
      const target: LayoutId = layoutId ?? "strip-4"
      /* Impor statis akan menaruh pipeline gambar di bundel awal Welcome dan
         melanggar FR-01 ("halaman tidak memuat kode kamera, gesture, atau
         kanvas"). Karena itu pemuatan sengaja ditunda sampai berkas dipilih. */
      const { muatFotoGaleri } = await import(
        "@/features/gallery/muatFotoGaleri"
      )
      const { results, rejected } = await muatFotoGaleri(files, target)
      const needed = LAYOUTS[target].shotCount

      if (results.length === 0) {
        toast.error(
          "Format foto tidak didukung browser ini. Coba JPEG atau PNG."
        )
        return
      }

      setLayout(target)
      for (const result of results) {
        setShot(result.index, { still: result.still, capturedAt: Date.now() })
      }

      if (results.length < needed) {
        toast.info(
          `${results.length} foto terpasang. Lengkapi sisanya di kamera.`
        )
      }
      if (rejected > 0) {
        toast.error(
          "Sebagian foto tidak didukung browser ini. Coba JPEG atau PNG."
        )
      }
      router.push(results.length < needed ? "/booth/capture" : "/booth/customize")
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="sr-only"
        aria-label="Pilih foto dari perangkat"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          /* Direset supaya berkas yang sama bisa dipilih lagi. */
          event.target.value = ""
          void handleFiles(files)
        }}
      />
      <Button
        variant="secondary"
        size="lg"
        disabled={working}
        onClick={() => inputRef.current?.click()}
      >
        <Images weight="bold" className="size-[22px]" aria-hidden />
        {working ? "Menyiapkan foto..." : "Pakai Foto Galeri"}
      </Button>
    </>
  )
}
