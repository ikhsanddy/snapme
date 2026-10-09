/* SH-01: rencana perekaman klip Strip Hidup. Fungsi murni, tanpa DOM: 10
   bingkai selebar 480 px pada 1,5 detik terakhir hitung mundur, diambil dari
   mesin keadaan yang sama (ARCHITECTURE §5). Sampling berhenti di 2850 ms,
   jadi momen jepret di 3000 ms tidak pernah tersentuh perekaman. */

import { COUNTDOWN_FROM, COUNTDOWN_STEP_MS } from "./machine"

export const CLIP_FRAME_COUNT = 10
export const CLIP_FRAME_WIDTH = 480
export const CLIP_WINDOW_MS = 1500
export const CLIP_SAMPLE_INTERVAL_MS = CLIP_WINDOW_MS / CLIP_FRAME_COUNT

export interface ClipPlan {
  /** Jeda tiap bingkai dari awal fase hitung mundur, dalam milidetik. */
  sampleOffsetsMs: number[]
}

export function planClipRecording(
  countdownFrom: number = COUNTDOWN_FROM,
  stepMs: number = COUNTDOWN_STEP_MS
): ClipPlan {
  const durationMs = countdownFrom * stepMs
  const start = durationMs - CLIP_WINDOW_MS
  return {
    sampleOffsetsMs: Array.from(
      { length: CLIP_FRAME_COUNT },
      (_, index) => start + index * CLIP_SAMPLE_INTERVAL_MS
    ),
  }
}
