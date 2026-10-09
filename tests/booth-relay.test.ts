import { beforeEach, describe, expect, it } from "vitest"

import {
  serializeSession,
  validateRecord,
  type SessionState,
} from "@/features/session/sessionDb"
import { useBoothStore, type Shot } from "@/stores/booth"

/* M8 (SE-04, SE-05, SE-10): irisan estafet di store dan rekaman sesi. Yang
   dijaga: sesi estafet dibersihkan bersama sesi lain, dan bentuk rekamannya
   menerima catatan lama yang belum punya bidang `relay`. */

const SHOT: Shot = { still: "data:image/jpeg;base64,AAAA", capturedAt: 1 }

const RELAY = {
  id: "relayid12345",
  role: "guest" as const,
  lockedSlots: [0, 2],
  ghostEnabled: true,
}

function state(overrides: Partial<SessionState> = {}): SessionState {
  return {
    layoutId: "strip-4",
    shots: [SHOT, null, null, null],
    frameId: "klasik",
    effectId: "asli",
    stickers: [],
    texts: [],
    showDate: false,
    share: { qrEnabled: false, strip: null },
    relay: null,
    localOnly: false,
    ...overrides,
  }
}

describe("irisan estafet di store", () => {
  beforeEach(() => {
    useBoothStore.getState().reset()
  })

  it("menyimpan peran, slot terkunci, dan sakelar bayangan", () => {
    const store = useBoothStore.getState()
    store.setLayout("strip-4")
    store.setRelay(RELAY)
    expect(useBoothStore.getState().relay).toEqual(RELAY)

    store.setGhostEnabled(false)
    expect(useBoothStore.getState().relay?.ghostEnabled).toBe(false)
    /* Tanpa sesi estafet tidak ada yang diubah. */
    store.setRelay(null)
    store.setGhostEnabled(true)
    expect(useBoothStore.getState().relay).toBeNull()
  })

  it("ganti layout dan mulai dari awal membuang sesi estafetnya", () => {
    const store = useBoothStore.getState()
    store.setLayout("strip-4")
    store.setRelay(RELAY)
    store.setLayout("strip-3")
    expect(useBoothStore.getState().relay).toBeNull()

    store.setRelay(RELAY)
    store.setLocalOnly(true)
    store.reset()
    expect(useBoothStore.getState().relay).toBeNull()
    expect(useBoothStore.getState().localOnly).toBe(false)
  })
})

describe("rekaman sesi estafet", () => {
  it("serialisasi menyertakan relay dan menerima absennya", () => {
    expect(serializeSession(state({ relay: RELAY })).relay).toEqual(RELAY)
    /* Pemanggil lama tidak mengisi bidang ini; hasilnya null, bukan undefined,
       supaya bentuk rekaman selalu sama. */
    expect(serializeSession(state()).relay).toBeNull()
    /* SE-10: salinan lokal tetap lokal setelah halaman dimuat ulang. */
    const local = serializeSession(state({ localOnly: true }))
    expect(local.localOnly).toBe(true)
    expect(validateRecord(local)?.localOnly).toBe(true)
    expect(validateRecord({ ...local, localOnly: undefined })?.localOnly).toBe(false)
  })

  it("menerima rekaman lama tanpa bidang relay", () => {
    const record: Record<string, unknown> = {
      ...serializeSession(state()),
      relay: RELAY,
    }
    delete record.relay
    expect(validateRecord(record)?.relay).toBeNull()
  })

  it("menolak relay yang rusak dan menerima yang benar", () => {
    const record = serializeSession(state({ relay: RELAY }))
    expect(validateRecord(record)?.relay).toEqual(RELAY)

    expect(validateRecord({ ...record, relay: { ...RELAY, role: "wasit" } })).toBeNull()
    expect(validateRecord({ ...record, relay: { ...RELAY, lockedSlots: [0, "2"] } })).toBeNull()
    expect(validateRecord({ ...record, relay: { ...RELAY, ghostEnabled: "nyala" } })).toBeNull()
    expect(validateRecord({ ...record, relay: { ...RELAY, id: "pendek" } })).toBeNull()
  })
})
