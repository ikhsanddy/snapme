"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowClockwise,
  ArrowRight,
  Camera,
  Lock,
  Timer,
} from "@phosphor-icons/react"
import { useReducedMotion } from "motion/react"
import Webcam from "react-webcam"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { CameraPicker } from "@/components/booth/CameraPicker"
import { CameraStage, type FlashKind } from "@/components/booth/CameraStage"
import { ShotTray } from "@/components/booth/ShotTray"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { captureFrame } from "@/features/camera/captureFrame"
import { useCamera, type CameraErrorReason } from "@/features/camera/useCamera"
import { isBusy } from "@/features/capture/machine"
import { useCaptureMachine } from "@/features/capture/useCaptureMachine"
import { LAYOUTS } from "@/lib/layouts"
import {
  allFilled,
  countFilled,
  useBoothStore,
  useRequireLayout,
} from "@/stores/booth"

/* FR-04 sampai FR-07: layar penjelas izin, penanganan izin ditolak, pratinjau
   dicerminkan dengan rasio slot, hitung mundur 3 detik, kilat tunggal, dan baki
   foto dengan ulang foto terakhir serta ulang foto tertentu.
   Susunan mengikuti DESIGN-SYSTEM §10.2 dan docs/ui-reference/capture.html.
   Sakelar Gesture Snap dan keadaannya menyusul di M3. */

export default function CaptureStepPage() {
  const router = useRouter()
  const ready = useRequireLayout()
  const layoutId = useBoothStore((state) => state.layoutId)
  const shots = useBoothStore((state) => state.shots)
  const setShot = useBoothStore((state) => state.setShot)

  const [state, dispatch] = useCaptureMachine()
  const prefersReducedMotion = useReducedMotion()

  const handleGranted = useCallback(() => {
    dispatch({ type: "PERMISSION_GRANTED" })
  }, [dispatch])
  const handleDenied = useCallback(
    (reason: CameraErrorReason) => {
      dispatch({ type: "PERMISSION_DENIED", reason })
    },
    [dispatch]
  )

  const camera = useCamera({ onGranted: handleGranted, onDenied: handleDenied })
  const { requested, requestPermission, webcamRef, webcamProps, devices, selectDevice } =
    camera
  const cameraDeviceId = useBoothStore((state) => state.settings.cameraDeviceId)
  const { phase, targetSlot, countdownValue, flash: flashOn } = state

  /* Efek pengambilan: satu kali tiap fase `capturing`, setelah hitung mundur habis. */
  useEffect(() => {
    if (phase !== "capturing" || layoutId === null || !requested) {
      return
    }
    const layout = LAYOUTS[layoutId]
    const slotIndex = targetSlot ?? shots.findIndex((shot) => shot === null)
    const video = webcamRef.current?.video ?? null
    const still =
      video === null
        ? null
        : captureFrame(video, layout.slot.width / layout.slot.height)

    if (still !== null && slotIndex >= 0) {
      setShot(slotIndex, { still, capturedAt: Date.now() })
    }
    dispatch({ type: "SHOT_SAVED" })
  }, [
    phase,
    targetSlot,
    layoutId,
    requested,
    shots,
    setShot,
    webcamRef,
    dispatch,
  ])

  if (!ready || layoutId === null) {
    return null
  }

  const layout = LAYOUTS[layoutId]
  const filled = countFilled(shots)
  const remaining = layout.shotCount - filled
  const done = allFilled(shots)
  const busy = isBusy(phase)
  const lastFilledIndex = shots.findLastIndex((shot) => shot !== null)
  const showWebcam = requested && phase !== "idle" && phase !== "denied"
  /* prefers-reduced-motion: kilat menjadi kedip garis tepi area kamera (§7). */
  const flash: FlashKind = !flashOn
    ? "none"
    : prefersReducedMotion === true
      ? "border"
      : "overlay"

  function requestPermissionForUser() {
    dispatch({ type: "PERMISSION_REQUEST" })
    requestPermission()
  }

  return (
    <BoothPanel
      title="Ambil Foto"
      backHref="/booth/layout"
      chip={<Badge>{layout.label}</Badge>}
      actions={
        <>
          {devices.length > 1 ? (
            <CameraPicker
              devices={devices}
              selectedId={cameraDeviceId}
              onSelect={selectDevice}
            />
          ) : null}
          <Badge
            variant="pink"
            className="px-4 py-1.5 font-mono text-lg font-bold"
            aria-live="polite"
          >
            {filled}/{layout.shotCount}
          </Badge>
        </>
      }
      left={
        <>
          <h2 className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
            Fotomu
          </h2>
          <ShotTray
            shots={shots}
            slotRatio={layout.slot.width / layout.slot.height}
            busy={busy}
            onRetake={(index) => dispatch({ type: "SHOOT", target: index })}
          />
          <Button
            variant="neutral"
            size="sm"
            disabled={busy || lastFilledIndex < 0}
            onClick={() =>
              dispatch({ type: "SHOOT", target: lastFilledIndex })
            }
          >
            <ArrowClockwise weight="bold" className="size-[18px]" aria-hidden />
            Ulang foto terakhir
          </Button>
        </>
      }
      center={
        <>
          <CameraStage
            ratio={layout.slot.width / layout.slot.height}
            phase={phase}
            deniedReason={state.deniedReason}
            countdownValue={countdownValue}
            flash={flash}
            onRequestPermission={requestPermissionForUser}
            onShoot={() => dispatch({ type: "SHOOT" })}
          >
            {showWebcam ? (
              <Webcam
                {...webcamProps}
                ref={webcamRef}
                className="h-full w-full object-cover"
                aria-hidden
              />
            ) : null}
          </CameraStage>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Lock weight="bold" className="size-4 shrink-0" aria-hidden />
            Kamera berjalan di perangkat ini. Tidak ada yang diunggah.
          </p>
        </>
      }
      right={
        <>
          <div className="flex flex-col gap-3 rounded-card border-2 border-ink bg-lime p-4">
            <h2 className="font-display text-base leading-[1.2] font-extrabold">
              Senyum, kamera siap!
            </h2>
            <ul className="flex flex-col gap-2.5 text-[15px] leading-[1.35]">
              <li className="flex items-center gap-2.5">
                <Camera weight="bold" className="size-6 shrink-0" aria-hidden />
                Tombol kamera atau Spasi memotret
              </li>
              <li className="flex items-center gap-2.5">
                <Timer weight="bold" className="size-6 shrink-0" aria-hidden />
                Hitung mundur 3 detik sebelum jepret
              </li>
              <li className="flex items-center gap-2.5">
                <ArrowClockwise
                  weight="bold"
                  className="size-6 shrink-0"
                  aria-hidden
                />
                Bisa ulang foto apa pun dari baki
              </li>
            </ul>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button
              size="lg"
              disabled={!done}
              className="w-full"
              onClick={() => router.push("/booth/customize")}
            >
              Lanjut Hias
              <ArrowRight weight="bold" className="size-[22px]" aria-hidden />
            </Button>
            <p aria-live="polite" className="text-center text-sm text-muted">
              {done ? "Semua foto sudah ada." : `Butuh ${remaining} foto lagi.`}
            </p>
          </div>
        </>
      }
    />
  )
}
