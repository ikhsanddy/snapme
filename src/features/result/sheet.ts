import { resolveTokenColor } from "@/features/editor/tokenColor"
import { loadImageElement } from "@/lib/imageElement"
import { getLayout, type LayoutId } from "@/lib/layouts"

/* FR-12: lembar cetak 4R 1200 x 1800 px berisi dua strip berdampingan dengan
   garis potong di tengah. Komposisinya murni Canvas2D, tanpa Konva, supaya
   halaman Hasil tidak perlu menyentuh panggung lagi untuk urusan cetak.
   Layout Grid 2 x 2 (FR-03) sudah selebar lembar 4R: hasil ekspornya
   dikembalikan apa adanya, tanpa duplikasi dan tanpa garis potong. */

const SHEET_WIDTH = 1200
const SHEET_HEIGHT = 1800
/* Strip 600 px, jadi strip kedua mulai di tengah lembar. */
const SECOND_STRIP_X = 600
const CUT_LINE_WIDTH = 4
const CUT_DASH = [12, 8]

/** Menggabungkan PNG strip menjadi PNG lembar 4R siap cetak. */
export async function composePrintSheet(
  stripDataUrl: string,
  layoutId: LayoutId
): Promise<string> {
  const layout = getLayout(layoutId)
  if (layout.canvas.width >= SHEET_WIDTH) {
    return stripDataUrl
  }

  const strip = await loadImageElement(stripDataUrl)
  const canvas = document.createElement("canvas")
  canvas.width = SHEET_WIDTH
  canvas.height = SHEET_HEIGHT
  const context = canvas.getContext("2d")
  if (context === null) {
    throw new Error("Kanvas 2D tidak tersedia")
  }

  context.drawImage(strip, 0, 0)
  context.drawImage(strip, SECOND_STRIP_X, 0)

  context.strokeStyle = resolveTokenColor("--color-ink")
  context.lineWidth = CUT_LINE_WIDTH
  context.setLineDash(CUT_DASH)
  context.beginPath()
  context.moveTo(SECOND_STRIP_X, 0)
  context.lineTo(SECOND_STRIP_X, SHEET_HEIGHT)
  context.stroke()

  return canvas.toDataURL("image/png")
}
