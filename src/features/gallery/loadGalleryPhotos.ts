import { JPEG_QUALITY } from "@/features/camera/captureFrame"
import { computeCenterCrop } from "@/features/camera/crop"
import { loadImageElement } from "@/lib/imageElement"
import { LAYOUTS, type LayoutId } from "@/lib/layouts"

/* FR-13: pakai foto galeri sebagai pengganti kamera. Berkas tidak pernah
   meninggalkan perangkat: dipotong tengah sesuai rasio slot, digambar ulang di
   kanvas, lalu disimpan sebagai dataURL JPEG seperti hasil kamera.
   Dimuat hanya saat tombolnya ditekan (import() dinamis dari GalleryPicker),
   supaya Welcome tetap tanpa kode pengolahan gambar (FR-01). */

interface GalleryOutcome {
  /** Slot yang terisi, berdasar urutan nama berkas. */
  results: { index: number; still: string }[]
  /** Berkas yang tidak bisa didekode browser ini (mis. HEIC di Firefox). */
  rejected: number
}

interface Decoded {
  image: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function decodeImage(file: File): Promise<Decoded | null> {
  try {
    const bitmap = await createImageBitmap(file)
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  } catch {
    /* Sebagian browser menolak bentuk berkas tertentu di createImageBitmap;
       elemen gambar jadi jalur kedua sebelum berkas dihitung gagal. */
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await loadImageElement(url)
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

async function renderSlot(file: File, ratio: number): Promise<string | null> {
  const decoded = await decodeImage(file)
  if (decoded === null) {
    return null
  }
  if (decoded.width === 0 || decoded.height === 0) {
    decoded.release()
    return null
  }

  const crop = computeCenterCrop(decoded.width, decoded.height, ratio)
  const canvas = document.createElement("canvas")
  canvas.width = crop.width
  canvas.height = crop.height
  const context = canvas.getContext("2d")
  if (context === null) {
    decoded.release()
    return null
  }

  context.drawImage(
    decoded.image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  )
  const still = canvas.toDataURL("image/jpeg", JPEG_QUALITY)
  decoded.release()
  return still
}

export async function loadGalleryPhotos(
  files: File[],
  layoutId: LayoutId
): Promise<GalleryOutcome> {
  const layout = LAYOUTS[layoutId]
  const ordered = [...files]
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, layout.shotCount)

  const results: GalleryOutcome["results"] = []
  let rejected = 0

  for (const [index, file] of ordered.entries()) {
    const still = await renderSlot(file, layout.slot.width / layout.slot.height)
    if (still === null) {
      rejected += 1
      continue
    }
    results.push({ index, still })
  }

  return { results, rejected }
}
