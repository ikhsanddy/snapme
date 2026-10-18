/* Crop tengah untuk mengubah rasio sumber ke rasio slot strip.
   Fungsi murni: dipakai kamera (FR-05) dan pemuatan foto galeri (FR-13), dan
   diuji tanpa DOM. */

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export function computeCenterCrop(
  sourceWidth: number,
  sourceHeight: number,
  ratio: number
): CropRect {
  let width = sourceWidth
  let height = Math.round(sourceWidth / ratio)
  if (height > sourceHeight) {
    height = sourceHeight
    width = Math.round(sourceHeight * ratio)
  }

  return {
    x: Math.round((sourceWidth - width) / 2),
    y: Math.round((sourceHeight - height) / 2),
    width,
    height,
  }
}
