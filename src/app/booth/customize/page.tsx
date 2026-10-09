"use client"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { Badge } from "@/components/ui/badge"
import { countFilled, useBoothStore, useRequireShots } from "@/stores/booth"

/* Penyuntingan strip dikerjakan di M4. Halaman ini menjaga prasyarat FR-07:
   tanpa semua slot terisi, langkah Hias dialihkan kembali ke Ambil Foto. */
export default function CustomizeStepPage() {
  const ready = useRequireShots()
  const layoutId = useBoothStore((state) => state.layoutId)
  const shots = useBoothStore((state) => state.shots)

  if (!ready || layoutId === null) {
    return null
  }

  return (
    <BoothPanel
      title="Hias Strip"
      backHref="/booth/capture"
      chip={
        <Badge variant="lime">{`${countFilled(shots)} foto siap`}</Badge>
      }
      center={
        <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-stage border-2 border-dashed border-muted bg-cream p-6 text-center">
          <p className="max-w-[36ch] text-[15px] leading-[1.5] text-muted">
            Penyuntingan strip dibangun di M4. Foto dan pilihan layout sudah
            tersimpan di sesi ini.
          </p>
        </div>
      }
    />
  )
}
