"use client"

import type { CSSProperties, KeyboardEvent, ReactNode } from "react"
import { Camera, Keyboard, Warning } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { CountdownOverlay } from "@/features/capture/CountdownOverlay"
import { ShutterButton } from "@/features/capture/ShutterButton"
import {
  canShoot,
  type CapturePhase,
  type CountdownValue,
  type DeniedReason,
} from "@/features/capture/machine"
import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §9: area kamera `ink`, garis 3 px, radius 16 px, braket bidik
   di empat sudut, HUD di atas tengah, tombol jepret dan chip pintasan di bawah.
   Berkas acuan `docs/ui-reference/capture.html` memakai rasio 1 : 1 di bawah 768 px. */

export type FlashKind = "none" | "overlay" | "border"

const BRACKETS = [
  "top-4 left-4 border-t-4 border-l-4",
  "top-4 right-4 border-t-4 border-r-4",
  "bottom-4 left-4 border-b-4 border-l-4",
  "bottom-4 right-4 border-b-4 border-r-4",
]

const DENIED_MESSAGES: Record<DeniedReason, string> = {
  denied:
    "Kamera belum diizinkan. Buka pengaturan situs di browser, izinkan kamera, lalu muat ulang.",
  unavailable:
    "Kamera tidak ditemukan atau sedang dipakai aplikasi lain. Tutup aplikasi lain, lalu coba lagi.",
}

interface CameraStageProps {
  ratio: number
  phase: CapturePhase
  deniedReason: DeniedReason | null
  countdownValue: CountdownValue | null
  flash: FlashKind
  onRequestPermission: () => void
  onShoot: () => void
  children?: ReactNode
  hud?: ReactNode
  /** M8 (SE-05): lapisan di atas pratinjau, dipakai untuk bayangan pose foto
   *  pembuat di layar teman. Di bawah HUD, hitung mundur, dan braket bidik. */
  overlay?: ReactNode
}

function PermissionScreen({
  onRequestPermission,
}: {
  onRequestPermission: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <Camera weight="bold" className="size-10 text-paper" aria-hidden />
      <div className="flex flex-col gap-1.5">
        <p className="text-[17px] font-bold text-paper">
          Kamera dipakai motret di perangkat ini.
        </p>
        <p className="max-w-[36ch] text-[15px] leading-[1.4] text-paper">
          Foto diproses di perangkat. Tidak ada yang diunggah.
        </p>
      </div>
      <Button size="lg" onClick={onRequestPermission}>
        Izinkan Kamera
      </Button>
    </div>
  )
}

function DeniedScreen({
  deniedReason,
  onRequestPermission,
}: {
  deniedReason: DeniedReason | null
  onRequestPermission: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 px-6 text-center"
    >
      <Warning weight="bold" className="size-10 text-paper" aria-hidden />
      <p className="max-w-[42ch] text-[15px] leading-[1.4] text-paper">
        {deniedReason === null
          ? DENIED_MESSAGES.unavailable
          : DENIED_MESSAGES[deniedReason]}
      </p>
      <Button variant="neutral" onClick={onRequestPermission}>
        Coba Lagi
      </Button>
    </div>
  )
}

export function CameraStage({
  ratio,
  phase,
  deniedReason,
  countdownValue,
  flash,
  onRequestPermission,
  onShoot,
  children,
  hud,
  overlay,
}: CameraStageProps) {
  /* Tanpa kamera (belum izin atau izin ditolak) kontrol jepret tidak ditampilkan
     supaya tidak menutupi tombol izin. */
  const showControls = phase !== "idle" && phase !== "denied"

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== " " || event.target !== event.currentTarget) {
      return
    }
    event.preventDefault()
    onShoot()
  }

  return (
    <div
      role="group"
      aria-label="Area kamera"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ "--cam-ratio": String(ratio) } as CSSProperties}
      className={cn(
        "relative flex aspect-(--cam-ratio) items-center justify-center overflow-hidden rounded-stage border-3 bg-ink",
        "max-md:aspect-square",
        "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-lime",
        flash === "border" ? "border-lime" : "border-ink"
      )}
    >
      {BRACKETS.map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={cn(
            /* z-10: video dicerminkan lewat transform, jadi ia punya stacking context sendiri. */
            "pointer-events-none absolute z-10 size-9 border-lime",
            corner
          )}
        />
      ))}

      {phase === "idle" ? (
        <PermissionScreen onRequestPermission={onRequestPermission} />
      ) : null}
      {phase === "denied" ? (
        <DeniedScreen
          deniedReason={deniedReason}
          onRequestPermission={onRequestPermission}
        />
      ) : null}
      {phase === "idle" || phase === "denied" ? null : children}

      {/* M8 (SE-05): bayangan pose teman, opasitasnya diatur pemanggil. z-[5]
          menjaga braket bidik (z-10) tetap di atasnya. */}
      {overlay === undefined || phase === "idle" || phase === "denied" ? null : (
        <div
          aria-hidden
          data-testid="stage-overlay"
          className="pointer-events-none absolute inset-0 z-[5] opacity-35"
        >
          {overlay}
        </div>
      )}

      {hud === undefined ? null : (
        <div className="absolute inset-x-0 top-3.5 flex justify-center px-4 md:top-7 md:px-16">
          {hud}
        </div>
      )}

      {countdownValue === null ? null : (
        <CountdownOverlay value={countdownValue} />
      )}

      {flash === "overlay" ? (
        <div data-testid="flash" className="absolute inset-0 bg-paper/90" />
      ) : null}

      {showControls ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex items-center justify-center gap-3.5">
          <span className="pointer-events-auto flex">
            <ShutterButton onShoot={onShoot} disabled={!canShoot(phase)} />
          </span>
          <span className="hidden items-center gap-1.5 rounded-sm border-2 border-ink bg-paper px-2.5 py-1 font-mono text-xs font-bold tracking-[0.06em] text-ink uppercase md:inline-flex">
            <Keyboard weight="bold" className="size-4" aria-hidden />
            Spasi
          </span>
        </div>
      ) : null}
    </div>
  )
}
