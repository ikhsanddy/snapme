import { describe, expect, it } from "vitest"

import { SESSION_VERSION, serializeSession, validateRecord } from "@/features/session/sessionDb"
import type { SessionState } from "@/features/session/sessionDb"
import type { Shot } from "@/stores/booth"

/* FR-14: bentuk rekaman sesi di IndexedDB. Validasi adalah satu-satunya pagar
   antara penyimpanan dan store, jadi kasus rusaknya diuji langsung. */

const SHOT: Shot = { still: "data:image/jpeg;base64,AAAA", capturedAt: 1 }

function validState(): SessionState {
  return {
    layoutId: "strip-4",
    shots: [SHOT, null, null, null],
    frameId: "malam",
    effectId: "retro",
    stickers: [
      { id: "s1", assetId: "star", x: 300, y: 900, rotation: -6, width: 120 },
    ],
    texts: [{ id: "t1", value: "halo", x: 300, y: 1696, rotation: 0, fontSize: 44 }],
    showDate: true,
    share: { qrEnabled: true, strip: { id: "stripid12345", expiresAt: null } },
  }
}

describe("rekaman sesi", () => {
  it("serialisasi menyalin seluruh bidang dengan versi saat ini", () => {
    const state = validState()
    expect(serializeSession(state)).toEqual({ version: SESSION_VERSION, ...state })
  })

  it("menerima rekaman hasil serialisasi", () => {
    const record = serializeSession(validState())
    expect(validateRecord(record)).toEqual(record)
  })

  it("menerima rekaman tanpa layout dengan nol foto", () => {
    const record = serializeSession({
      layoutId: null,
      shots: [],
      frameId: "klasik",
      effectId: "asli",
      stickers: [],
      texts: [],
      showDate: false,
      share: { qrEnabled: false, strip: null },
    })
    expect(validateRecord(record)).toEqual(record)
  })

  it("menolak versi yang tidak dikenal dan bukan objek", () => {
    expect(validateRecord(null)).toBeNull()
    expect(validateRecord("rekaman")).toBeNull()
    expect(validateRecord({ ...serializeSession(validState()), version: 2 })).toBeNull()
  })

  it("menolak layout tak dikenal dan jumlah slot yang tidak cocok", () => {
    const record = serializeSession(validState())
    expect(validateRecord({ ...record, layoutId: "strip-9" })).toBeNull()
    expect(validateRecord({ ...record, shots: [SHOT] })).toBeNull()
    expect(validateRecord({ ...record, shots: [SHOT, SHOT, SHOT, SHOT, SHOT] })).toBeNull()
    /* Tanpa layout, daftar foto harus kosong. */
    expect(
      validateRecord({ ...record, layoutId: null, shots: [SHOT] })
    ).toBeNull()
  })

  it("menolak tipe bidang yang salah", () => {
    const record = serializeSession(validState())
    expect(validateRecord({ ...record, frameId: 7 })).toBeNull()
    expect(validateRecord({ ...record, showDate: "ya" })).toBeNull()
    expect(validateRecord({ ...record, shots: [{ still: 1, capturedAt: 0 }, null, null, null] })).toBeNull()
    expect(
      validateRecord({ ...record, stickers: [{ id: "s1", assetId: "star" }] })
    ).toBeNull()
    expect(
      validateRecord({ ...record, texts: [{ id: "t1", value: "halo" }] })
    ).toBeNull()
  })

  /* M6: rekaman lama tidak punya `share`, dan bentuk yang rusak harus ditolak
     sebelum masuk store. */
  it("menerima rekaman lama tanpa irisan bagikan", () => {
    const record = serializeSession(validState())
    const tanpaShare: Record<string, unknown> = { ...record }
    delete tanpaShare.share
    expect(validateRecord(tanpaShare)).toEqual({
      ...record,
      share: { qrEnabled: false, strip: null },
    })
  })

  it("menerima link yang kedaluwarsanya belum diketahui", () => {
    const record = serializeSession(validState())
    expect(
      validateRecord({
        ...record,
        share: { qrEnabled: false, strip: { id: "stripid12345", expiresAt: "2026-10-19T09:00:00.000Z" } },
      })?.share
    ).toEqual({
      qrEnabled: false,
      strip: { id: "stripid12345", expiresAt: "2026-10-19T09:00:00.000Z" },
    })
  })

  it("menolak irisan bagikan yang rusak", () => {
    const record = serializeSession(validState())
    expect(validateRecord({ ...record, share: "nyala" })).toBeNull()
    expect(validateRecord({ ...record, share: { qrEnabled: "ya", strip: null } })).toBeNull()
    expect(
      validateRecord({ ...record, share: { qrEnabled: true, strip: { id: "pendek", expiresAt: null } } })
    ).toBeNull()
    expect(
      validateRecord({ ...record, share: { qrEnabled: true, strip: { id: "stripid12345", expiresAt: 7 } } })
    ).toBeNull()
  })
})
