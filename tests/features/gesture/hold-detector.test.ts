import { describe, expect, it } from "vitest"

import {
  createHoldDetector,
  type HoldEvent,
} from "@/features/gesture/holdDetector"
import {
  CAPTURE_COOLDOWN_MS,
  HOLD_DURATION_MS,
} from "@/features/gesture/thresholds"

const victory = { category: "Victory", score: 0.7 }
const openPalm = { category: "Open_Palm", score: 0.8 }
const none = { category: "None", score: 1 }

function types(events: HoldEvent[]): string[] {
  return events.map((event) => event.type)
}

describe("holdDetector", () => {
  it("menahan sampai durasi penuh: start, progres, lalu complete", () => {
    const detector = createHoldDetector()

    expect(detector.push(victory, 0)).toEqual([
      { type: "hold-start", action: "snap" },
    ])
    expect(detector.push(victory, 200)).toEqual([
      { type: "hold-progress", action: "snap", progress: 0.25 },
    ])
    expect(detector.push(victory, 400)).toEqual([
      { type: "hold-progress", action: "snap", progress: 0.5 },
    ])
    expect(detector.push(victory, 600)).toEqual([
      { type: "hold-progress", action: "snap", progress: 0.75 },
    ])
    expect(detector.push(victory, HOLD_DURATION_MS)).toEqual([
      { type: "hold-complete", action: "snap" },
    ])
  })

  it("melepas gesture sebelum penuh: hold-cancel dan siklus mulai lagi", () => {
    const detector = createHoldDetector()

    detector.push(victory, 0)
    expect(detector.push(victory, 400)).toEqual([
      { type: "hold-progress", action: "snap", progress: 0.5 },
    ])
    expect(detector.push(null, 450)).toEqual([{ type: "hold-cancel" }])
    expect(detector.push(victory, 500)).toEqual([
      { type: "hold-start", action: "snap" },
    ])
    expect(detector.push(victory, 700)).toEqual([
      { type: "hold-progress", action: "snap", progress: 0.25 },
    ])
  })

  it("jeda setelah foto mengabaikan gesture sampai cooldown habis", () => {
    const detector = createHoldDetector()

    detector.notifyCapture(1000)
    expect(detector.push(victory, 1000)).toEqual([])
    expect(detector.push(victory, 2000)).toEqual([])
    expect(detector.push(victory, 1000 + CAPTURE_COOLDOWN_MS - 1)).toEqual([])
    expect(detector.push(victory, 1000 + CAPTURE_COOLDOWN_MS)).toEqual([
      { type: "hold-start", action: "snap" },
    ])
  })

  it("mengabaikan skor di bawah ambang", () => {
    const detector = createHoldDetector()

    expect(detector.push({ category: "Victory", score: 0.59 }, 0)).toEqual([])
    expect(detector.push({ category: "Victory", score: 0.59 }, 200)).toEqual([])
  })

  it("membatalkan tahanan saat sampel turun ke bawah ambang", () => {
    const detector = createHoldDetector()

    detector.push(victory, 0)
    expect(
      detector.push({ category: "Victory", score: 0.2 }, 200)
    ).toEqual([{ type: "hold-cancel" }])
  })

  it("mengganti kategori di tengah menahan membatalkan tahanan", () => {
    const detector = createHoldDetector()

    detector.push(victory, 0)
    expect(detector.push(openPalm, 200)).toEqual([{ type: "hold-cancel" }])
    expect(detector.push(openPalm, 260)).toEqual([
      { type: "hold-start", action: "retake" },
    ])
  })

  it("tidak memicu dua kali untuk satu pose", () => {
    const detector = createHoldDetector()

    expect(types(detector.push(victory, 0))).toEqual(["hold-start"])
    expect(types(detector.push(victory, HOLD_DURATION_MS))).toEqual([
      "hold-complete",
    ])
    expect(detector.push(victory, HOLD_DURATION_MS + 200)).toEqual([])
    expect(detector.push(victory, HOLD_DURATION_MS + 400)).toEqual([])
    expect(detector.push(none, HOLD_DURATION_MS + 600)).toEqual([])
    expect(types(detector.push(victory, HOLD_DURATION_MS + 800))).toEqual([
      "hold-start",
    ])
  })

  it("aksi lain memakai ambang yang sama", () => {
    const detector = createHoldDetector()

    expect(types(detector.push(openPalm, 0))).toEqual(["hold-start"])
    expect(types(detector.push(openPalm, HOLD_DURATION_MS))).toEqual([
      "hold-complete",
    ])

    const other = createHoldDetector()
    const thumbUp = { category: "Thumb_Up", score: 0.9 }
    expect(types(other.push(thumbUp, 0))).toEqual(["hold-start"])
    expect(types(other.push(thumbUp, HOLD_DURATION_MS))).toEqual([
      "hold-complete",
    ])
  })
})
