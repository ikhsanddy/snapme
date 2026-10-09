import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import {
  EVENT_BATCH_SIZE,
  SESSION_START_KEY,
  firstPhotoBucket,
} from "@/lib/analyticsEvents"

/* Antrean analitik diuji sebagai modul klien: kapan peristiwanya dikirim,
   lewat jalur apa, dan bucket durasi foto pertama. Antreannya ada di memori
   modul, jadi tiap kasus memuat modulnya sendiri dari nol. */

async function muatAnalitik() {
  vi.resetModules()
  return await import("@/lib/analytics")
}

function pasangBeacon(hasil = true) {
  /* Argumennya ikut diuji (alamat dan Blob isinya), jadi mocknya diberi tipe
     berparameter supaya `mock.calls` bertipe argumen, bukan tuple kosong. */
  const beacon = vi.fn<(...args: unknown[]) => boolean>(() => hasil)
  Object.defineProperty(window.navigator, "sendBeacon", {
    value: beacon,
    configurable: true,
    writable: true,
  })
  return beacon
}

function isiBeacon(beacon: Mock, index = 0): Promise<unknown> {
  const blob = beacon.mock.calls[index]?.[1] as Blob
  return blob.text().then((text) => JSON.parse(text) as unknown)
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.unstubAllGlobals()
  /* jsdom tidak punya sendBeacon; tiap kasus memasangnya sendiri. */
  Reflect.deleteProperty(window.navigator, "sendBeacon")
})

describe("antrean analitik", () => {
  it("menahan peristiwa di memori sampai ambang batch, lalu mengirimnya sekaligus", async () => {
    const beacon = pasangBeacon()
    const { track } = await muatAnalitik()

    for (let index = 0; index < EVENT_BATCH_SIZE - 1; index += 1) {
      track("welcome_loaded")
    }
    expect(beacon).not.toHaveBeenCalled()

    track("download_png")
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0]?.[0]).toBe("/api/events")
    expect(await isiBeacon(beacon)).toEqual({
      events: [
        ...Array.from({ length: EVENT_BATCH_SIZE - 1 }, () => "welcome_loaded"),
        "download_png",
      ],
    })
  })

  it("mengirim sisa antrean saat halaman disembunyikan atau ditinggalkan", async () => {
    const beacon = pasangBeacon()
    const { track } = await muatAnalitik()
    track("camera_granted")

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    })
    document.dispatchEvent(new Event("visibilitychange"))
    expect(await isiBeacon(beacon)).toEqual({ events: ["camera_granted"] })

    /* Antreannya kosong sesudah kirim pertama, jadi penyembunyian berikutnya
       tidak mengirim apa-apa. */
    document.dispatchEvent(new Event("visibilitychange"))
    expect(beacon).toHaveBeenCalledTimes(1)

    track("relay_created")
    window.dispatchEvent(new Event("pagehide"))
    expect(await isiBeacon(beacon, 1)).toEqual({ events: ["relay_created"] })
  })

  it("jatuh ke fetch bila beacon tidak ada, dan tidak pernah melempar", async () => {
    const fetchPalsu = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal("fetch", fetchPalsu)
    const { track } = await muatAnalitik()

    expect(() => {
      for (let index = 0; index < EVENT_BATCH_SIZE; index += 1) {
        track("photo_taken_button")
      }
    }).not.toThrow()

    expect(fetchPalsu).toHaveBeenCalledTimes(1)
    const [alamat, options] = fetchPalsu.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(alamat).toBe("/api/events")
    expect(options.method).toBe("POST")
    expect(JSON.parse(String(options.body))).toEqual({
      events: Array.from({ length: EVENT_BATCH_SIZE }, () => "photo_taken_button"),
    })
  })

  it("mengirim lewat fetch juga saat beacon menolak isinya", async () => {
    pasangBeacon(false)
    const fetchPalsu = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal("fetch", fetchPalsu)
    const { track } = await muatAnalitik()

    track("print_4r")
    window.dispatchEvent(new Event("pagehide"))
    expect(fetchPalsu).toHaveBeenCalledTimes(1)
  })
})

describe("bucket cepat dipakai", () => {
  it("memisahkan batas 15, 30, dan 60 detik", () => {
    expect(firstPhotoBucket(0)).toBe("first_photo_under_15s")
    expect(firstPhotoBucket(14_999)).toBe("first_photo_under_15s")
    expect(firstPhotoBucket(15_000)).toBe("first_photo_15_30s")
    expect(firstPhotoBucket(29_999)).toBe("first_photo_15_30s")
    expect(firstPhotoBucket(30_000)).toBe("first_photo_30_60s")
    expect(firstPhotoBucket(59_999)).toBe("first_photo_30_60s")
    expect(firstPhotoBucket(60_000)).toBe("first_photo_over_60s")
  })

  it("membaca penanda waktu sesi dan menjawab null bila belum ditandai", async () => {
    const { firstPhotoBucketEvent, markSessionStart } = await muatAnalitik()
    expect(firstPhotoBucketEvent()).toBeNull()

    markSessionStart()
    expect(firstPhotoBucketEvent()).toBe("first_photo_under_15s")

    window.sessionStorage.setItem(SESSION_START_KEY, String(Date.now() - 45_000))
    expect(firstPhotoBucketEvent()).toBe("first_photo_30_60s")

    window.sessionStorage.setItem(SESSION_START_KEY, "bukan-angka")
    expect(firstPhotoBucketEvent()).toBeNull()
  })
})
