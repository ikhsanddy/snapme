import type { SupabaseClient } from "@supabase/supabase-js"

import { STORAGE_BUCKET } from "@/lib/schemas"

/* Pagar kedua setelah URL unggah bertanda tangan: Storage tidak membatasi isi
   per berkas (batas bucket hanya satu angka dan satu daftar jenis), jadi rute
   server yang memeriksa hasil unggahan. Dipakai rute complete strip (M6/M7) dan
   rute estafet (M8). */

/** Membuat URL baca berumur pendek lalu membaca HEAD-nya. `false` berarti
 *  berkasnya tidak ada, terlalu besar, atau jenisnya bukan salah satu yang
 *  diizinkan. Galat jaringan dibiarkan melempar (pemanggil menjawab 500),
 *  sama seperti perilaku rute complete sebelumnya. */
export async function verifyStoredFile(
  admin: SupabaseClient,
  path: string,
  byteLimit: number,
  allowedTypes: readonly string[]
): Promise<boolean> {
  const { data: signed, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60)
  if (error !== null || signed === null) {
    return false
  }
  const head = await fetch(signed.signedUrl, { method: "HEAD" })
  const byteLength = Number(head.headers.get("content-length") ?? "0")
  /* Jenis persis, bukan awalan: "image/pngx" juga diawali "image/png". */
  const mediaType = (head.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase()
  return (
    head.ok &&
    Number.isFinite(byteLength) &&
    byteLength > 0 &&
    byteLength <= byteLimit &&
    allowedTypes.includes(mediaType)
  )
}
