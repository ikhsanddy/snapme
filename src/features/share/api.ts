"use client"

import type { LayoutId } from "@/lib/layouts"
import { LIVE_MIME_TYPES, STILL_MIME, type LiveKind } from "@/lib/schemas"

/* M6 (SH-04, SH-06): panggilan jaringan alur bagikan. Hanya berkas ini yang
   berbicara dengan rute server dan bucket dari sisi klien.

   Unggahan tidak lewat rute server (ARCHITECTURE §7): badannya lumayan besar
   dan fungsi serverless punya batas ukuran isi permintaan. Klien mengunggah
   langsung ke R2 lewat URL presigned (M10), lalu rute complete yang memeriksa
   hasilnya. Jenis isi ikut ditandatangani di URL, jadi header PUT-nya wajib
   sama dengan yang dipakai server saat menandatangani. */

export interface StripUpload {
  path: string
  url: string
}

export interface CreatedStrip {
  id: string
  deleteToken: string
  upload: StripUpload
  /** M7: ada bila klip Strip Hidup ikut diminta; unggahannya best-effort. */
  liveUpload?: StripUpload
}

const CREATE_FAILED = "Link belum bisa dibuat. Coba lagi sebentar lagi."
const COMPLETE_FAILED = "Strip belum bisa diselesaikan. Coba lagi sebentar lagi."
const DELETE_FAILED = "Strip belum bisa dihapus. Coba lagi sebentar lagi."

/** Pesan dari server sudah berbahasa Indonesia (DESIGN-SYSTEM §12); pesan
 *  cadangan dipakai bila badan responsnya bukan JSON yang diharapkan. */
async function messageFrom(response: Response, fallback: string): Promise<string> {
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

async function uploadToSignedUrl(upload: StripUpload, blob: Blob, contentType: string): Promise<void> {
  const response = await fetch(upload.url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  })
  if (!response.ok) {
    throw new Error(UPLOAD_FAILED)
  }
}

export async function uploadStripStill(
  upload: StripUpload,
  blob: Blob
): Promise<void> {
  await uploadToSignedUrl(upload, blob, STILL_MIME)
}

/** M7 (SH-03): klip Strip Hidup memakai jalur unggah yang sama; kegagalannya
 *  tidak pernah menghalangi strip diam. */
export async function uploadStripLive(
  upload: StripUpload,
  blob: Blob,
  kind: LiveKind
): Promise<void> {
  await uploadToSignedUrl(upload, blob, LIVE_MIME_TYPES[kind])
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
