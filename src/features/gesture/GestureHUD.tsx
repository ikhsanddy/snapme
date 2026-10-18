"use client"

import { Check, HandPeace } from "@phosphor-icons/react"

import type { CapturePhase } from "@/features/capture/machine"
import type { GestureAction } from "@/features/gesture/thresholds"
import type { GestureStatus } from "@/features/gesture/useGestureSnap"

/* DESIGN-SYSTEM §9: `GestureHUD` adalah pil di atas tengah area kamera dengan
   empat keadaan acuan (siap, menahan, mati, selesai) plus keadaan memuat dari
   GS-07. Semuanya noninteraktif `role="status"`: klik pada acuan hanya demo dan
   tidak punya makna produk. Markup mengikuti docs/ui-reference/capture.html. */

type HudState =
  | "hidden"
  | "loading"
  | "ready"
  | "holding"
  | "off"
  | "done"

interface ResolveHudInput {
  cameraActive: boolean
  enabled: boolean
  status: GestureStatus
  phase: CapturePhase
  holdAction: GestureAction | null
}

export function resolveHudState({
  cameraActive,
  enabled,
  status,
  phase,
  holdAction,
}: ResolveHudInput): HudState {
  if (!cameraActive || status === "failed") {
    return "hidden"
  }
  if (holdAction !== null) {
    return "holding"
  }
  if (!enabled) {
    return phase === "complete" ? "done" : phase === "ready" ? "off" : "hidden"
  }
  if (status === "loading") {
    return phase === "ready" ? "loading" : "hidden"
  }
  if (status === "ready") {
    return phase === "complete" ? "done" : phase === "ready" ? "ready" : "hidden"
  }
  return "hidden"
}

const PILL =
  "inline-flex min-h-11 items-center rounded-pill border-2 border-ink px-4 text-[15px] font-bold text-ink"

export function GestureHUD({
  state,
  progress = 0,
  shotCount = 0,
}: {
  state: HudState
  progress?: number
  shotCount?: number
}) {
  if (state === "hidden") {
    return null
  }

  if (state === "holding") {
    return (
      <div
        role="status"
        className="flex min-w-60 flex-col gap-1.5 rounded-stage border-2 border-ink bg-lime px-4 py-2.5 text-[15px] font-bold text-ink"
      >
        Terdeteksi. Tahan...
        <div className="h-2 overflow-hidden rounded-pill border-2 border-ink bg-paper">
          <div
            className="h-full bg-violet transition-[width] duration-[80ms] ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    )
  }

  if (state === "loading") {
    return (
      <div role="status" className={`${PILL} bg-paper`}>
        Menyiapkan gesture...
      </div>
    )
  }

  if (state === "off") {
    return (
      <div role="status" className={`${PILL} bg-paper`}>
        Gesture mati. Pakai tombol kamera.
      </div>
    )
  }

  if (state === "done") {
    return (
      <div role="status" className={`${PILL} gap-2 bg-lime`}>
        <Check weight="bold" className="size-[18px]" aria-hidden />
        {shotCount} foto siap dihias
      </div>
    )
  }

  return (
    <div role="status" className={`${PILL} gap-2.5 bg-paper`}>
      <HandPeace weight="bold" className="size-[22px]" aria-hidden />
      Angkat dua jari, tahan sebentar
    </div>
  )
}
