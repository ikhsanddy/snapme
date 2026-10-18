import { AwsClient } from "aws4fetch"

import type { S3Credentials } from "@/server/cloudflare"
import { STORAGE_BUCKET } from "@/lib/schemas"

/* M10: URL presigned R2 lewat aws4fetch, pengganti createSignedUploadUrl dan
   createSignedUrl Supabase. Endpoint-nya gaya path (bucket di dalam path);
   Signature V4 di query string, jadi klien mengunggah langsung ke R2 tanpa
   melewati rute server.

   Content-Type ikut ditandatangani pada PUT (aws4fetch menandatangani semua
   header yang ada di permintaan): klien yang mengunggah jenis berkas lain
   ditolak R2 dengan 403, jadi jenisnya terjaga sejak URL dibuat. Rute complete
   tetap memeriksa hasil unggahan sebagai pagar kedua. */

/** Umur URL unggah. Klip Strip Hidup direkam lalu diunggah beberapa detik
 *  setelah URL-nya dibuat, jadi 15 menit sudah lapang. */
const PUT_URL_SECONDS = 900

/** Age of the read URL embedded in a page (SH-05). */
const GET_URL_SECONDS = 3_600

function objectUrl(s3: S3Credentials, path: string): string {
  return `https://${s3.accountId}.r2.cloudflarestorage.com/${STORAGE_BUCKET}/${path}`
}

function signer(s3: S3Credentials): AwsClient {
  return new AwsClient({
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
    service: "s3",
    region: "auto",
  })
}

export async function presignPut(
  s3: S3Credentials,
  path: string,
  contentType: string,
  expiresSeconds: number = PUT_URL_SECONDS
): Promise<string> {
  const url = new URL(objectUrl(s3, path))
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds))
  const signed = await signer(s3).sign(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    aws: { signQuery: true },
  })
  return signed.url
}

/** URL baca berumur pendek. `downloadFilename` menambahkan
 *  `response-content-disposition` SEBELUM penandatanganan, jadi unduhannya
 *  memakai nama berkas ramah pengguna tanpa perlu URL tambahan di klien. */
export async function presignGet(
  s3: S3Credentials,
  path: string,
  options: { expiresSeconds?: number; downloadFilename?: string } = {}
): Promise<string> {
  const url = new URL(objectUrl(s3, path))
  if (options.downloadFilename !== undefined) {
    /* Nama berkas tidak boleh memutus kutipan di nilai header. */
    const filename = options.downloadFilename.replace(/"/g, "")
    url.searchParams.set(
      "response-content-disposition",
      `attachment; filename="${filename}"`
    )
  }
  url.searchParams.set("X-Amz-Expires", String(options.expiresSeconds ?? GET_URL_SECONDS))
  const signed = await signer(s3).sign(url.toString(), {
    method: "GET",
    aws: { signQuery: true },
  })
  return signed.url
}
