import Konva from "konva"

import type { EffectParams } from "./presets"

/* Satu-satunya tempat preset efek dipetakan ke filter Konva (ARCHITECTURE §3:
   filter bawaan Konva supaya hasil sama antar browser).
   Konva menyimpan hasil filter di kanvas cache yang ukurannya dihitung di ruang
   induk node (tidak terpengaruh skala panggung), jadi rasio piksel 1 berarti
   cache sudah setara 1:1 dengan ruang strip 600 x 1800 dan tetap tajam saat
   ekspor. */

const CACHE_PIXEL_RATIO = 1

interface FilterSpec {
  filters: Konva.Filter[]
  attrs: Record<string, number>
}

function specFor(params: EffectParams): FilterSpec | null {
  switch (params.kind) {
    case "none":
      return null
    case "grayscale":
      return { filters: [Konva.Filters.Grayscale], attrs: {} }
    case "sepia":
      return { filters: [Konva.Filters.Sepia], attrs: {} }
    case "pop":
      return {
        filters: [Konva.Filters.HSV, Konva.Filters.Contrast],
        attrs: { saturation: 1.6, contrast: 1.15 },
      }
    case "pixelate":
      return {
        filters: [Konva.Filters.Pixelate],
        attrs: { pixelSize: params.size },
      }
    case "invert":
      return { filters: [Konva.Filters.Invert], attrs: {} }
    case "soften":
      return {
        filters: [Konva.Filters.Blur, Konva.Filters.Brighten],
        attrs: { blurRadius: 1.2, brightness: 0.08 },
      }
  }
}

export function applyEffect(node: Konva.Image, params: EffectParams): void {
  const spec = specFor(params)
  if (spec === null) {
    node.filters([])
    node.clearCache()
    return
  }

  for (const [name, value] of Object.entries(spec.attrs)) {
    node.setAttr(name, value)
  }
  node.filters(spec.filters)
  node.cache({ pixelRatio: CACHE_PIXEL_RATIO })
}
