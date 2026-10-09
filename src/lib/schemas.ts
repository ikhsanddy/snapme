import { z } from "zod"

import { LAYOUTS, type LayoutId } from "@/lib/layouts"

/* ARCHITECTURE §8: bentuk permintaan dan batas berkas. Zod dipakai di rute
   server; batas ukuran juga dipakai saat memverifikasi berkas yang sudah
   diunggah (URL unggah tidak bisa membatasi isi). */

export const CREATE_STRIP_SCHEMA = z.object({
  layout: z.enum(Object.keys(LAYOUTS) as [LayoutId, ...LayoutId[]]),
})

export type CreateStripPayload = z.infer<typeof CREATE_STRIP_SCHEMA>

/** PRD §8: diam 2 MB. Jenisnya PNG karena ekspor strip selalu PNG. */
export const STILL_MIME = "image/png"
export const STILL_BYTE_LIMIT = 2_097_152

/** Satu bucket pribadi untuk semua berkas (ARCHITECTURE §7). */
export const STORAGE_BUCKET = "snapme"

export function stripStillPath(id: string): string {
  return `strips/${id}/still.png`
}

/** Disiapkan untuk M7; baris lama tetap punya kolom ini. */
export function stripLivePath(id: string): string {
  return `strips/${id}/live.webm`
}
