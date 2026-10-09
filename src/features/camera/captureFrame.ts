/* ARCHITECTURE §6: foto diambil dari bingkai video, di-crop tengah ke rasio slot,
   lalu dicerminkan supaya sama dengan pratinjau (FR-05). */

import { computeCenterCrop } from "./crop"

export const JPEG_QUALITY = 0.92

export function captureFrame(
  video: HTMLVideoElement,
  slotRatio: number,
  quality = JPEG_QUALITY
): string | null {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (sourceWidth === 0 || sourceHeight === 0) {
    return null
  }

  const crop = computeCenterCrop(sourceWidth, sourceHeight, slotRatio)

  const canvas = document.createElement("canvas")
  canvas.width = crop.width
  canvas.height = crop.height

  const context = canvas.getContext("2d")
  if (context === null) {
    return null
  }

  context.translate(crop.width, 0)
  context.scale(-1, 1)
  context.drawImage(
    video,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  )

  return canvas.toDataURL("image/jpeg", quality)
}
