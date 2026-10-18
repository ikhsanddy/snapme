import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"

import { hasLiveClips, useBoothStore, type Shot } from "@/stores/booth"

/* SH-01/SH-02: irisan Strip Hidup di store. Dua hal yang dijaga di sini:
   bingkai klip dilepas saat fotonya diganti atau sesi diulang (memori tidak
   menumpuk), dan `hasLiveClips` menjadi gerbang kartu Hias. */

function klip(jumlah: number): { frames: ImageBitmap[]; spies: Mock[] } {
  const spies = Array.from({ length: jumlah }, () => vi.fn())
  const frames = spies.map((spy) => ({ close: spy }) as unknown as ImageBitmap)
  return { frames, spies }
}

function shot(clip?: ImageBitmap[]): Shot {
  return { still: "data:image/jpeg;base64,AAAA", capturedAt: 1, clip }
}

describe("irisan Strip Hidup", () => {
  beforeEach(() => {
    useBoothStore.getState().reset()
  })

  it("belum ada klip sebelum ada foto berklip", () => {
    const store = useBoothStore.getState()
    expect(hasLiveClips(store.shots)).toBe(false)
    store.setLayout("strip-4")
    expect(hasLiveClips(useBoothStore.getState().shots)).toBe(false)
    expect(useBoothStore.getState().live.enabled).toBe(false)
  })

  it("mengenali klip di slot mana pun", () => {
    const store = useBoothStore.getState()
    store.setLayout("strip-4")
    store.setShot(0, shot())
    expect(hasLiveClips(useBoothStore.getState().shots)).toBe(false)

    store.setShot(2, shot(klip(10).frames))
    expect(hasLiveClips(useBoothStore.getState().shots)).toBe(true)

    store.setLiveEnabled(true)
    expect(useBoothStore.getState().live.enabled).toBe(true)
  })

  it("melepas bingkai slot yang diganti", () => {
    const store = useBoothStore.getState()
    store.setLayout("strip-4")
    const lama = klip(3)
    store.setShot(0, shot(lama.frames))

    store.setShot(0, shot())
    for (const spy of lama.spies) {
      expect(spy).toHaveBeenCalledTimes(1)
    }
    expect(hasLiveClips(useBoothStore.getState().shots)).toBe(false)
  })

  it("melepas semua bingkai saat layout diganti dan sesi diulang", () => {
    const store = useBoothStore.getState()
    store.setLayout("strip-4")
    const pertama = klip(2)
    const kedua = klip(2)
    store.setShot(0, shot(pertama.frames))
    store.setShot(1, shot(kedua.frames))
    store.setLiveEnabled(true)

    store.setLayout("strip-3")
    for (const spy of [...pertama.spies, ...kedua.spies]) {
      expect(spy).toHaveBeenCalledTimes(1)
    }
    expect(useBoothStore.getState().live.enabled).toBe(false)

    const ketiga = klip(1)
    store.setShot(0, shot(ketiga.frames))
    store.setLiveEnabled(true)
    store.reset()
    expect(ketiga.spies[0]).toHaveBeenCalledTimes(1)
    expect(useBoothStore.getState().live.enabled).toBe(false)
  })
})
