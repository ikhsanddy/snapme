import { describe, expect, it } from "vitest"

import {
  CLIP_FRAME_COUNT,
  CLIP_SAMPLE_INTERVAL_MS,
  CLIP_WINDOW_MS,
  planClipRecording,
} from "@/features/capture/clipRecorder"
import {
  COUNTDOWN_FROM,
  COUNTDOWN_STEP_MS,
  INITIAL_CAPTURE_STATE,
  reduce,
  type CaptureEvent,
  type CapturePhase,
} from "@/features/capture/machine"

/* SH-01: rencana perekaman klip. Uji ini menjaga dua hal: jumlah dan jarak
   bingkai, dan janji bahwa perekaman tidak pernah menggeser waktu foto utama
   (mesin keadaan berjalan persis sama saat diamati perekam). */

const TIMELINE: CaptureEvent[] = [
  { type: "PERMISSION_REQUEST" },
  { type: "PERMISSION_GRANTED" },
  { type: "SHOOT" },
  { type: "TICK" },
  { type: "TICK" },
  { type: "TICK" },
  { type: "SHOT_SAVED" },
  { type: "FLASH_DONE" },
  { type: "PAUSE_DONE", allFilled: false },
]

/** Menjalankan tabel peristiwa lewat `reduce`, dengan pengamat opsional yang
 *  dipanggil tiap transisi (simulasi perekam yang membaca fase mesin). */
function runTimeline(observe?: (phase: CapturePhase) => void): CapturePhase[] {
  let state = INITIAL_CAPTURE_STATE
  const phases: CapturePhase[] = []
  for (const event of TIMELINE) {
    observe?.(state.phase)
    state = reduce(state, event)
    phases.push(state.phase)
  }
  return phases
}

describe("planClipRecording", () => {
  it("menjadwalkan 10 bingkai pada 1,5 detik terakhir hitung mundur", () => {
    const plan = planClipRecording()
    expect(plan.sampleOffsetsMs).toHaveLength(CLIP_FRAME_COUNT)
    expect(plan.sampleOffsetsMs[0]).toBe(
      COUNTDOWN_FROM * COUNTDOWN_STEP_MS - CLIP_WINDOW_MS
    )
    expect(plan.sampleOffsetsMs.at(-1)).toBe(
      COUNTDOWN_FROM * COUNTDOWN_STEP_MS - CLIP_SAMPLE_INTERVAL_MS
    )
    for (let index = 0; index < plan.sampleOffsetsMs.length; index += 1) {
      expect(plan.sampleOffsetsMs[index]).toBe(
        COUNTDOWN_FROM * COUNTDOWN_STEP_MS - CLIP_WINDOW_MS + index * CLIP_SAMPLE_INTERVAL_MS
      )
    }
  })

  it("tidak pernah menyentuh momen jepret dan mengikuti konstanta", () => {
    const plan = planClipRecording()
    const durationMs = COUNTDOWN_FROM * COUNTDOWN_STEP_MS
    for (const offset of plan.sampleOffsetsMs) {
      expect(offset).toBeGreaterThanOrEqual(durationMs - CLIP_WINDOW_MS)
      expect(offset).toBeLessThan(durationMs)
    }

    /* Hitung mundur lain: jendelanya selalu 1,5 detik terakhir. */
    const lain = planClipRecording(5, 800)
    expect(lain.sampleOffsetsMs[0]).toBe(5 * 800 - CLIP_WINDOW_MS)
    expect(lain.sampleOffsetsMs).toHaveLength(CLIP_FRAME_COUNT)
  })
})

describe("perekaman klip", () => {
  it("tidak mengubah urutan keadaan mesin", () => {
    const polos = runTimeline()
    const diamati = runTimeline(() => {
      /* Perekam hanya membaca fase dan menjadwalkan timer; tidak ada event
         mesin yang dikirim dari jalur ini. */
      planClipRecording()
    })
    expect(diamati).toEqual(polos)
    expect(polos).toEqual([
      "requesting",
      "ready",
      "countdown",
      "countdown",
      "countdown",
      "capturing",
      "pause",
      "pause",
      "ready",
    ])
  })

  it("semua bingkai diambil sebelum TICK ketiga memicu jepretan", () => {
    const { sampleOffsetsMs } = planClipRecording()
    const lastOffset = Math.max(...sampleOffsetsMs)
    /* TICK ketiga jatuh pada detik ke-3; offset terakhir 2850 ms. */
    expect(lastOffset).toBeLessThan(3 * COUNTDOWN_STEP_MS)
  })
})
