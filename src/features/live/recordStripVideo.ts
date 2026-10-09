"use client"

import { CLIP_SAMPLE_INTERVAL_MS } from "@/features/capture/clipRecorder"
import { LIVE_MIME_TYPES, type LiveKind } from "@/lib/schemas"

import { pickLiveKind } from "./mediaSupport"

/* SH-03: unduhan versi hidup. Kanvas strip direkam lewat `captureStream` dan
   `MediaRecorder` (ARCHITECTURE §3: API platform, tanpa pustaka). Durasi
   bawaan 2 putaran x 10 bingkai x 150 ms = 3 detik, sekitar 0,9 MB pada
   2,5 Mbps. */

const VIDEO_BITS_PER_SECOND = 2_500_000
const STREAM_FPS = 30

export interface RecordedLiveVideo {
  blob: Blob
  kind: LiveKind
}

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  window.setTimeout(resolve, ms)
  return promise
}

export async function recordStripVideo(
  canvas: HTMLCanvasElement,
  tick: (frameIndex: number) => void,
  frameCount: number,
  loops = 2
): Promise<RecordedLiveVideo> {
  const kind = pickLiveKind()
  if (kind === null) {
    throw new Error("Browser ini tidak bisa merekam video.")
  }

  const stream = canvas.captureStream(STREAM_FPS)
  const recorder = new MediaRecorder(stream, {
    mimeType: LIVE_MIME_TYPES[kind],
    videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
  })
  const chunks: Blob[] = []
  const stopped = Promise.withResolvers<Blob>()
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }
  recorder.onstop = () => stopped.resolve(new Blob(chunks, { type: LIVE_MIME_TYPES[kind] }))
  recorder.onerror = () => stopped.reject(new Error("Perekaman video gagal."))

  recorder.start()
  try {
    for (let step = 0; step < Math.max(1, loops * frameCount); step += 1) {
      tick(step % frameCount)
      await sleep(CLIP_SAMPLE_INTERVAL_MS)
    }
  } finally {
    recorder.stop()
  }

  const blob = await stopped.promise
  for (const track of stream.getTracks()) {
    track.stop()
  }
  return { blob, kind }
}
