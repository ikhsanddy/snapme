"use client"

import type { LiveKind } from "@/lib/schemas"

/* SH-03: deteksi kemampuan perekam. Urutan kandidat mengutamakan WebM/VP9,
   lalu WebM, lalu MP4 (Safari). `null` berarti tombol versi hidup
   disembunyikan; tidak ada perekaman yang dipaksakan. */

const CANDIDATES: { mimeType: string; kind: LiveKind }[] = [
  { mimeType: "video/webm;codecs=vp9", kind: "webm" },
  { mimeType: "video/webm", kind: "webm" },
  { mimeType: "video/mp4", kind: "mp4" },
]

export function pickLiveKind(): LiveKind | null {
  if (typeof MediaRecorder === "undefined") {
    return null
  }
  return (
    CANDIDATES.find((candidate) =>
      MediaRecorder.isTypeSupported(candidate.mimeType)
    )?.kind ?? null
  )
}
