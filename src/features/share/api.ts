"use client"

import type { LayoutId } from "@/lib/layouts"
import { LIVE_MIME_TYPES, STILL_MIME, type LiveKind } from "@/lib/schemas"
import { messageFrom, putToSignedUrl, type SignedUpload } from "@/lib/http"

/* M6 (SH-04, SH-06): panggilan jaringan alur bagikan. Hanya berkas ini yang
   berbicara dengan rute server dan bucket dari sisi klien.

   Unggahan tidak lewat rute server (ARCHITECTURE §7): badannya lumayan besar
   dan fungsi serverless punya batas ukuran isi permintaan. Klien mengunggah
   langsung ke R2 lewat URL presigned (M10), lalu rute complete yang memeriksa
   hasilnya. Jenis isi ikut ditandatangani di URL, jadi header PUT-nya wajib
   sama dengan yang dipakai server saat menandatangani. */

interface CreatedStrip {
  id: string
  deleteToken: string
  upload: SignedUpload
  /** M7: ada bila klip Strip Hidup ikut diminta; unggahannya best-effort. */
  liveUpload?: SignedUpload
}

const CREATE_FAILED = "Link belum bisa dibuat. Coba lagi sebentar lagi."
const COMPLETE_FAILED = "Strip belum bisa diselesaikan. Coba lagi sebentar lagi."
const DELETE_FAILED = "Strip belum bisa dihapus. Coba lagi sebentar lagi."

export async function requestStrip(
  layoutId: LayoutId,
  live?: LiveKind
): Promise<CreatedStrip> {
  const response = await fetch("/api/strips", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(live === undefined ? { layout: layoutId } : { layout: layoutId, live }),
  })
  if (!response.ok) {
    throw new Error(await messageFrom(response, CREATE_FAILED))
  }
  return (await response.json()) as CreatedStrip
}

const UPLOAD_FAILED = "Fotonya belum bisa diunggah. Coba lagi sebentar lagi."

export async function uploadStripStill(
  upload: SignedUpload,
  blob: Blob
): Promise<void> {
  await putToSignedUrl(upload, blob, STILL_MIME, UPLOAD_FAILED)
}

/** M7 (SH-03): klip Strip Hidup memakai jalur unggah yang sama; kegagalannya
 *  tidak pernah menghalangi strip diam. */
export async function uploadStripLive(
  upload: SignedUpload,
  blob: Blob,
  kind: LiveKind
): Promise<void> {
  await putToSignedUrl(upload, blob, LIVE_MIME_TYPES[kind], UPLOAD_FAILED)
}

export async function completeStrip(id: string): Promise<{ expiresAt: string | null }> {
  const response = await fetch(`/api/strips/${id}/complete`, { method: "POST" })
  if (!response.ok) {
    throw new Error(await messageFrom(response, COMPLETE_FAILED))
  }
  return (await response.json()) as { expiresAt: string | null }
}

export async function deleteStrip(id: string, token: string): Promise<void> {
  const response = await fetch(`/api/strips/${id}`, {
    method: "DELETE",
    headers: { "x-delete-token": token },
  })
  if (!response.ok) {
    throw new Error(await messageFrom(response, DELETE_FAILED))
  }
}
