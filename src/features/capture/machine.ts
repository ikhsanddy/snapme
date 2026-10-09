/* ARCHITECTURE §5: mesin keadaan pemotretan sebagai fungsi murni (`reduce`).
   Tanpa kamera dan tanpa timer: uji unit menjalankan seluruh tabel transisi. */

export const COUNTDOWN_FROM = 3
export const COUNTDOWN_STEP_MS = 1000
export const PAUSE_MS = 300
export const FLASH_MS = 160

export type CountdownValue = 3 | 2 | 1
export type DeniedReason = "denied" | "unavailable"

export type CapturePhase =
  | "idle"
  | "requesting"
  | "denied"
  | "ready"
  | "holding"
  | "countdown"
  | "capturing"
  | "pause"
  | "complete"

export interface CaptureState {
  phase: CapturePhase
  countdownValue: CountdownValue | null
  /** Slot yang sedang diganti lewat retake; null berarti slot kosong pertama. */
  targetSlot: number | null
  deniedReason: DeniedReason | null
  /** Kilat sekali per foto (DESIGN-SYSTEM §7); tampilannya ditentukan lapisan UI. */
  flash: boolean
}

export type CaptureEvent =
  | { type: "PERMISSION_REQUEST" }
  | { type: "PERMISSION_GRANTED" }
  | { type: "PERMISSION_DENIED"; reason: DeniedReason }
  | { type: "SHOOT"; target?: number }
  | { type: "HOLD_START" }
  | { type: "HOLD_CANCEL" }
  | { type: "HOLD_COMPLETE" }
  | { type: "TICK" }
  | { type: "SHOT_SAVED" }
  | { type: "FLASH_DONE" }
  | { type: "PAUSE_DONE"; allFilled: boolean }

export const INITIAL_CAPTURE_STATE: CaptureState = {
  phase: "idle",
  countdownValue: null,
  targetSlot: null,
  deniedReason: null,
  flash: false,
}

/* Fase yang mengunci kontrol: baki foto dan tombol jepret tidak bisa dipakai
   selama izin diminta, hitung mundur, pengambilan, dan jeda. */
const BUSY_PHASES: Record<CapturePhase, boolean> = {
  idle: false,
  requesting: true,
  denied: false,
  ready: false,
  holding: false,
  countdown: true,
  capturing: true,
  pause: true,
  complete: false,
}

export function isBusy(phase: CapturePhase): boolean {
  return BUSY_PHASES[phase]
}

/* Tombol jepret hanya hidup saat kamera siap. `complete` sengaja mati:
   mengganti foto saat semua slot terisi hanya lewat baki (FR-07). */
const SHOOTABLE_PHASES: Record<CapturePhase, boolean> = {
  idle: false,
  requesting: false,
  denied: false,
  ready: true,
  holding: false,
  countdown: false,
  capturing: false,
  pause: false,
  complete: false,
}

export function canShoot(phase: CapturePhase): boolean {
  return SHOOTABLE_PHASES[phase]
}

export function reduce(state: CaptureState, event: CaptureEvent): CaptureState {
  switch (state.phase) {
    case "idle":
    case "denied":
      if (event.type === "PERMISSION_REQUEST") {
        return { ...state, phase: "requesting" }
      }
      return state

    case "requesting":
      if (event.type === "PERMISSION_GRANTED") {
        return { ...state, phase: "ready", deniedReason: null }
      }
      if (event.type === "PERMISSION_DENIED") {
        return { ...state, phase: "denied", deniedReason: event.reason }
      }
      return state

    case "ready":
      if (event.type === "SHOOT") {
        return {
          ...state,
          phase: "countdown",
          countdownValue: COUNTDOWN_FROM,
          targetSlot: event.target ?? null,
        }
      }
      if (event.type === "HOLD_START") {
        return { ...state, phase: "holding" }
      }
      return state

    case "holding":
      if (event.type === "HOLD_CANCEL") {
        return { ...state, phase: "ready" }
      }
      /* GS-02: tahanan penuh memulai hitung mundur. GS-05: tombol kamera dan
         Spasi tetap memotret walau gesture sedang ditahan. */
      if (event.type === "HOLD_COMPLETE" || event.type === "SHOOT") {
        return {
          ...state,
          phase: "countdown",
          countdownValue: COUNTDOWN_FROM,
          targetSlot: null,
        }
      }
      return state

    case "countdown":
      if (event.type !== "TICK" || state.countdownValue === null) {
        return state
      }
      if (state.countdownValue === 1) {
        return {
          ...state,
          phase: "capturing",
          countdownValue: null,
          flash: true,
        }
      }
      return { ...state, countdownValue: (state.countdownValue - 1) as CountdownValue }

    case "capturing":
      if (event.type === "SHOT_SAVED") {
        return { ...state, phase: "pause" }
      }
      if (event.type === "FLASH_DONE") {
        return { ...state, flash: false }
      }
      return state

    case "pause":
      if (event.type === "PAUSE_DONE") {
        return {
          ...state,
          phase: event.allFilled ? "complete" : "ready",
          targetSlot: null,
        }
      }
      if (event.type === "FLASH_DONE") {
        return { ...state, flash: false }
      }
      return state

    case "complete":
      /* Retake hanya lewat slot tertentu; tanpa target tidak ada yang diganti. */
      if (event.type === "SHOOT" && event.target !== undefined) {
        return {
          ...state,
          phase: "countdown",
          countdownValue: COUNTDOWN_FROM,
          targetSlot: event.target,
        }
      }
      return state

    default:
      return state
  }
}
