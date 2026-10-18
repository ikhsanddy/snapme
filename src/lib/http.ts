/* Panggilan jaringan dari sisi klien. Dua alur (estafet dan bagikan) memakai
   bentuk yang sama, dan bagian yang pernah disalin ke keduanya tinggal di
   sini: pesan galat dari badan respons, dan PUT ke URL presigned R2.

   Unggahan tidak lewat rute server (ARCHITECTURE §7): badannya lumayan besar
   dan fungsi serverless punya batas ukuran isi permintaan. Klien mengunggah
   langsung ke bucket lewat URL presigned (M10), lalu rute complete yang
   memeriksa hasilnya. */

export interface SignedUpload {
  path: string
  url: string
}

/** Pesan dari server sudah berbahasa Indonesia (DESIGN-SYSTEM §12); pesan
 *  cadangan dipakai bila badan responsnya bukan JSON yang diharapkan. */
export async function messageFrom(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === "string" && body.error !== "") {
      return body.error
    }
  } catch {
    /* Bukan JSON: pakai pesan cadangan. */
  }
  return fallback
}

/** PUT ke URL presigned. Jenis isi ikut ditandatangani di URL, jadi header
 *  `Content-Type`-nya wajib sama dengan yang dipakai server saat
 *  menandatangani. */
export async function putToSignedUrl(
  upload: SignedUpload,
  blob: Blob,
  contentType: string,
  failedMessage: string
): Promise<void> {
  const response = await fetch(upload.url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  })
  if (!response.ok) {
    throw new Error(failedMessage)
  }
}
