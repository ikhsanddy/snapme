"use client"

import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §9 dan §10.2: sakelar Gesture Snap di kepala panel. Keadaan
   selalu disebut teks (Nyala/Mati), bukan hanya warna. GS-07: disembunyikan
   saat model gagal dimuat. Markup mengikuti docs/ui-reference/capture.html. */
export function GestureToggle({
  enabled,
  onChange,
  hidden,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  hidden: boolean
}) {
  if (hidden) {
    return null
  }

  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 rounded-pill border-2 border-ink bg-paper py-0 pr-2 pl-4 text-[15px] font-bold text-ink",
        "hover:shadow-hard-sm focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet",
        "transition-transform duration-[120ms] motion-reduce:transition-none"
      )}
    >
      Gesture Snap
      <span
        className={cn(
          "rounded-pill border-2 border-ink px-2.5 py-0.5 font-mono text-xs font-bold tracking-[0.06em] text-ink uppercase",
          enabled ? "bg-lime" : "bg-cream"
        )}
      >
        {enabled ? "Nyala" : "Mati"}
      </span>
    </button>
  )
}
