"use client"

import { Camera } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §9: lingkaran 76 px tangerine dengan garis 3 px paper dan ikon kamera 34 px.
   DESIGN-SYSTEM §7: tekan = hover geser -1,-1 px, aktif geser 4,4 px, 120 ms.
   Latar tombol adalah panggung `ink`, jadi bayangan keras tidak terpakai di sini. */
export function ShutterButton({
  onShoot,
  disabled,
}: {
  onShoot: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onShoot}
      disabled={disabled}
      aria-label="Ambil foto"
      className={cn(
        "flex size-19 shrink-0 items-center justify-center rounded-full border-3 border-paper bg-tangerine text-ink",
        "transition-transform duration-[120ms] hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1",
        "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-lime",
        "disabled:pointer-events-none disabled:border-dashed disabled:bg-cream disabled:text-muted"
      )}
    >
      <Camera weight="bold" className="size-[34px]" aria-hidden />
    </button>
  )
}
