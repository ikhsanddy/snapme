import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Image as KonvaImageNode } from "konva/lib/shapes/Image"
import type { Stage as KonvaStage } from "konva/lib/Stage"

import { ensureFontsReady } from "./canvasFonts"
import { applyEffect } from "./filters"
import type { EffectParams } from "./presets"

/* FR-11: ekspor strip 600 x 1800 px sebagai PNG di bawah 2 MB, tanpa metadata
   lokasi (kanvas tidak pernah menulis EXIF). Ekspor dilakukan dengan mengubah
   ukuran panggung di tempat, karena `Stage.toDataURL` membuat kanvas baru dan
   tidak menyentuh kanvas yang terlihat. */

export const PNG_BYTE_LIMIT = 2_097_152
/* Dipakai hanya di jalur kedua, saat PNG masih melebihi batas. */
const SLOT_JPEG_QUALITY = 0.8

export function formatStripFilename(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `snapme-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate()
  )}-${pad(date.getHours())}${pad(date.getMinutes())}.png`
}

function pngByteLength(dataUrl: string): number {
  return atob(dataUrl.slice(dataUrl.indexOf(",") + 1)).length
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const { promise, resolve, reject } = Promise.withResolvers<HTMLImageElement>()
  const image = new window.Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error("Gambar tidak bisa dimuat"))
  image.src = src
  return promise
}

/* Foto asli punya derau yang tidak bisa dipadatkan PNG. Menggambar ulang tiap
   slot lewat JPEG 0,8 menghaluskannya, dan PNG-nya ikut mengecil. */
async function recompressSlots(
  group: KonvaGroup,
  effect: EffectParams
): Promise<void> {
  for (const node of group.find(".slot-photo")) {
    const photo = node as KonvaImageNode
    const source = photo.image()
    if (source === undefined) {
      continue
    }

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(photo.width())
    canvas.height = Math.round(photo.height())
    const context = canvas.getContext("2d")
    if (context === null) {
      continue
    }

    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    photo.image(await loadImage(canvas.toDataURL("image/jpeg", SLOT_JPEG_QUALITY)))
    /* Filter bekerja di atas kanvas cache, jadi cache harus dibuat ulang. */
    applyEffect(photo, effect)
  }
}

export interface StripExportOptions {
  canvas: { width: number; height: number }
  effect: EffectParams
}

export async function exportStrip(
  stage: KonvaStage,
  group: KonvaGroup,
  options: StripExportOptions
): Promise<string> {
  await ensureFontsReady()

  /* Transformer bukan bagian dari strip. */
  const overlay = stage.find(".editor-overlay")
  for (const node of overlay) {
    node.hide()
  }

  const previous = {
    width: stage.width(),
    height: stage.height(),
    scaleX: group.scaleX(),
    scaleY: group.scaleY(),
  }

  function drawAtExportSize(): string {
    stage.size({ width: options.canvas.width, height: options.canvas.height })
    group.scale({ x: 1, y: 1 })
    return stage.toDataURL({ mimeType: "image/png", pixelRatio: 1 })
  }

  let dataUrl = drawAtExportSize()
  if (pngByteLength(dataUrl) > PNG_BYTE_LIMIT) {
    await recompressSlots(group, options.effect)
    dataUrl = drawAtExportSize()
  }

  /* Ukuran dan skala dikembalikan sendiri, bukan lewat render ulang: prop
     React-nya tidak berubah, jadi react-konva tidak akan memasangnya lagi. */
  stage.size({ width: previous.width, height: previous.height })
  group.scale({ x: previous.scaleX, y: previous.scaleY })
  for (const node of overlay) {
    node.show()
  }
  stage.batchDraw()

  return dataUrl
}

/** FR-11: nama berkas `snapme-YYYYMMDD-HHmm.png` dan unduhan langsung dari
 *  perangkat pengguna, tanpa permintaan jaringan. */
export function downloadStrip(dataUrl: string, filename: string): void {
  const meta = dataUrl.slice(0, dataUrl.indexOf(","))
  const mime = meta.slice(meta.indexOf(":") + 1, meta.indexOf(";"))
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  /* Unduhan sudah dipegang browser saat klik; URL dilepas setelah itu supaya
     blob besar tidak menahan memori sesi. */
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
