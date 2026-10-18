/* ARCHITECTURE §6: ambang Gesture Snap di satu berkas konstanta. Nilai awal
   PRD §7.2; penyetelan dari uji pakai mengubah berkas ini saja. */

export const GESTURE_SCORE_THRESHOLD = 0.6
export const HOLD_DURATION_MS = 800 // GS-02
export const CAPTURE_COOLDOWN_MS = 1500 // GS-04
export const DETECT_INTERVAL_MS = 80 // sekitar 12,5 inferensi per detik (lantai PRD: 10)
export const DETECT_FRAME_WIDTH = 320 // bingkai diperkecil (ARCHITECTURE §9)

const GESTURE_ACTIONS = {
  snap: "Victory",
  retake: "Open_Palm", // GS-08, P1
  proceed: "Thumb_Up", // GS-09, P1
} as const

export type GestureAction = keyof typeof GESTURE_ACTIONS

/** Kebalikan `GESTURE_ACTIONS`: kategori MediaPipe ke aksi produk. */
export const ACTION_BY_CATEGORY: Record<string, GestureAction> = Object.fromEntries(
  Object.entries(GESTURE_ACTIONS).map(([action, category]) => [
    category,
    action as GestureAction,
  ])
)
