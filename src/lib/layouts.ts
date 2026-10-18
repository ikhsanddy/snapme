/* DESIGN-SYSTEM §5: geometri ekspor (piksel), bukan token tampilan, jadi nilai
   mentahnya hidup di sini dan dipakai bersama oleh kanvas hias (react-konva),
   langkah kamera, pemilih layout, dan lapisan uji. FR-03 menambah Grid 2 x 2:
   kanvas selebar lembar 4R dengan dua kolom slot. */

export type LayoutId = "strip-4" | "strip-3" | "grid-2x2"

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface StripLayout {
  id: LayoutId
  label: string
  shotCount: number
  canvas: { width: number; height: number }
  margin: number
  gap: number
  footer: { height: number }
  slot: { width: number; height: number }
  /** Jumlah kolom slot: 1 untuk strip, 2 untuk grid. */
  columns: number
  slotRects: Rect[]
  footerRect: Rect
}

const CANVAS = { width: 600, height: 1800 } as const
const MARGIN = 36
const GAP = 24
const FOOTER_HEIGHT = 204
const SLOT_WIDTH = 528

/* Baris wordmark dan tanggal di kaki strip (DESIGN-SYSTEM §10.3). Dipakai
   StripStage untuk menggambar dan store untuk menaruh teks pengguna tepat di
   bawahnya, di layout mana pun. */
export const FOOTER_WORDMARK_ROW = 100

/* SH-04: QR 168 x 168 px (sekitar 14 mm pada cetakan 300 dpi) di kanan kaki
   strip, dengan jarak 16 px ke kotak teks di sebelahnya. Ukurannya di ruang
   kanvas, jadi ekspor selalu menghasilkan QR sebesar ini. */
export const QR_SIZE = 168
export const QR_GAP = 16

export function qrRect(layout: StripLayout): Rect {
  return {
    x: layout.footerRect.x + layout.footerRect.width - QR_SIZE,
    y:
      layout.footerRect.y +
      Math.floor((layout.footerRect.height - QR_SIZE) / 2),
    width: QR_SIZE,
    height: QR_SIZE,
  }
}

/** Lebar baris teks kaki strip: selebar kaki, atau menyempit bila QR aktif
 *  (tanggal dan teks pengguna tidak boleh tertimpa QR). */
export function footerTextWidth(layout: StripLayout, withQr: boolean): number {
  return withQr
    ? layout.footerRect.width - QR_SIZE - QR_GAP
    : layout.footerRect.width
}

interface LayoutSpec {
  id: LayoutId
  label: string
  shotCount: number
  slotHeight: number
  slotWidth?: number
  margin?: number
  gap?: number
  footer?: number
  canvas?: { width: number; height: number }
  columns?: number
}

function buildLayout(spec: LayoutSpec): StripLayout {
  const canvas = spec.canvas ?? { ...CANVAS }
  const margin = spec.margin ?? MARGIN
  const gap = spec.gap ?? GAP
  const footerHeight = spec.footer ?? FOOTER_HEIGHT
  const slotWidth = spec.slotWidth ?? SLOT_WIDTH
  const columns = spec.columns ?? 1
  const slot = { width: slotWidth, height: spec.slotHeight }
  const slotRects: Rect[] = Array.from(
    { length: spec.shotCount },
    (_, index) => ({
      x: margin + (index % columns) * (slotWidth + gap),
      y: margin + Math.floor(index / columns) * (slot.height + gap),
      width: slotWidth,
      height: slot.height,
    })
  )

  return {
    id: spec.id,
    label: spec.label,
    shotCount: spec.shotCount,
    canvas,
    margin,
    gap,
    footer: { height: footerHeight },
    slot,
    columns,
    slotRects,
    footerRect: {
      x: margin,
      y: canvas.height - footerHeight,
      width: canvas.width - margin * 2,
      height: footerHeight,
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
  "grid-2x2": buildLayout({
    id: "grid-2x2",
    label: "Grid 2 x 2",
    shotCount: 4,
    slotWidth: 540,
    slotHeight: 744,
    margin: 48,
    gap: 24,
    footer: 240,
    canvas: { width: 1200, height: 1800 },
    columns: 2,
  }),
}

export function getLayout(id: LayoutId): StripLayout {
  return LAYOUTS[id]
}
