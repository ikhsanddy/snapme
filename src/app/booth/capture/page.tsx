"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowClockwise,
  ArrowRight,
  HandPalm,
  HandPeace,
  Lock,
  ThumbsUp,
} from "@phosphor-icons/react"
import { useReducedMotion } from "motion/react"
import Webcam from "react-webcam"
import { toast } from "sonner"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { CameraPicker } from "@/components/booth/CameraPicker"
import { CameraStage, type FlashKind } from "@/components/booth/CameraStage"
import { GestureHUD, resolveHudState } from "@/components/booth/GestureHUD"
import { GestureToggle } from "@/components/booth/GestureToggle"
import { RelayInviteCard } from "@/components/booth/RelayInviteCard"
import { ShotTray } from "@/components/booth/ShotTray"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { captureFrame } from "@/features/camera/captureFrame"
import { useCamera, type CameraErrorReason } from "@/features/camera/useCamera"
import { isBusy, type CaptureEvent } from "@/features/capture/machine"
import { useCaptureMachine } from "@/features/capture/useCaptureMachine"
import { useClipRecorder } from "@/features/capture/useClipRecorder"
import { useGestureSnap } from "@/features/gesture/useGestureSnap"
import {
  cancelRelay,
  createRelay,
  dataUrlToBlob,
  uploadRelaySlot,
} from "@/features/relay/api"
import { clearRelayToken, saveRelayToken } from "@/features/relay/relayToken"
import { shareLink } from "@/features/relay/shareLink"
import { firstPhotoBucketEvent, track } from "@/lib/analytics"
import { LAYOUTS } from "@/lib/layouts"
import { ghostSlotFor, hostSlotIndices } from "@/lib/relaySlots"
import { cn } from "@/lib/utils"
import {
  allFilled,
  countFilled,
  hydrateGesturePreference,
  useBoothStore,
  useRequireLayout,
  type Shot,
} from "@/stores/booth"

/* FR-04 sampai FR-07: layar penjelas izin, penanganan izin ditolak, pratinjau
   dicerminkan dengan rasio slot, hitung mundur 3 detik, kilat tunggal, dan baki
   foto dengan ulang foto terakhir serta ulang foto tertentu.
   M3 (GS-02 sampai GS-07): Gesture Snap dengan sakelar, HUD, dan jalur gagal
   muat. Susunan mengikuti DESIGN-SYSTEM §10.2 dan docs/ui-reference/capture.html. */

export default function CaptureStepPage() {
  const router = useRouter()
  const ready = useRequireLayout()
  const layoutId = useBoothStore((state) => state.layoutId)
  const shots = useBoothStore((state) => state.shots)
  const setShot = useBoothStore((state) => state.setShot)
  const relay = useBoothStore((state) => state.relay)
  const setRelay = useBoothStore((state) => state.setRelay)
  const setGhostEnabled = useBoothStore((state) => state.setGhostEnabled)

  const [state, dispatch] = useCaptureMachine()
  const [inviteBusy, setInviteBusy] = useState(false)
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

  /* PRD §4: foto mana yang lahir dari Gesture Snap. Mesin keadaan tidak
     menyimpan asalnya (ARCHITECTURE §5), jadi jejaknya dijaga di sini: HOLD_COMPLETE
     berarti gesture dua jari, SHOOT berarti tombol, Spasi, atau baki foto.
     Telapak (ulang foto) juga memakai SHOOT, jadi hitungannya tetap mengikuti
     "hitung mundur yang dimulai gestur dua jari". */
  const shotSource = useRef<"button" | "gesture">("button")
  const dispatchTracked = useCallback(
    (event: CaptureEvent) => {
      if (event.type === "HOLD_COMPLETE") {
        shotSource.current = "gesture"
      } else if (event.type === "SHOOT") {
        shotSource.current = "button"
      }
      dispatch(event)
    },
    [dispatch]
  )

  const camera = useCamera({ onGranted: handleGranted, onDenied: handleDenied })
  const { requested, requestPermission, webcamRef, webcamProps, devices, selectDevice } =
    camera
  const cameraDeviceId = useBoothStore((state) => state.settings.cameraDeviceId)
  const gestureEnabled = useBoothStore((state) => state.settings.gestureEnabled)
  const setGestureEnabled = useBoothStore((state) => state.setGestureEnabled)
  const { phase, targetSlot, countdownValue, flash: flashOn } = state

  /* SH-01: bingkai klip direkam selama 1,5 detik terakhir hitung mundur, untuk
     semua jalur masuk `countdown` (tombol, Spasi, gesture, ulang slot). */
  const slotRatio =
    layoutId === null
      ? null
      : LAYOUTS[layoutId].slot.width / LAYOUTS[layoutId].slot.height
  const takeClipFrames = useClipRecorder({ webcamRef, slotRatio, phase })
  /* Satu pengambilan per fase `capturing`: efek bisa berjalan ulang saat
     promise bingkai masih ditunggu. */
  const capturingRef = useRef(false)

  /* GS-06: pilihan sakelar dibaca dari localStorage setelah hidrasi. */
  useEffect(() => {
    hydrateGesturePreference()
  }, [])

  /* M8 (SE-04): slot milik pihak lain tidak bisa diubah dari perangkat ini.
     Tamu mengisi slot ganjil; pembuat tidak punya slot terkunci. */
  const lockedSlots = useMemo(
    () => (relay?.role === "guest" ? relay.lockedSlots : []),
    [relay]
  )
  const isLocked = useCallback(
    (index: number) => lockedSlots.includes(index),
    [lockedSlots]
  )

  /* GS-08: telapak mengulang foto terakhir MILIK SENDIRI; null berarti belum
     ada foto. Ulang foto teman tidak pernah ditawarkan (SE-04). */
  const lastFilledIndex = shots.findLastIndex(
    (shot, index) => shot !== null && !isLocked(index)
  )
  const gesture = useGestureSnap({
    webcamRef,
    enabled: gestureEnabled,
    phase,
    dispatch: dispatchTracked,
    retakeTarget: lastFilledIndex < 0 ? null : lastFilledIndex,
    onProceed: () => router.push("/booth/customize"),
  })

  /* Efek pengambilan: satu kali tiap fase `capturing`, setelah hitung mundur habis.
     Foto utama diambil sinkron lebih dulu, lalu bingkai klip SH-01 yang masih
     diproses ditunggu. Fase `capturing` tidak punya timer, jadi menunggu di
     sini tidak menggeser waktu foto mana pun. */
  useEffect(() => {
    if (phase !== "capturing") {
      capturingRef.current = false
      return
    }
    if (capturingRef.current || layoutId === null || !requested) {
      return
    }
    capturingRef.current = true

    void (async () => {
      const layout = LAYOUTS[layoutId]
      const slotIndex = targetSlot ?? shots.findIndex((shot) => shot === null)
      const video = webcamRef.current?.video ?? null
      const still =
        video === null
          ? null
          : captureFrame(video, layout.slot.width / layout.slot.height)
      const clip = await takeClipFrames()

      /* Slot terkunci tidak pernah ditulis dari perangkat ini, walau ada
         peristiwa yang menyasar ke sana (SE-04). */
      if (still !== null && slotIndex >= 0 && !isLocked(slotIndex)) {
        const firstPhoto = shots.every((shot) => shot === null)
        setShot(slotIndex, {
          still,
          capturedAt: Date.now(),
          ...(clip.length > 0 ? { clip } : {}),
        })
        dispatch({ type: "SHOT_SAVED" })
        /* Analitik dikirim setelah mesin keadaannya maju: apa pun yang terjadi
           di sini, baki foto sudah aman (M9, temuan tinjauan keamanan). */
        track(
          shotSource.current === "gesture"
            ? "photo_taken_gesture"
            : "photo_taken_button"
        )
        /* PRD §4: "cepat dipakai" hanya diukur sampai foto pertama, dan hanya
           bila sesinya bermula di Welcome (ada penanda t0). */
        if (firstPhoto) {
          const bucket = firstPhotoBucketEvent()
          if (bucket !== null) {
            track(bucket)
          }
        }
      } else {
        for (const frame of clip) {
          frame.close()
        }
        dispatch({ type: "SHOT_SAVED" })
      }
    })()
  }, [
    phase,
    targetSlot,
    layoutId,
    requested,
    shots,
    setShot,
    webcamRef,
    takeClipFrames,
    dispatch,
    isLocked,
  ])

  if (!ready || layoutId === null) {
    return null
  }

  const layout = LAYOUTS[layoutId]
  const filled = countFilled(shots)
  const remaining = layout.shotCount - filled
  const done = allFilled(shots)
  const busy = isBusy(phase)
  const showWebcam = requested && phase !== "idle" && phase !== "denied"
  const cameraActive =
    phase !== "idle" && phase !== "denied" && phase !== "requesting"
  /* prefers-reduced-motion: kilat menjadi kedip garis tepi area kamera (§7). */
  const flash: FlashKind = !flashOn
    ? "none"
    : prefersReducedMotion === true
      ? "border"
      : "overlay"

  const isGuest = relay?.role === "guest"
  const hostRequired = hostSlotIndices(layoutId).length
  /* SE-01: minimal setengah slot terisi sebelum tombol estafet menyala;
     pembuat selalu mengisi tepat setengahnya. */
  const canInvite = !isGuest && filled >= hostRequired && !busy

  /* SE-05: bayangan pose pembuat untuk slot yang sedang diisi teman. Slot
     pembuat selalu tepat satu sebelum slot teman di layout mana pun. */
  const ghostIndex =
    isGuest && relay.ghostEnabled
      ? ghostSlotFor(targetSlot ?? shots.findIndex((shot) => shot === null))
      : null
  const ghostStill = ghostIndex === null ? null : (shots[ghostIndex]?.still ?? null)

  function requestPermissionForUser() {
    dispatch({ type: "PERMISSION_REQUEST" })
    requestPermission()
  }

  /** SE-01 sampai SE-03: membuat link estafet lalu mengunggah foto pembuat. */
  async function handleInvite() {
    if (layoutId === null || inviteBusy) {
      return
    }
    setInviteBusy(true)
    try {
      const created = await createRelay(layoutId)
      saveRelayToken(created.id, "host", created.hostToken)
      /* Keputusan desain M8: dua foto terisi pertama dipetakan berurutan ke
         slot pembuat. Sesi lokalnya tidak diubah setelah link dibuat. */
      const sources = shots
        .filter((shot): shot is Shot => shot !== null)
        .slice(0, created.uploads.length)
      try {
        await Promise.all(
          created.uploads.map((upload, position) => {
            const source = sources[position]
            if (source === undefined) {
              throw new Error("Foto belum cukup untuk dikirim.")
            }
            return uploadRelaySlot(upload, dataUrlToBlob(source.still))
          })
        )
      } catch (uploadError) {
        /* Unggahan gagal: estafet yatim dibatalkan supaya kuota tidak
           terbuang, dan kartunya kembali ke keadaan siap. */
        void cancelRelay(created.id, created.hostToken).catch(() => undefined)
        clearRelayToken(created.id)
        throw uploadError
      }
      setRelay({ id: created.id, role: "host", lockedSlots: [], ghostEnabled: false })
      track("relay_created")
      toast.success("Link estafet dibuat.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Link estafet belum bisa dibuat. Coba lagi sebentar lagi."
      )
    } finally {
      setInviteBusy(false)
    }
  }

  async function handleShare(url: string) {
    const outcome = await shareLink(url, "Strip Estafet snapme")
    if (outcome === "copied") {
      toast.success("Tautan disalin.")
    } else if (outcome === "shared") {
      toast.success("Tautan dibagikan.")
    } else {
      toast.error(
        "Tautan belum bisa dibagikan. Salin manual dari alamat di atas."
      )
    }
  }

  return (
    <BoothPanel
      title="Ambil Foto"
      backHref="/booth/layout"
      chip={<Badge>{layout.label}</Badge>}
      actions={
        <>
          <GestureToggle
            enabled={gestureEnabled}
            onChange={setGestureEnabled}
            hidden={gesture.status === "failed"}
          />
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
            lockedSlots={lockedSlots}
            onRetake={(index) => dispatchTracked({ type: "SHOOT", target: index })}
          />
          <Button
            variant="neutral"
            size="sm"
            disabled={busy || lastFilledIndex < 0}
            onClick={() =>
              dispatchTracked({ type: "SHOOT", target: lastFilledIndex })
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
            onShoot={() => dispatchTracked({ type: "SHOOT" })}
            overlay={
              ghostStill === null ? undefined : (
                /* DataURL hasil kamera, bukan aset: next/image tidak dipakai. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={ghostStill} alt="" className="h-full w-full object-cover" />
              )
            }
            hud={
              <GestureHUD
                state={resolveHudState({
                  cameraActive,
                  enabled: gestureEnabled,
                  status: gesture.status,
                  phase,
                  holdAction: gesture.holdAction,
                })}
                progress={gesture.holdProgress}
                shotCount={layout.shotCount}
              />
            }
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
          {relay !== null && relay.role === "guest" ? (
            /* SE-05: sakelar bayangan, selalu disertai teks keadaan
               (DESIGN-SYSTEM §2). */
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm leading-[1.4]">
                Bayangan pose teman
              </span>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "rounded-pill border-2 border-ink px-2.5 py-0.5 font-mono text-xs font-bold tracking-[0.06em] text-ink uppercase",
                    relay.ghostEnabled ? "bg-lime" : "bg-cream"
                  )}
                >
                  {relay.ghostEnabled ? "Nyala" : "Mati"}
                </span>
                <Switch
                  checked={relay.ghostEnabled}
                  onCheckedChange={setGhostEnabled}
                  aria-label="Bayangan pose teman"
                />
              </div>
            </div>
          ) : null}
          <p className="flex items-center gap-2 text-sm text-muted">
            <Lock weight="bold" className="size-4 shrink-0" aria-hidden />
            {isGuest
              ? "Kamera dan deteksi gesture berjalan di perangkat ini. Fotonya terunggah saat estafetnya diselesaikan."
              : "Kamera dan deteksi gesture berjalan di perangkat ini. Tidak ada yang diunggah."}
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
                <HandPeace weight="bold" className="size-6 shrink-0" aria-hidden />
                Dua jari: mulai hitung mundur
              </li>
              <li className="flex items-center gap-2.5">
                <HandPalm weight="bold" className="size-6 shrink-0" aria-hidden />
                Telapak: ulang foto terakhir
              </li>
              <li className="flex items-center gap-2.5">
                <ThumbsUp weight="bold" className="size-6 shrink-0" aria-hidden />
                Jempol: lanjut ke hias
              </li>
            </ul>
          </div>

          {isGuest ? null : (
            <RelayInviteCard
              relayId={relay?.role === "host" ? relay.id : null}
              canInvite={canInvite}
              filled={filled}
              required={hostRequired}
              busy={inviteBusy}
              onInvite={() => void handleInvite()}
              onShare={(url) => void handleShare(url)}
            />
          )}

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
