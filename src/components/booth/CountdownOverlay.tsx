"use client"

import { motion, useReducedMotion } from "motion/react"

import type { CountdownValue } from "@/features/capture/machine"
import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §9: lingkaran 168 px, garis 4 px, bayangan keras violet,
   angka Unbounded 900 96 px, isi lime untuk 3 dan 2, pink untuk 1. */
export function CountdownOverlay({ value }: { value: CountdownValue }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <motion.div
        key={value}
        role="status"
        initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 1.08, 1], opacity: 1 }}
        transition={{ duration: 0.5, times: [0, 0.6, 1], ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "font-display flex size-42 items-center justify-center rounded-full border-4 border-ink text-[96px] leading-none font-black text-ink shadow-hard-violet",
          value === 1 ? "bg-pink" : "bg-lime"
        )}
      >
        {value}
      </motion.div>
    </div>
  )
}
