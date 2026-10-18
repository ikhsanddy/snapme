import { describe, expect, it } from "vitest"

import { computeCenterCrop } from "@/features/camera/crop"

/* FR-05 dan FR-13: crop tengah dari sumber ke rasio slot. Nilai yang diuji
   adalah nilai yang dipakai kamera dan pemuat foto galeri. */

describe("computeCenterCrop", () => {
  it("memotong sisi lebar saat sumber lebih lebar dari rasio slot", () => {
    /* 1280 x 720 dipotong ke rasio slot strip-4 (528 / 372). */
    const crop = computeCenterCrop(1280, 720, 528 / 372)

    expect(crop.height).toBe(720)
    expect(crop.width).toBe(Math.round(720 * (528 / 372)))
    expect(crop.x).toBe(Math.round((1280 - crop.width) / 2))
    expect(crop.y).toBe(0)
  })

  it("memotong sisi tinggi saat sumber lebih tinggi dari rasio slot", () => {
    /* Foto potret 600 x 1200 ke rasio layar 16 / 9. */
    const crop = computeCenterCrop(600, 1200, 16 / 9)

    expect(crop.width).toBe(600)
    expect(crop.height).toBe(Math.round(600 / (16 / 9)))
    expect(crop.x).toBe(0)
    expect(crop.y).toBe(Math.round((1200 - crop.height) / 2))
  })

  it("membiarkan sumber yang rasionya sudah pas", () => {
    expect(computeCenterCrop(800, 600, 4 / 3)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    })
  })
})
