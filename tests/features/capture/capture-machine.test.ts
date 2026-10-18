import { describe, expect, it } from "vitest"

import {
  INITIAL_CAPTURE_STATE,
  reduce,
  type CaptureEvent,
  type CaptureState,
} from "@/features/capture/machine"

function run(events: CaptureEvent[], from: CaptureState = INITIAL_CAPTURE_STATE) {
  return events.reduce(reduce, from)
}

const ready = run([{ type: "PERMISSION_REQUEST" }, { type: "PERMISSION_GRANTED" }])

describe("mesin keadaan pemotretan", () => {
  it("mengikuti alur izin: minta, diberi, ditolak, dan minta ulang", () => {
    expect(INITIAL_CAPTURE_STATE.phase).toBe("idle")

    const requesting = reduce(INITIAL_CAPTURE_STATE, { type: "PERMISSION_REQUEST" })
    expect(requesting.phase).toBe("requesting")

    expect(reduce(requesting, { type: "PERMISSION_GRANTED" })).toEqual({
      phase: "ready",
      countdownValue: null,
      targetSlot: null,
      deniedReason: null,
      flash: false,
    })

    const denied = reduce(requesting, {
      type: "PERMISSION_DENIED",
      reason: "denied",
    })
    expect(denied.phase).toBe("denied")
    expect(denied.deniedReason).toBe("denied")

    const unavailable = reduce(requesting, {
      type: "PERMISSION_DENIED",
      reason: "unavailable",
    })
    expect(unavailable.deniedReason).toBe("unavailable")

    /* "Coba Lagi" dari layar galat meminta izin sekali lagi. */
    expect(reduce(denied, { type: "PERMISSION_REQUEST" }).phase).toBe("requesting")

    /* Alasan galat dibersihkan setelah izin benar-benar diberikan. */
    const granted = run(
      [{ type: "PERMISSION_REQUEST" }, { type: "PERMISSION_GRANTED" }],
      denied
    )
    expect(granted.phase).toBe("ready")
    expect(granted.deniedReason).toBeNull()
  })

  it("siap ke hitung mundur lewat tombol, tanpa atau dengan slot sasaran", () => {
    const shot = reduce(ready, { type: "SHOOT" })
    expect(shot.phase).toBe("countdown")
    expect(shot.countdownValue).toBe(3)
    expect(shot.targetSlot).toBeNull()

    const retake = reduce(ready, { type: "SHOOT", target: 2 })
    expect(retake.targetSlot).toBe(2)
  })

  it("menahan gesture berjalan siap ke menahan dan batal kembali ke siap", () => {
    const holding = reduce(ready, { type: "HOLD_START" })
    expect(holding.phase).toBe("holding")

    expect(reduce(holding, { type: "HOLD_CANCEL" }).phase).toBe("ready")

    /* GS-02: tahanan penuh memulai hitung mundur dari slot kosong pertama. */
    const completed = reduce(holding, { type: "HOLD_COMPLETE" })
    expect(completed.phase).toBe("countdown")
    expect(completed.countdownValue).toBe(3)
    expect(completed.targetSlot).toBeNull()

    /* GS-05: Spasi dan tombol kamera tetap bisa dipakai saat gesture ditahan. */
    const shot = reduce(holding, { type: "SHOOT" })
    expect(shot.phase).toBe("countdown")
    expect(shot.countdownValue).toBe(3)

    /* Selama menahan, perintah lain tidak berpengaruh. */
    expect(reduce(holding, { type: "TICK" })).toBe(holding)
  })

  it("hitung mundur turun 3, 2, 1 lalu memotret", () => {
    let state = reduce(ready, { type: "SHOOT", target: 1 })
    expect(state.countdownValue).toBe(3)

    state = reduce(state, { type: "TICK" })
    expect([state.phase, state.countdownValue]).toEqual(["countdown", 2])

    state = reduce(state, { type: "TICK" })
    expect([state.phase, state.countdownValue]).toEqual(["countdown", 1])

    state = reduce(state, { type: "TICK" })
    expect(state.phase).toBe("capturing")
    expect(state.countdownValue).toBeNull()
    expect(state.targetSlot).toBe(1)
    expect(state.flash).toBe(true)
  })

  it("kilat menyala sekali lalu padam, tanpa menunggu jeda selesai", () => {
    const capturing = run([
      { type: "SHOOT" },
      { type: "TICK" },
      { type: "TICK" },
      { type: "TICK" },
    ], ready)
    expect(capturing.flash).toBe(true)

    const pause = reduce(capturing, { type: "SHOT_SAVED" })
    expect(pause.phase).toBe("pause")
    expect(pause.flash).toBe(true)

    const flashedOut = reduce(pause, { type: "FLASH_DONE" })
    expect(flashedOut.flash).toBe(false)
    expect(flashedOut.phase).toBe("pause")

    /* Foto berikutnya menyalakan kilat lagi. */
    const again = run([
      { type: "PAUSE_DONE", allFilled: false },
      { type: "SHOOT" },
      { type: "TICK" },
      { type: "TICK" },
      { type: "TICK" },
    ], flashedOut)
    expect(again.flash).toBe(true)
  })

  it("memotret lalu jeda, dan jeda mengembalikan ke siap atau lengkap", () => {
    const capturing = run([
      { type: "SHOOT" },
      { type: "TICK" },
      { type: "TICK" },
      { type: "TICK" },
    ], ready)

    const pause = reduce(capturing, { type: "SHOT_SAVED" })
    expect(pause.phase).toBe("pause")

    const back = reduce(pause, { type: "PAUSE_DONE", allFilled: false })
    expect(back.phase).toBe("ready")
    expect(back.targetSlot).toBeNull()

    const complete = reduce(pause, { type: "PAUSE_DONE", allFilled: true })
    expect(complete.phase).toBe("complete")
  })

  it("lengkap hanya menerima retake pada slot tertentu", () => {
    const complete = run([
      { type: "SHOOT" },
      { type: "TICK" },
      { type: "TICK" },
      { type: "TICK" },
      { type: "SHOT_SAVED" },
      { type: "PAUSE_DONE", allFilled: true },
    ], ready)
    expect(complete.phase).toBe("complete")

    /* Tombol jepret tidak memicu foto baru saat semua slot terisi. */
    expect(reduce(complete, { type: "SHOOT" })).toBe(complete)

    const retake = reduce(complete, { type: "SHOOT", target: 3 })
    expect(retake.phase).toBe("countdown")
    expect(retake.countdownValue).toBe(3)
    expect(retake.targetSlot).toBe(3)
  })

  it("tidak mengubah state saat peristiwa datang di fase yang salah", () => {
    const countdown = reduce(ready, { type: "SHOOT" })
    const capturing = run([
      { type: "TICK" },
      { type: "TICK" },
      { type: "TICK" },
    ], countdown)
    const pause = reduce(capturing, { type: "SHOT_SAVED" })
    const complete = reduce(pause, { type: "PAUSE_DONE", allFilled: true })

    const ignored: [CaptureState, CaptureEvent[]][] = [
      [INITIAL_CAPTURE_STATE, [{ type: "SHOOT" }, { type: "TICK" }, { type: "HOLD_START" }]],
      [reduce(INITIAL_CAPTURE_STATE, { type: "PERMISSION_REQUEST" }), [{ type: "TICK" }, { type: "SHOOT" }]],
      [ready, [{ type: "TICK" }, { type: "PAUSE_DONE", allFilled: true }, { type: "SHOT_SAVED" }]],
      [countdown, [{ type: "SHOOT" }, { type: "SHOT_SAVED" }, { type: "PAUSE_DONE", allFilled: true }]],
      [capturing, [{ type: "TICK" }, { type: "SHOOT" }, { type: "PAUSE_DONE", allFilled: true }]],
      [pause, [{ type: "SHOOT" }, { type: "TICK" }, { type: "SHOT_SAVED" }]],
      [complete, [{ type: "TICK" }, { type: "HOLD_START" }, { type: "SHOT_SAVED" }]],
    ]

    for (const [state, events] of ignored) {
      for (const event of events) {
        expect(reduce(state, event)).toBe(state)
      }
    }
  })
})
