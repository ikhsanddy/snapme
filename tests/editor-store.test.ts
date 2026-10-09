import { beforeEach, describe, expect, it } from "vitest"

import {
  STICKER_WIDTH_MAX,
  STICKER_WIDTH_MIN,
  TEXT_DEFAULT_Y,
  TEXT_FONT_MAX,
  TEXT_FONT_MIN,
  TEXT_LENGTH_MAX,
  useBoothStore,
} from "@/stores/booth"

/* M4: slice editor di store sesi. Uji ini menjaga kontrak yang dipakai
   StripCanvas, DecorPanel, dan DecorList tanpa memuat Konva. */

function editorSlice() {
  const state = useBoothStore.getState()
  return {
    frameId: state.frameId,
    effectId: state.effectId,
    stickers: state.stickers,
    texts: state.texts,
    showDate: state.showDate,
  }
}

describe("slice editor", () => {
  beforeEach(() => {
    useBoothStore.getState().reset()
  })

  it("mulai dari nilai awal yang ditetapkan design system", () => {
    expect(editorSlice()).toEqual({
      frameId: "klasik",
      effectId: "asli",
      stickers: [],
      texts: [],
      showDate: false,
    })
  })

  it("menempel stiker miring dengan ukuran awal", () => {
    useBoothStore.getState().addSticker("star")

    const [sticker] = editorSlice().stickers
    expect(sticker).toMatchObject({
      assetId: "star",
      x: 300,
      y: 900,
      rotation: -6,
      width: 120,
    })
    expect(sticker.id.length).toBeGreaterThan(0)
  })

  it("menjepit lebar stiker dan ukuran fon teks", () => {
    const store = useBoothStore.getState()
    store.addSticker("heart")
    const id = editorSlice().stickers[0].id

    store.updateSticker(id, { width: 5000 })
    expect(editorSlice().stickers[0].width).toBe(STICKER_WIDTH_MAX)
    store.updateSticker(id, { width: 1 })
    expect(editorSlice().stickers[0].width).toBe(STICKER_WIDTH_MIN)
    /* Perubahan lain tidak ikut terjepit. */
    store.updateSticker(id, { x: -40, rotation: 45 })
    expect(editorSlice().stickers[0]).toMatchObject({ x: -40, rotation: 45 })

    store.setStripText("hai")
    const textId = editorSlice().texts[0].id
    store.updateText(textId, { fontSize: 400 })
    expect(editorSlice().texts[0].fontSize).toBe(TEXT_FONT_MAX)
    store.updateText(textId, { fontSize: 4 })
    expect(editorSlice().texts[0].fontSize).toBe(TEXT_FONT_MIN)
    store.updateText(textId, { x: 120, rotation: 12 })
    expect(editorSlice().texts[0]).toMatchObject({ x: 120, rotation: 12 })

    /* Hanya stiker yang disentuh tidak memengaruhi stiker lain. */
    store.addSticker("cloud")
    expect(editorSlice().stickers).toHaveLength(2)
    expect(editorSlice().stickers[1].width).toBe(120)
  })

  it("memotong teks pada batas karakter, bukan batas pasangan surrogate", () => {
    const store = useBoothStore.getState()
    const panjang = "a".repeat(TEXT_LENGTH_MAX) + "bcd"
    store.setStripText(panjang)

    expect(editorSlice().texts[0].value).toBe("a".repeat(TEXT_LENGTH_MAX))

    store.setStripText("🎉".repeat(TEXT_LENGTH_MAX + 4))
    const value = editorSlice().texts[0].value
    expect(Array.from(value)).toHaveLength(TEXT_LENGTH_MAX)
    /* Emoji tetap utuh: tidak ada pengganti U+FFFD dari potongan surrogate. */
    expect(value).toBe("🎉".repeat(TEXT_LENGTH_MAX))
    expect(value.includes("\uFFFD")).toBe(false)
  })

  it("menyunting satu teks dan menghapusnya saat dikosongkan", () => {
    const store = useBoothStore.getState()
    store.setStripText("halo")
    const id = editorSlice().texts[0].id
    expect(editorSlice().texts[0]).toMatchObject({
      value: "halo",
      x: 300,
      y: TEXT_DEFAULT_Y,
      rotation: 0,
      fontSize: 44,
    })

    store.setStripText("halo lagi")
    expect(editorSlice().texts).toHaveLength(1)
    expect(editorSlice().texts[0]).toMatchObject({ id, value: "halo lagi" })

    store.setStripText("")
    expect(editorSlice().texts).toEqual([])
  })

  it("menghapus stiker menurut id saja", () => {
    const store = useBoothStore.getState()
    store.addSticker("star")
    store.addSticker("bolt")
    const [first, second] = editorSlice().stickers

    store.removeSticker(first.id)
    expect(editorSlice().stickers.map((item) => item.id)).toEqual([second.id])
  })

  it("mengembalikan seluruh slice editor saat layout diganti", () => {
    const store = useBoothStore.getState()
    store.setLayout("strip-4")
    store.setFrame("malam")
    store.setEffect("retro")
    store.addSticker("star")
    store.setStripText("halo")
    store.setShowDate(true)

    store.setLayout("strip-3")

    expect(useBoothStore.getState().layoutId).toBe("strip-3")
    expect(editorSlice()).toEqual({
      frameId: "klasik",
      effectId: "asli",
      stickers: [],
      texts: [],
      showDate: false,
    })
    expect(useBoothStore.getState().shots).toHaveLength(3)
  })
})
