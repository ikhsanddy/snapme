"use client"

import { StorageClient } from "@supabase/storage-js"

import type { LayoutId } from "@/lib/layouts"
import { STILL_MIME, STORAGE_BUCKET } from "@/lib/schemas"

/* M6 (SH-04, SH-06): panggilan jaringan alur bagikan. Hanya berkas ini yang
   berbicara dengan rute server dan Storage dari sisi klien.

   Unggahan tidak lewat rute server (ARCHITECTURE §7): badannya lumayan besar
   dan fungsi serverless punya batas ukuran isi permintaan. Klien mengunggah
   langsung ke Storage memakai URL bertanda tangan, lalu rute complete yang
   memeriksa hasilnya. */

export interface StripUpload {
  path: string
  token: string
}

export interface CreatedStrip {
  id: string
  deleteToken: string
  upload: StripUpload
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

export async function requestStrip(layoutId: LayoutId): Promise<CreatedStrip> {
  const response = await fetch("/api/strips", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ layout: layoutId }),
  })
  if (!response.ok) {
    throw new Error(await messageFrom(response, CREATE_FAILED))
  }
  return (await response.json()) as CreatedStrip
}

export async function uploadStripStill(
  upload: StripUpload,
  blob: Blob
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (url === undefined || url === "") {
    throw new Error(CREATE_FAILED)
  }
  const client = new StorageClient(`${url}/storage/v1`)
  const { error } = await client
    .from(STORAGE_BUCKET)
    .uploadToSignedUrl(upload.path, upload.token, blob, {
      contentType: STILL_MIME,
    })
  if (error !== null) {
    throw new Error(error.message)
  }
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
