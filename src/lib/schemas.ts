/* Batas berkas dan jenis media Strip Hidup. Backend sudah dibongkar, jadi modul ini
   hanya menyimpan konstanta yang dipakai alur lokal dan panggilan unggahan klien. */

/** M7: klip Strip Hidup, di bawah 5 MB (PRD §8, SH-03). Jenisnya mengikuti
 *  kemampuan perekam browser, jadi hanya dua ini yang diizinkan. */
export const LIVE_MIME_TYPES = {
  webm: "video/webm",
  mp4: "video/mp4",
} as const

export type LiveKind = keyof typeof LIVE_MIME_TYPES

/** PRD §8: diam 2 MB. Jenisnya PNG karena ekspor strip selalu PNG. */
export const STILL_MIME = "image/png"

/** PRD §8: slot estafet 1 MB, dan selalu JPEG karena klien mengekspor bingkai
 *  kamera lewat kanvas. */
export const RELAY_SLOT_MIME = "image/jpeg"
export const RELAY_SLOT_BYTE_LIMIT = 1_048_576
