/* DESIGN-SYSTEM §5: geometri ekspor strip.
   Angka di berkas ini adalah data ekspor (piksel), bukan token tampilan, jadi
   nilai mentahnya hidup di sini dan dipakai bersama oleh kanvas hias (react-konva)
   dan lapisan uji. Layout Grid 2 x 2 (FR-03) menyusul di M5. */

export type LayoutId = "strip-4" | "strip-3"

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface StripLayout {
  id: LayoutId
  label: string
  shotCount: number
  canvas: { width: number; height: number }
  margin: number
  gap: number
  footer: { height: number }
  slot: { width: number; height: number }
  slotRects: Rect[]
  footerRect: Rect
}

const CANVAS = { width: 600, height: 1800 } as const
const MARGIN = 36
const GAP = 24
const FOOTER_HEIGHT = 204
const SLOT_WIDTH = 528

interface LayoutSpec {
  id: LayoutId
  label: string
  shotCount: number
  slotHeight: number
}

function buildLayout(spec: LayoutSpec): StripLayout {
  const slot = { width: SLOT_WIDTH, height: spec.slotHeight }
  const slotRects: Rect[] = Array.from({ length: spec.shotCount }, (_, index) => ({
    x: MARGIN,
    y: MARGIN + index * (slot.height + GAP),
    width: slot.width,
    height: slot.height,
  }))

  return {
    id: spec.id,
    label: spec.label,
    shotCount: spec.shotCount,
    canvas: { ...CANVAS },
    margin: MARGIN,
    gap: GAP,
    footer: { height: FOOTER_HEIGHT },
    slot,
    slotRects,
    footerRect: {
      x: MARGIN,
      y: CANVAS.height - FOOTER_HEIGHT,
      width: SLOT_WIDTH,
      height: FOOTER_HEIGHT,
    },
  }
}

export const LAYOUTS: Record<LayoutId, StripLayout> = {
  "strip-4": buildLayout({
    id: "strip-4",
    label: "Strip 4 foto",
    shotCount: 4,
    slotHeight: 372,
  }),
  "strip-3": buildLayout({
    id: "strip-3",
    label: "Strip 3 foto",
    shotCount: 3,
    slotHeight: 504,
  }),
}

export function getLayout(id: LayoutId): StripLayout {
  return LAYOUTS[id]
}
