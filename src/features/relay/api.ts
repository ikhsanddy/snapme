"use client"

import type { LayoutId } from "@/lib/layouts"
import { RELAY_SLOT_BYTE_LIMIT, RELAY_SLOT_MIME } from "@/lib/schemas"
import type { RelayRole } from "@/lib/relaySlots"
import { messageFrom, putToSignedUrl, type SignedUpload } from "@/lib/http"

/* M8 (SE-01 sampai SE-09): panggilan jaringan alur estafet. Hanya berkas ini
   yang berbicara dengan rute estafet dan bucket dari sisi klien, sama seperti
   features/share/api.ts untuk strip.

   Slot diunggah lewat URL presigned R2 (M10; badan berkas tidak melewati rute
   server). Unggahan slot teman diminta ulang saat penuntasan bila berkasnya
   belum ada: rute complete menjawab 422 beserta URL unggah untuk slot yang
   kurang, dan RelaySlotsNeededError membawa daftar itu ke pemanggil. */

interface RelaySlotUpload extends SignedUpload {
  index: number
}

interface CreatedRelay {
  id: string
  hostToken: string
  expiresAt: string | null
  uploads: RelaySlotUpload[]
}

interface ClaimedRelay {
  guestToken: string
  relay: {
    id: string
    layout: LayoutId
    expiresAt: string | null
    slots: { index: number; owner: RelayRole }[]
  }
}

export interface CompletedRelay {
  stripId: string
  /** Ada saat estafetnya baru dituntaskan atau drafnya diterbitkan ulang. */
  deleteToken?: string
  upload?: SignedUpload
  /** Ada saat strip estafetnya sudah selesai lebih dulu. */
  expiresAt?: string | null
}

const CREATE_FAILED = "Link estafet belum bisa dibuat. Coba lagi sebentar lagi."
const CLAIM_FAILED = "Giliran belum bisa diambil. Coba lagi sebentar lagi."
const COMPLETE_FAILED =
  "Estafet belum bisa diselesaikan. Coba lagi sebentar lagi."
const DELETE_FAILED = "Estafet belum bisa dihapus. Coba lagi sebentar lagi."

/** Slot teman belum lengkap di Storage: rute complete mengirim URL unggah
 *  pengganti bersama galatnya, dan pemanggil mengunggah dari foto yang ada di
 *  sesinya lalu mencoba sekali lagi. */
export class RelaySlotsNeededError extends Error {
  readonly uploads: RelaySlotUpload[]

  constructor(message: string, uploads: RelaySlotUpload[]) {
    super(message)
    this.name = "RelaySlotsNeededError"
    this.uploads = uploads
  }
}

export async function createRelay(layoutId: LayoutId): Promise<CreatedRelay> {
  const response = await fetch("/api/relays", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ layout: layoutId }),
  })
  if (!response.ok) {
    throw new Error(await messageFrom(response, CREATE_FAILED))
  }
  return (await response.json()) as CreatedRelay
}

export async function uploadRelaySlot(
  upload: SignedUpload,
  blob: Blob
): Promise<void> {
  /* Pra-cek klien: batas 1 MB rute tetap pagar sebenarnya, tapi berkas yang
     jelas terlalu besar tidak perlu dikirim. */
  if (blob.size > RELAY_SLOT_BYTE_LIMIT) {
    throw new Error("Fotonya terlalu besar. Ambil ulang fotonya.")
  }
  await putToSignedUrl(
    upload,
    blob,
    RELAY_SLOT_MIME,
    "Fotonya belum bisa diunggah. Coba lagi sebentar lagi."
  )
}

export async function claimRelay(id: string): Promise<ClaimedRelay> {
  const response = await fetch(`/api/relays/${id}/claim`, {
    method: "POST",
    /* Jenis isi JSON wajib: tanpanya rute menolak, supaya POST lintas situs
       tanpa preflight tidak bisa membakar giliran sekali pakai ini. */
    headers: { "content-type": "application/json" },
    body: "{}",
  })
  if (!response.ok) {
    throw new Error(await messageFrom(response, CLAIM_FAILED))
  }
  return (await response.json()) as ClaimedRelay
}

export async function completeRelay(
  id: string,
  token: string
): Promise<CompletedRelay> {
  const response = await fetch(`/api/relays/${id}/complete`, {
    method: "POST",
    headers: { "x-relay-token": token },
  })
  if (response.status === 422) {
    const body = (await response.json()) as {
      error?: unknown
      uploads?: RelaySlotUpload[]
    }
    throw new RelaySlotsNeededError(
      typeof body.error === "string" && body.error !== ""
        ? body.error
        : COMPLETE_FAILED,
      body.uploads ?? []
    )
  }
  if (!response.ok) {
    throw new Error(await messageFrom(response, COMPLETE_FAILED))
  }
  return (await response.json()) as CompletedRelay
}

/** M8 (SE-07, SE-10): status estafet yang sudah selesai, hanya untuk pemegang
 *  token. Halaman /r/[id] tidak mengirim tautan strip atau URL foto ke
 *  pengunjung; klien memintanya di sini setelah tokennya terbaca. */
export interface RelayStripInfo {
  stripId: string | null
  expiresAt: string | null
  role: RelayRole
  slots: { index: number; url: string }[]
}

export async function fetchRelayStrip(
  id: string,
  token: string
): Promise<RelayStripInfo> {
  const response = await fetch(`/api/relays/${id}/strip`, {
    method: "POST",
    headers: { "x-relay-token": token },
  })
  if (!response.ok) {
    throw new Error(await messageFrom(response, COMPLETE_FAILED))
  }
  return (await response.json()) as RelayStripInfo
}

export async function cancelRelay(id: string, token: string): Promise<void> {
  const response = await fetch(`/api/relays/${id}`, {
    method: "DELETE",
    headers: { "x-relay-token": token },
  })
  if (!response.ok) {
    throw new Error(await messageFrom(response, DELETE_FAILED))
  }
}

/** Foto sesi disimpan sebagai dataURL JPEG; Storage menerima Blob. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const meta = dataUrl.slice(0, dataUrl.indexOf(",") + 1)
  const mime = meta.slice(meta.indexOf(":") + 1, meta.indexOf(";"))
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mime === "" ? RELAY_SLOT_MIME : mime })
}
