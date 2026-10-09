"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import type Webcam from "react-webcam"

import { useBoothStore } from "@/stores/booth"

/* ARCHITECTURE §6: satu-satunya tempat react-webcam dipakai.
   Izin hanya diminta setelah pengguna menekan tombol di layar penjelas (FR-04):
   `<Webcam>` baru dipasang saat `requested` bernilai true. */

export type CameraErrorReason = "denied" | "unavailable"

export const REQUESTED_SIZE = { width: { ideal: 1280 }, height: { ideal: 720 } } as const

const PERMISSION_ERRORS = ["NotAllowedError", "SecurityError"]

async function listCameras(): Promise<MediaDeviceInfo[]> {
  const devices = (await navigator.mediaDevices?.enumerateDevices?.()) ?? []
  return devices.filter((device) => device.kind === "videoinput")
}

interface UseCameraOptions {
  onGranted: () => void
  onDenied: (reason: CameraErrorReason) => void
}

export function useCamera({ onGranted, onDenied }: UseCameraOptions) {
  const webcamRef = useRef<Webcam>(null)
  const [requested, setRequested] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const deviceId = useBoothStore((state) => state.settings.cameraDeviceId)
  const selectDevice = useBoothStore((state) => state.setCameraDevice)

  const requestPermission = useCallback(() => {
    if (navigator.mediaDevices?.getUserMedia === undefined) {
      onDenied("unavailable")
      return
    }
    setRequested(true)
  }, [onDenied])

  const videoConstraints = useMemo<MediaTrackConstraints>(
    () =>
      deviceId === null
        ? { facingMode: "user", ...REQUESTED_SIZE }
        : { deviceId: { exact: deviceId }, ...REQUESTED_SIZE },
    [deviceId]
  )

  const handleGranted = useCallback(async () => {
    /* Label perangkat baru terbaca setelah izin, jadi enumerasi dijalankan di sini. */
    setDevices(await listCameras())
    onGranted()
  }, [onGranted])

  const handleError = useCallback(
    (error: string | DOMException) => {
      const name = typeof error === "string" ? error : error.name
      onDenied(PERMISSION_ERRORS.includes(name) ? "denied" : "unavailable")
    },
    [onDenied]
  )

  return {
    requested,
    requestPermission,
    webcamRef,
    devices,
    selectDevice,
    webcamProps: {
      mirrored: true,
      audio: false,
      disablePictureInPicture: true,
      screenshotFormat: "image/jpeg" as const,
      videoConstraints,
      onUserMedia: handleGranted,
      onUserMediaError: handleError,
    },
  }
}
