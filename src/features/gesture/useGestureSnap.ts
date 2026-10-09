"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import type Webcam from "react-webcam"
import { toast } from "sonner"

import type { CaptureEvent, CapturePhase } from "@/features/capture/machine"

import { createHoldDetector, type GestureSample, type HoldDetector } from "./holdDetector"
import { createGestureSource, type GestureSource } from "./gestureSource"
import type { GestureAction } from "./thresholds"

/* ARCHITECTURE §6: perekat antara `gestureSource` (MediaPipe), `holdDetector`
   (murni), dan mesin keadaan pemotretan. Model hanya dimuat setelah izin
   kamera (GS-07), hanya saat sakelar menyala (GS-06), dan loop deteksi berhenti
   selama hitung mundur dan pengambilan supaya CPU kembali ke pratinjau. */

export type GestureStatus = "idle" | "loading" | "ready" | "failed"

interface UseGestureSnapOptions {
  webcamRef: RefObject<Webcam | null>
  enabled: boolean
  phase: CapturePhase
  dispatch: (event: CaptureEvent) => void
  /** P1 GS-08: indeks foto terakhir yang terisi, null bila belum ada foto. */
  retakeTarget: number | null
  /** P1 GS-09: lanjut ke hias lewat gesture jempol. */
  onProceed: () => void
}

interface LatestValues {
  phase: CapturePhase
  retakeTarget: number | null
  dispatch: (event: CaptureEvent) => void
  onProceed: () => void
}

export function useGestureSnap({
  webcamRef,
  enabled,
  phase,
  dispatch,
  retakeTarget,
  onProceed,
}: UseGestureSnapOptions) {
  const [status, setStatus] = useState<GestureStatus>("idle")
  const [loadRevision, setLoadRevision] = useState(0)
  const [hold, setHold] = useState<{
    action: GestureAction
    progress: number
  } | null>(null)

  const sourceRef = useRef<GestureSource | null>(null)
  const detectorRef = useRef<HoldDetector | null>(null)
  const loadingRef = useRef(false)
  const handlerRef = useRef<(sample: GestureSample | null) => void>(() => {})
  const latestRef = useRef<LatestValues>({
    phase,
    retakeTarget,
    dispatch,
    onProceed,
  })

  function detector(): HoldDetector {
    if (detectorRef.current === null) {
      detectorRef.current = createHoldDetector()
    }
    return detectorRef.current
  }

  useEffect(() => {
    latestRef.current = { phase, retakeTarget, dispatch, onProceed }
  })

  /* Satu sampel menjadi peristiwa mesin keadaan. Semua aksi memakai ambang
     tahan yang sama; hanya `snap` yang memakai fase `holding` (GS-02). */
  useEffect(() => {
    handlerRef.current = (sample) => {
      const latest = latestRef.current
      const events = detector().push(sample, performance.now())
      for (const event of events) {
        if (event.type === "hold-start") {
          if (event.action === "snap" && latest.phase === "ready") {
            latest.dispatch({ type: "HOLD_START" })
          }
          continue
        }
        if (event.type === "hold-progress") {
          setHold({ action: event.action, progress: event.progress })
          continue
        }
        if (event.type === "hold-cancel") {
          if (latest.phase === "holding") {
            latest.dispatch({ type: "HOLD_CANCEL" })
          }
          setHold(null)
          continue
        }
        if (event.action === "snap" && latest.phase === "holding") {
          latest.dispatch({ type: "HOLD_COMPLETE" })
        }
        if (
          event.action === "retake" &&
          latest.retakeTarget !== null &&
          (latest.phase === "ready" || latest.phase === "complete")
        ) {
          latest.dispatch({ type: "SHOOT", target: latest.retakeTarget })
        }
        if (event.action === "proceed" && latest.phase === "complete") {
          latest.onProceed()
        }
        setHold(null)
      }
    }
  })

  const cameraActive =
    phase !== "idle" && phase !== "denied" && phase !== "requesting"

  /* GS-07: muat model setelah izin kamera, tanpa menghalangi pemotretan.
     GS-06: saat sakelar mati, model ditutup dan tidak dijalankan. */
  useEffect(() => {
    if (!enabled) {
      sourceRef.current?.close()
      sourceRef.current = null
      detector().reset()
      return
    }
    if (!cameraActive || sourceRef.current !== null || loadingRef.current) {
      return
    }

    const video = webcamRef.current?.video ?? null
    if (video === null) {
      return
    }

    let cancelled = false
    loadingRef.current = true
    setStatus("loading")

    createGestureSource(video)
      .then((source) => {
        loadingRef.current = false
        if (cancelled) {
          source.close()
          return
        }
        sourceRef.current = source
        setStatus("ready")
        /* Sumber baru menandai loop boleh dijalankan lagi setelah sakelar mati. */
        setLoadRevision((value) => value + 1)
      })
      .catch(() => {
        loadingRef.current = false
        if (cancelled) {
          return
        }
        setStatus("failed")
        toast("Gesture Snap gagal dimuat. Tombol kamera tetap bisa dipakai.")
      })

    return () => {
      cancelled = true
    }
  }, [enabled, cameraActive, webcamRef])

  useEffect(
    () => () => {
      sourceRef.current?.close()
      sourceRef.current = null
    },
    []
  )

  /* Loop deteksi hanya saat pratinjau siap: berhenti selama hitung mundur,
     pengambilan, dan jeda. P1: telapak aktif saat ada foto yang bisa diulang. */
  const loopActive =
    status === "ready" &&
    enabled &&
    (phase === "ready" ||
      phase === "holding" ||
      (phase === "complete" && retakeTarget !== null))

  useEffect(() => {
    if (!loopActive) {
      sourceRef.current?.stop()
      detector().reset()
      return
    }
    sourceRef.current?.start((sample) => handlerRef.current(sample))
  }, [loopActive, loadRevision])

  /* GS-04: satu pose tidak menghasilkan dua foto. */
  const previousPhase = useRef(phase)
  useEffect(() => {
    const previous = previousPhase.current
    previousPhase.current = phase
    if (previous !== "capturing" && phase === "capturing") {
      detector().notifyCapture(performance.now())
    }
  }, [phase])

  /* Indikator tahan hanya terlihat saat loop berjalan; sakelar mati selalu
     melaporkan `idle` supaya menyalakannya lagi memuat model sekali lagi. */
  const holdVisible = loopActive ? hold : null
  return {
    status: enabled ? status : "idle",
    holdAction: holdVisible?.action ?? null,
    holdProgress: holdVisible?.progress ?? 0,
  }
}
