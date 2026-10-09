"use client"

import { useEffect } from "react"

import { markSessionStart, track } from "@/lib/analytics"

/* PRD §4: penanda waktu awal sesi dan hitungan kunjungan Welcome. Komponennya
   terpisah dan sekecil ini supaya `/` tetap komponen server statis (FR-01):
   hanya bagian ini yang jadi komponen klien, tanpa kamera, gesture, atau
   kanvas. */
export function SessionStartPing() {
  useEffect(() => {
    markSessionStart()
    track("welcome_loaded")
  }, [])

  return null
}
