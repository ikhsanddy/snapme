import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  DEFAULT_EFFECT_ID,
  DEFAULT_FRAME_ID,
} from "@/features/editor/defaults"
import { EFFECTS, FRAMES, STICKERS } from "@/features/editor/presets"

/* M4: kontrak data hias strip (FR-09). Penamaan berkas ekspor diuji terpisah
   di tests/export-filename.test.ts. */

describe("preset hias", () => {
  it("menyediakan minimal 6 frame dengan id unik", () => {
    expect(FRAMES.length).toBeGreaterThanOrEqual(6)
    expect(new Set(FRAMES.map((frame) => frame.id)).size).toBe(FRAMES.length)
    expect(FRAMES.some((frame) => frame.id === DEFAULT_FRAME_ID)).toBe(true)
  })

  it("menyediakan satu efek per jenis filter plus Asli", () => {
    const kinds = EFFECTS.map((effect) => effect.params.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
    expect(kinds).toContain("none")
    expect(EFFECTS.length).toBeGreaterThanOrEqual(7)
    expect(EFFECTS.some((effect) => effect.id === DEFAULT_EFFECT_ID)).toBe(true)

    /* Swatch efek memakai `cssPreview`. Yang tidak punya padanan filter CSS
       adalah Asli (tanpa filter) dan Piksel (digambar sebagai pola blok). */
    for (const effect of EFFECTS) {
      const noCssPreview =
        effect.params.kind === "none" || effect.params.kind === "pixelate"
      if (noCssPreview) {
        expect(effect.cssPreview).toBe("")
      } else {
        expect(effect.cssPreview.length).toBeGreaterThan(0)
      }
    }
  })

  it("menyediakan 12 stiker dengan berkas yang benar-benar ada", () => {
    expect(STICKERS).toHaveLength(12)
    expect(new Set(STICKERS.map((sticker) => sticker.id)).size).toBe(12)

    for (const sticker of STICKERS) {
      expect(existsSync(path.join("public", "stickers", sticker.file))).toBe(true)
      expect(sticker.label.length).toBeGreaterThan(0)
    }
  })
})
