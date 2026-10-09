"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import type Webcam from "react-webcam"

import { captureClipFrame } from "@/features/camera/captureFrame"

import { CLIP_FRAME_WIDTH, planClipRecording } from "./clipRecorder"
import type { CapturePhase } from "./machine"

/* SH-01: perekam bingkai klip. Hook ini hanya mengamati fase hitung mundur:
   tiap offset dari `planClipRecording` menjadwalkan satu bingkai, dan semua
   promise-nya ditunggu di `takeFrames` saat foto utama disimpan. Tidak ada
   event mesin yang dikirim dari sini, jadi waktu foto utama tidak berubah. */

export function useClipRecorder({
  webcamRef,
  slotRatio,
  phase,
}: {
  webcamRef: RefObject<Webcam | null>
  /** Rasio slot layout terpilih; `null` berarti layout belum dipilih. */
  slotRatio: number | null
  phase: CapturePhase
}): () => Promise<ImageBitmap[]> {
  const pendingRef = useRef<Promise<ImageBitmap | null>[]>([])

  useEffect(() => {
    if (phase !== "countdown" || slotRatio === null) {
      return
    }
    const video = webcamRef.current?.video ?? null
    if (video === null) {
      return
    }
    const { sampleOffsetsMs } = planClipRecording()
    const timers = sampleOffsetsMs.map((offset) =>
      window.setTimeout(() => {
        pendingRef.current.push(
          captureClipFrame(video, slotRatio, CLIP_FRAME_WIDTH)
        )
      }, offset)
    )
    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
    }
  }, [phase, slotRatio, webcamRef])

  /* Bingkai yang masih diproses ditunggu di sini, bukan di timer: fase
     `capturing` tidak punya timer sendiri, jadi menunggunya tidak menunda
     apa pun kecuali penyimpanan foto. */
  return useCallback(async () => {
    const pending = pendingRef.current
    pendingRef.current = []
    const settled = await Promise.allSettled(pending)
    const frames: ImageBitmap[] = []
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value !== null) {
        frames.push(result.value)
      }
    }
    return frames
  }, [])
}
