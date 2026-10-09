/* ARCHITECTURE §6: foto diambil dari bingkai video, di-crop tengah ke rasio slot,
   lalu dicerminkan supaya sama dengan pratinjau (FR-05). */

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

  let cropWidth = sourceWidth
  let cropHeight = Math.round(sourceWidth / slotRatio)
  if (cropHeight > sourceHeight) {
    cropHeight = sourceHeight
    cropWidth = Math.round(sourceHeight * slotRatio)
  }

  const canvas = document.createElement("canvas")
  canvas.width = cropWidth
  canvas.height = cropHeight

  const context = canvas.getContext("2d")
  if (context === null) {
    return null
  }

  const sourceX = Math.round((sourceWidth - cropWidth) / 2)
  const sourceY = Math.round((sourceHeight - cropHeight) / 2)

  context.translate(cropWidth, 0)
  context.scale(-1, 1)
  context.drawImage(
    video,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  )

  return canvas.toDataURL("image/jpeg", quality)
}
