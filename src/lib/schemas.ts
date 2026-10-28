import { z } from "zod"

import { LAYOUTS, type LayoutId } from "@/lib/layouts"

/* PRD §8: bentuk permintaan dan batas berkas. Klien memakai batas-batas ini
   untuk memvalidasi hasilnya sendiri sebelum menawarkan unggahan; rute server
   yang dulu menegakkan ulang batasnya sudah dibongkar bersama backendnya. */

/** M7: klip Strip Hidup, di bawah 5 MB (PRD §8, SH-03). Jenisnya mengikuti
 *  kemampuan perekam browser, jadi hanya dua ini yang diizinkan. */
export const LIVE_MIME_TYPES = {
  webm: "video/webm",
  mp4: "video/mp4",
} as const

export type LiveKind = keyof typeof LIVE_MIME_TYPES

export const CREATE_STRIP_SCHEMA = z.object({
  layout: z.enum(Object.keys(LAYOUTS) as [LayoutId, ...LayoutId[]]),
  /** M7 (SH-03): kehadirannya berarti klien juga menyiapkan klip. */
  live: z
    .enum(Object.keys(LIVE_MIME_TYPES) as [LiveKind, ...LiveKind[]])
    .optional(),
})

/** PRD §8: diam 2 MB. Jenisnya PNG karena ekspor strip selalu PNG. */
export const STILL_MIME = "image/png"

/** M8: satu bucket pribadi untuk semua berkas (ARCHITECTURE §7). */
export const CREATE_RELAY_SCHEMA = z.object({
  layout: CREATE_STRIP_SCHEMA.shape.layout,
})

/** PRD §8: slot estafet 1 MB, dan selalu JPEG karena klien mengekspor bingkai
 *  kamera lewat kanvas. */
export const RELAY_SLOT_MIME = "image/jpeg"
export const RELAY_SLOT_BYTE_LIMIT = 1_048_576
