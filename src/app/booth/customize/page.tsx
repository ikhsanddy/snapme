"use client"

import dynamic from "next/dynamic"
import { Check } from "@phosphor-icons/react"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { Badge } from "@/components/ui/badge"
import { countFilled, useBoothStore, useRequireShots } from "@/stores/booth"

/* Prasyarat FR-07 tetap di sini: tanpa semua slot terisi, langkah Hias dialihkan
   kembali ke Ambil Foto. Isi halaman dimuat dengan import() dinamis supaya Konva
   hanya masuk bundel rute ini (ARCHITECTURE §9). */

const CustomizeEditor = dynamic(() => import("@/features/editor/CustomizeEditor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
})

/* DESIGN-SYSTEM §9 (Skeleton): blok cream bergaris putus-putus mengikuti bentuk
   akhir, tanpa spinner. */
function EditorSkeleton() {
  const shots = useBoothStore((state) => state.shots)

  return (
    <BoothPanel
      title="Hias Strip"
      backHref="/booth/capture"
      actions={
        <Badge variant="lime">
          <Check weight="bold" aria-hidden />
          {`${countFilled(shots)} foto siap`}
        </Badge>
      }
      center={
        <div className="flex min-h-[420px] items-center justify-center rounded-stage border-2 border-dashed border-muted bg-cream p-6">
          <span className="sr-only">Menyiapkan kanvas hias</span>
        </div>
      }
    />
  )
}

export default function CustomizeStepPage() {
  const ready = useRequireShots()
  const layoutId = useBoothStore((state) => state.layoutId)

  if (!ready || layoutId === null) {
    return null
  }

  return <CustomizeEditor layoutId={layoutId} />
}
