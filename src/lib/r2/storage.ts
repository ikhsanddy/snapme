/* M10: verifikasi berkas di bucket dan penghapusan massal. Menggantikan pola
   Supabase "URL bertanda tangan lalu HEAD": R2 punya `head()` yang membaca
   metadata objeknya langsung, tanpa permintaan jaringan. */

/** Pagar kedua setelah Content-Type yang ikut ditandatangani di URL unggah:
 *  URL itu memaksa klien mengunggah jenis berkas yang sama, dan fungsi ini
 *  memeriksa hasil unggahannya. `false` berarti berkasnya tidak ada, terlalu
 *  besar, atau jenisnya bukan salah satu yang diizinkan. */
export async function verifyStoredFile(
  bucket: R2Bucket,
  path: string,
  byteLimit: number,
  allowedTypes: readonly string[]
): Promise<boolean> {
  const object = await bucket.head(path)
  if (object === null) {
    return false
  }
  /* Jenis persis, bukan awalan: "image/pngx" juga diawali "image/png". */
  const mediaType = (object.httpMetadata?.contentType ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase()
  return (
    object.size > 0 &&
    object.size <= byteLimit &&
    allowedTypes.includes(mediaType)
  )
}

/** Menghapus objek dengan potongan 1000 kunci: jumlah kunci per permintaan
 *  bucket dibatasi, sedangkan jumlah path pembersihan tidak. */
export async function deleteObjects(
  bucket: R2Bucket,
  paths: readonly string[]
): Promise<void> {
  for (let start = 0; start < paths.length; start += 1000) {
    await bucket.delete([...paths.slice(start, start + 1000)])
  }
}
