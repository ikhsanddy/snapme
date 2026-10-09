import {
  ACTION_BY_CATEGORY,
  CAPTURE_COOLDOWN_MS,
  GESTURE_SCORE_THRESHOLD,
  HOLD_DURATION_MS,
  type GestureAction,
} from "./thresholds"

/* ARCHITECTURE §6: `holdDetector` adalah fungsi murni. Waktu disuntik pemanggil
   lewat `push(sample, time)`, jadi seluruh alur bisa diuji tanpa kamera dan
   tanpa timer (PRD GS-02, GS-04). */

/** Satu keluaran `gestureSource`: kategori teratas dengan skornya, atau null. */
export interface GestureSample {
  category: string
  score: number
}

export type HoldEvent =
  | { type: "hold-start"; action: GestureAction }
  | { type: "hold-progress"; action: GestureAction; progress: number }
  | { type: "hold-complete"; action: GestureAction }
  | { type: "hold-cancel" }

export interface HoldDetector {
  push(sample: GestureSample | null, time: number): HoldEvent[]
  /** GS-04: jeda setelah satu foto sebelum gesture dibaca lagi. */
  notifyCapture(time: number): void
  reset(): void
}

export function createHoldDetector(): HoldDetector {
  let active: { action: GestureAction; startedAt: number } | null = null
  /* Aksi yang sudah selesai ditahan. Satu pose tidak menghasilkan dua pemicu:
     aksi yang sama diabaikan sampai tangan diturunkan (sampel non-aksi itu). */
  let satisfied: GestureAction | null = null
  let cooldownUntil = Number.NEGATIVE_INFINITY

  return {
    push(sample, time) {
      if (time < cooldownUntil) {
        active = null
        return []
      }

      const action =
        sample !== null && sample.score >= GESTURE_SCORE_THRESHOLD
          ? (ACTION_BY_CATEGORY[sample.category] ?? null)
          : null

      if (action === null) {
        satisfied = null
        if (active === null) {
          return []
        }
        active = null
        return [{ type: "hold-cancel" }]
      }

      if (satisfied === action) {
        return []
      }
      satisfied = null

      if (active !== null && active.action !== action) {
        active = null
        return [{ type: "hold-cancel" }]
      }

      if (active === null) {
        active = { action, startedAt: time }
        return [{ type: "hold-start", action }]
      }

      const progress = (time - active.startedAt) / HOLD_DURATION_MS
      if (progress >= 1) {
        active = null
        satisfied = action
        return [{ type: "hold-complete", action }]
      }
      return [{ type: "hold-progress", action, progress }]
    },

    notifyCapture(time) {
      active = null
      satisfied = null
      cooldownUntil = time + CAPTURE_COOLDOWN_MS
    },

    reset() {
      /* Cooldown GS-04 sengaja tidak dihapus: reset dipakai saat loop berhenti
         dan tidak boleh membatalkan jeda setelah foto. */
      active = null
      satisfied = null
    },
  }
}
