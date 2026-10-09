import type { GestureRecognizer } from "@mediapipe/tasks-vision"

import type { GestureSample } from "./holdDetector"
import {
  ACTION_BY_CATEGORY,
  DETECT_FRAME_WIDTH,
  DETECT_INTERVAL_MS,
} from "./thresholds"

/* ARCHITECTURE §6: `gestureSource` memuat model gesture dari berkas yang
   di-host sendiri, membaca bingkai video yang diperkecil dengan laju terbatas,
   lalu memancarkan kategori teratas yang dipantau. Inferensi berjalan di
   perangkat; tidak ada gambar yang dikirim ke jaringan (PRD GS-01). */

export interface GestureSource {
  /** Menjalankan loop deteksi; aman dipanggil saat loop sudah jalan. */
  start(onSample: (sample: GestureSample | null) => void): void
  /** Menghentikan loop tanpa menutup model, supaya bisa dilanjutkan lagi. */
  stop(): void
  /** Menutup model sepenuhnya; sumber tidak bisa dijalankan lagi. */
  close(): void
}

/* ARCHITECTURE §9 mewajibkan MediaPipe dimuat dengan `import()` dinamis di
   langkah yang memakainya, supaya bundel rute lain tidak ikut berat. Itu satu-
   satunya alasan impor statis tidak bisa dipakai di sini. */
async function loadRecognizer(): Promise<GestureRecognizer> {
  const { FilesetResolver, GestureRecognizer: Recognizer } = await import(
    "@mediapipe/tasks-vision"
  )
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm")
  const options = {
    baseOptions: {
      modelAssetPath: "/models/gesture_recognizer.task",
      delegate: "GPU" as const,
    },
    runningMode: "VIDEO" as const,
    /* GS-10: dua tangan sejak awal supaya ambang tidak perlu diubah di P1. */
    numHands: 2,
  }
  try {
    return await Recognizer.createFromOptions(fileset, options)
  } catch {
    /* Tanpa WebGL (misalnya perangkat lama) model dimuat dengan CPU. */
    return await Recognizer.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "CPU" as const },
    })
  }
}

/** Kategori terpantau dengan skor tertinggi di semua tangan (GS-10). */
function topSample(
  gestures: { categoryName: string; score: number }[][]
): GestureSample | null {
  let best: GestureSample | null = null
  for (const hand of gestures) {
    for (const category of hand) {
      if (!(category.categoryName in ACTION_BY_CATEGORY)) {
        continue
      }
      if (best === null || category.score > best.score) {
        best = { category: category.categoryName, score: category.score }
      }
    }
  }
  return best
}

export async function createGestureSource(
  video: HTMLVideoElement
): Promise<GestureSource> {
  const recognizer = await loadRecognizer()
  const canvas = document.createElement("canvas")
  canvas.width = DETECT_FRAME_WIDTH
  const context = canvas.getContext("2d")

  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let lastTs = 0
  let lastVideoTime = -1
  let onSample: ((sample: GestureSample | null) => void) | null = null

  function tick() {
    timer = null
    if (!running || context === null) {
      return
    }
    const startedAt = performance.now()

    /* Bingkai berulang dilewati; inferensi hanya saat ada bingkai baru. */
    if (
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.currentTime !== lastVideoTime
    ) {
      lastVideoTime = video.currentTime
      canvas.height = Math.max(
        1,
        Math.round(DETECT_FRAME_WIDTH * (video.videoHeight / video.videoWidth))
      )
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      lastTs = Math.max(lastTs + 1, Math.round(performance.now()))
      try {
        const result = recognizer.recognizeForVideo(canvas, lastTs)
        onSample?.(topSample(result.gestures))
      } catch {
        /* Bingkai buruk tidak boleh mematikan loop; tik berikutnya tetap jalan. */
      }
    }

    /* Laju: satu inferensi tiap `DETECT_INTERVAL_MS`, tetapi jeda tidak pernah
       lebih pendek dari durasi inferensi itu sendiri. Di perangkat lambat
       (inferensi lebih lama dari interval) loop turun ke siklus 50 persen
       supaya timer UI dan hitung mundur tidak kelaparan. */
    const elapsed = performance.now() - startedAt
    timer = setTimeout(tick, Math.max(DETECT_INTERVAL_MS - elapsed, elapsed))
  }

  return {
    start(next) {
      onSample = next
      if (running) {
        return
      }
      running = true
      timer = setTimeout(tick, 0)
    },
    stop() {
      running = false
      onSample = null
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    },
    close() {
      running = false
      onSample = null
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      recognizer.close()
      lastTs = 0
      lastVideoTime = -1
    },
  }
}
