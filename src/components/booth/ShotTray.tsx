"use client"

import { Check } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import type { Shot } from "@/stores/booth"

/* DESIGN-SYSTEM §9: kisi dua kolom, slot terisi bergaris dengan lencana centang
   violet, slot kosong bergaris putus-putus dengan nomor. FR-07: tiap slot terisi
   adalah tombol ulang foto tertentu. */
export function ShotTray({
  shots,
  slotRatio,
  busy,
  onRetake,
}: {
  shots: (Shot | null)[]
  slotRatio: number
  busy: boolean
  onRetake: (index: number) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {shots.map((shot, index) =>
        shot === null ? (
          <div
            key={index}
            style={{ aspectRatio: slotRatio }}
            className="flex items-center justify-center rounded-thumb border-2 border-dashed border-muted bg-cream"
          >
            <span className="font-mono text-lg font-bold text-muted">
              {index + 1}
            </span>
          </div>
        ) : (
          <button
            key={index}
            type="button"
            disabled={busy}
            onClick={() => onRetake(index)}
            aria-label={`Ulang foto ${index + 1}`}
            className={cn(
              "relative rounded-thumb",
              "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet",
              "disabled:pointer-events-none disabled:opacity-60"
            )}
          >
            {/* DataURL hasil kamera, bukan aset: next/image tidak dipakai di sini. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot.still}
              alt=""
              style={{ aspectRatio: slotRatio }}
              className="w-full rounded-thumb border-2 border-ink object-cover"
            />
            <span className="absolute -top-2 -right-2 flex size-[22px] items-center justify-center rounded-pill border-2 border-ink bg-violet text-paper">
              <Check weight="bold" className="size-3" aria-hidden />
            </span>
          </button>
        )
      )}
    </div>
  )
}
