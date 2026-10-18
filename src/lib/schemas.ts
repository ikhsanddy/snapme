import { z } from "zod"

import { LAYOUTS, type LayoutId } from "@/lib/layouts"

/* ARCHITECTURE §8: bentuk permintaan dan batas berkas. Zod dipakai di rute
   server; batas ukuran juga dipakai saat memverifikasi berkas yang sudah
   diunggah (URL unggah tidak bisa membatasi isi). */

/** M7: klip Strip Hidup, di bawah 5 MB (PRD §8, SH-03). Jenisnya mengikuti
 *  kemampuan perekam browser, jadi hanya dua ini yang diterima. */
export const LIVE_MIME_TYPES = {
  webm: "video/webm",
  mp4: "video/mp4",
} as const

export type LiveKind = keyof typeof LIVE_MIME_TYPES

export const LIVE_BYTE_LIMIT = 5_242_880

/** Jenis isi yang diterima rute complete (pagar kedua setelah bucket). */
export const LIVE_MEDIA_TYPES: Record<string, true> = {
  [LIVE_MIME_TYPES.webm]: true,
  [LIVE_MIME_TYPES.mp4]: true,
}

export const CREATE_STRIP_SCHEMA = z.object({
  layout: z.enum(Object.keys(LAYOUTS) as [LayoutId, ...LayoutId[]]),
  /** M7 (SH-03): kehadirannya berarti klien juga meminta URL unggah klip. */
  live: z
    .enum(Object.keys(LIVE_MIME_TYPES) as [LiveKind, ...LiveKind[]])
    .optional(),
})

/** PRD §8: diam 2 MB. Jenisnya PNG karena ekspor strip selalu PNG. */
export const STILL_MIME = "image/png"
export const STILL_BYTE_LIMIT = 2_097_152

/** M8: satu bucket pribadi untuk semua berkas (ARCHITECTURE §7). */
export const STORAGE_BUCKET = "snapme"

/** M8 (SE-01): estafet punya layout saja; jumlah slotnya diturunkan dari
 *  geometri layout, dan tidak ada klip atau QR di jalur ini. */
export const CREATE_RELAY_SCHEMA = z.object({
  layout: CREATE_STRIP_SCHEMA.shape.layout,
})

/** PRD §8: slot estafet 1 MB, dan selalu JPEG karena klien mengekspor bingkai
 *  kamera lewat kanvas. Bucket menerima 5 MB (batas klip), jadi rute inilah
 *  pagar ukuran yang sebenarnya untuk slot. */
export const RELAY_SLOT_MIME = "image/jpeg"
export const RELAY_SLOT_BYTE_LIMIT = 1_048_576

export function stripStillPath(id: string): string {
  return `strips/${id}/still.png`
}

/** M8: satu berkas per slot estafet. Penomoran 1-based mengikuti bahasa
 *  antarmuka ("Slot teman 1"), sedangkan indeks di kode selalu 0-based. */
export function relaySlotPath(relayId: string, index: number): string {
  return `relays/${relayId}/slot-${index + 1}.jpg`
}

/** M7 (SH-03): klip Strip Hidup; jenisnya masuk ke nama berkas supaya
 *  Content-Type saat membaca bisa ditebak tanpa tabel tambahan. */
export function stripLivePath(id: string, kind: LiveKind): string {
  return `strips/${id}/live.${kind}`
}
