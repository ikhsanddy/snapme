"use client"

import { useEffect, useState } from "react"

import { CLIP_SAMPLE_INTERVAL_MS } from "@/features/capture/clipRecorder"

/* SH-02: indeks bingkai berputar untuk pratinjau Strip Hidup. Saat berhenti
   nilainya 0 dan pemanggil memakai -1 untuk memaksa tampilan foto tetap, jadi
   tidak ada state yang perlu direset di dalam efek. */
export function useClipTicker(playing: boolean, frameCount: number): number {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!playing) {
      return
    }
    const timer = window.setInterval(() => {
      setIndex((current) =>
        frameCount <= 0 ? 0 : (current + 1) % frameCount
      )
    }, CLIP_SAMPLE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [playing, frameCount])

  return playing ? index : 0
}
