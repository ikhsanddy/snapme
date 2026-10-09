"use client"

import { Camera } from "@phosphor-icons/react"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LAYOUTS } from "@/lib/layouts"
import { useBoothStore, useRequireLayout } from "@/stores/booth"

/* FR-04 sampai FR-07 dikerjakan di M2. Kerangka ini hanya memastikan prasyarat
   layout dan susunan panel sudah sesuai DESIGN-SYSTEM §10.2. */
export default function CaptureStepPage() {
  const ready = useRequireLayout()
  const layoutId = useBoothStore((state) => state.layoutId)

  if (!ready || layoutId === null) {
    return null
  }

  const layout = LAYOUTS[layoutId]

  return (
    <BoothPanel
      title="Ambil Foto"
      backHref="/booth/layout"
      chip={<Badge>{layout.label}</Badge>}
      left={
        <>
          <h2 className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
            Fotomu
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {layout.slotRects.map((rect, index) => (
              <div
                key={index}
                className="flex items-center justify-center rounded-thumb border-2 border-dashed border-muted bg-cream"
                style={{ aspectRatio: `${rect.width} / ${rect.height}` }}
              >
                <span className="font-mono text-sm font-bold text-muted">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </>
      }
      center={
        <div
          className="flex min-h-[420px] flex-1 flex-col items-center justify-center gap-3 rounded-stage border-3 border-ink bg-ink p-6 text-center"
        >
          <Camera weight="bold" className="size-9 text-paper" aria-hidden />
          <span className="font-mono text-xs font-bold tracking-[0.06em] text-lime uppercase">
            Area kamera
          </span>
          <p className="max-w-[36ch] text-[15px] leading-[1.5] text-paper">
            Pratinjau kamera muncul di sini setelah izin diberikan.
          </p>
        </div>
      }
      right={
        <>
          <p className="text-[15px] leading-[1.4] text-muted">
            {`Butuh ${layout.shotCount} foto lagi.`}
          </p>
          <Button size="lg" disabled className="w-full">
            Lanjut Hias
          </Button>
        </>
      }
    />
  )
}
