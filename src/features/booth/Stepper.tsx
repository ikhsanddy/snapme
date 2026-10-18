"use client"

import { usePathname } from "next/navigation"
import { Check } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §5: stepper langkah booth. Noninteraktif: mundur lewat
   tombol kembali di kepala panel tiap langkah. */
const STEPS = [
  { href: "/booth/layout", label: "Layout" },
  { href: "/booth/capture", label: "Foto" },
  { href: "/booth/customize", label: "Hias" },
  { href: "/booth/result", label: "Hasil" },
] as const

export function Stepper() {
  const pathname = usePathname()
  const current = STEPS.findIndex((step) => pathname.startsWith(step.href))

  return (
    <ol className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold tracking-[0.06em] uppercase">
      {STEPS.map((step, index) => {
        const done = index < current
        const now = index === current

        return (
          <li
            key={step.href}
            aria-current={now ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill border-2 border-ink px-3 py-1.5",
              done && "bg-paper",
              now && "bg-ink text-paper"
            )}
          >
            {done ? (
              <Check weight="bold" className="size-3.5 text-violet" aria-hidden />
            ) : null}
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}
