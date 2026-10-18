"use client"

import dynamic from "next/dynamic"

import { BoothPanel } from "@/features/booth/BoothPanel"
import { Badge } from "@/components/ui/badge"
import { countFilled, useBoothStore, useRequireShots } from "@/stores/booth"

/* FR-11 dan FR-12: langkah Hasil. Ekspor dan komposisi lembar cetak ada di
   ResultView yang dimuat dengan import() dinamis supaya Konva hanya masuk
   bundel rute ini (ARCHITECTURE §9). */

const ResultView = dynamic(() => import("@/features/result/ResultView"), {
  ssr: false,
  loading: () => <ResultSkeleton />,
})

/* DESIGN-SYSTEM §9 (Skeleton): blok cream bergaris putus-putus mengikuti bentuk
   akhir, tanpa spinner. */
function ResultSkeleton() {
  const shots = useBoothStore((state) => state.shots)

  return (
    <BoothPanel
      title="Hasil"
      backHref="/booth/customize"
      actions={<Badge variant="lime">{`${countFilled(shots)} foto`}</Badge>}
      center={
        <div className="flex min-h-[420px] items-center justify-center rounded-stage border-2 border-dashed border-muted bg-cream p-6">
          <span className="sr-only">Menyiapkan hasil</span>
        </div>
      }
    />
  )
}

export default function ResultStepPage() {
  const ready = useRequireShots()
  const layoutId = useBoothStore((state) => state.layoutId)

  if (!ready || layoutId === null) {
    return null
  }

  return <ResultView layoutId={layoutId} />
}
