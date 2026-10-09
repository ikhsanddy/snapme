import type { SupabaseClient } from "@supabase/supabase-js"

import { isExpired } from "@/lib/expiry"
import {
  RELAY_SLOT_BYTE_LIMIT,
  RELAY_SLOT_MIME,
  STORAGE_BUCKET,
  stripStillPath,
} from "@/lib/schemas"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { verifyStoredFile } from "@/lib/supabase/storage"
import { RELAY_COLUMNS, relaySlotsOf, type RelayRow } from "@/lib/supabase/relays"
import { STRIP_COLUMNS, type StripRow } from "@/lib/supabase/strips"
import { hashToken, newDeleteToken, newStripId, verifyToken } from "@/lib/tokens"

/* M8 (SE-07): POST /api/relays/[id]/complete ditutup teman setelah semua slot
   terisi. Rutenya menuntaskan estafet, membuat baris strip yang menunjuk balik
   ke estafetnya (`relay_id`), dan menyerahkan satu URL unggah untuk PNG hasil
   hias. Selepas ini keduanya membaca halaman `/s/{id}` yang sama.

   Dua hal yang dijaga di sini:

   - Kemenangan hanya sekali. UPDATE-nya bersyarat `status = 'claimed'`, jadi
     dua penuntasan bersamaan tidak menghasilkan dua strip.
   - Semua berkas slot diperiksa sebelum menang. Bila slot teman belum
     terunggah (mis. sesinya pulih dari perangkat lain), jawabannya 422
     beserta URL unggah baru untuk slot yang kurang, supaya klien bisa
     mengunggah ulang dari foto yang ada di sesinya lalu mencoba sekali lagi.

   Rute ini idempoten: estafet yang sudah `complete` bisa dipanggil lagi, dan
   yang dijawab adalah strip yang sama, atau URL unggah baru bila stripnya
   masih draf. */

const UNAVAILABLE = { error: "Pembuatan link belum tersedia." }
const MISSING_TOKEN = { error: "Token estafet tidak ada." }
const WRONG_TOKEN = { error: "Token estafet tidak cocok." }
const NOT_FOUND = { error: "Estafet tidak ditemukan." }
const EXPIRED = { error: "Estafet ini sudah kedaluwarsa." }
const CANCELLED = { error: "Estafet ini sudah dibatalkan." }
const TAKEN = { error: "Estafet ini sudah diambil." }
const FILE_REJECTED = {
  error: "Berkas tidak lolos pemeriksaan. Isi ulang foto yang kurang.",
}
const FAILED = { error: "Estafet belum bisa diselesaikan. Coba lagi sebentar lagi." }

interface SlotUpload {
  index: number
  path: string
  token: string
}

/** Membuat baris strip draf untuk estafet ini dan URL unggah PNG-nya. */
async function createDraftStrip(
  admin: SupabaseClient,
  relayId: string,
  layout: string
) {
  const stripId = newStripId()
  const deleteToken = newDeleteToken()
  const stillPath = stripStillPath(stripId)
  const { error: insertError } = await admin.from("strips").insert({
    id: stripId,
    layout,
    still_path: stillPath,
    status: "draft",
    delete_token_hash: hashToken(deleteToken),
    relay_id: relayId,
    rate_key: "",
  })
  if (insertError !== null) {
    throw new Error(insertError.message)
  }
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(stillPath)
  if (error !== null || data === null) {
    throw new Error(error?.message ?? "URL unggah strip gagal dibuat.")
  }
  return {
    stripId,
    deleteToken,
    upload: { path: data.path, token: data.token },
  }
}

/** Token hapus baru untuk draf yang sudah ada; dipakai bila penuntasan
 *  sebelumnya terputus sebelum PNG-nya terunggah. */
async function reissueDraftStrip(
  admin: SupabaseClient,
  strip: StripRow
) {
  if (strip.still_path === null) {
    throw new Error("Draf strip estafet tidak punya path berkas.")
  }
  const deleteToken = newDeleteToken()
  const { error: updateError } = await admin
    .from("strips")
    .update({ delete_token_hash: hashToken(deleteToken) })
    .eq("id", strip.id)
  if (updateError !== null) {
    throw new Error(updateError.message)
  }
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(strip.still_path)
  if (error !== null || data === null) {
    throw new Error(error?.message ?? "URL unggah strip gagal dibuat.")
  }
  return {
    stripId: strip.id,
    deleteToken,
    upload: { path: data.path, token: data.token },
  }
}

/** Jawaban untuk estafet yang sudah `complete`: strip yang sama bila sudah
 *  selesai, URL unggah bila masih draf, atau draf baru bila stripnya sudah
 *  dihapus. */
async function completedResponse(admin: SupabaseClient, row: RelayRow) {
  const { data, error } = await admin
    .from("strips")
    .select(STRIP_COLUMNS)
    .eq("relay_id", row.id)
    .limit(1)
    .maybeSingle()
  if (error !== null) {
    throw new Error(error.message)
  }
  const strip = data as StripRow | null
  if (strip === null || strip.status === "deleted") {
    return Response.json(await createDraftStrip(admin, row.id, row.layout))
  }
  if (strip.status === "draft") {
    return Response.json(await reissueDraftStrip(admin, strip))
  }
  return Response.json({ stripId: strip.id, expiresAt: strip.expires_at })
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = getSupabaseAdmin()
  if (admin === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }
  const token = request.headers.get("x-relay-token")
  if (token === null || token === "") {
    return Response.json(MISSING_TOKEN, { status: 401 })
  }
  const { id } = await ctx.params

  try {
    const { data, error } = await admin
      .from("relays")
      .select(RELAY_COLUMNS)
      .eq("id", id)
      .maybeSingle()
    if (error !== null) {
      throw new Error(error.message)
    }
    const row = data as RelayRow | null
    if (row === null) {
      return Response.json(NOT_FOUND, { status: 404 })
    }
    const now = new Date()
    if (isExpired(row.expires_at, now)) {
      return Response.json(EXPIRED, { status: 410 })
    }
    if (row.status === "cancelled") {
      return Response.json(CANCELLED, { status: 410 })
    }
    if (row.status === "waiting") {
      return Response.json(TAKEN, { status: 409 })
    }
    if (row.guest_token_hash === null || !verifyToken(token, row.guest_token_hash)) {
      return Response.json(WRONG_TOKEN, { status: 401 })
    }
    if (row.status === "complete") {
      return await completedResponse(admin, row)
    }

    /* Status `claimed`: semua slot diperiksa. Slot pembuat tidak bisa diperbaiki
       dari sisi teman (kalau berkasnya hilang, estafetnya memang tidak utuh);
       slot teman yang kurang dikembalikan bersama URL unggah baru. */
    const missingGuest: SlotUpload[] = []
    let hostInvalid = false
    for (const slot of relaySlotsOf(row)) {
      const ok = await verifyStoredFile(
        admin,
        slot.path,
        RELAY_SLOT_BYTE_LIMIT,
        [RELAY_SLOT_MIME]
      )
      if (ok) {
        continue
      }
      if (slot.owner === "guest") {
        const { data: signed, error: signError } = await admin.storage
          .from(STORAGE_BUCKET)
          .createSignedUploadUrl(slot.path)
        if (signError !== null || signed === null) {
          throw new Error(signError?.message ?? "URL unggah slot gagal dibuat.")
        }
        missingGuest.push({
          index: slot.index,
          path: signed.path,
          token: signed.token,
        })
      } else {
        hostInvalid = true
      }
    }
    if (hostInvalid) {
      return Response.json(FILE_REJECTED, { status: 422 })
    }
    if (missingGuest.length > 0) {
      return Response.json(
        { ...FILE_REJECTED, uploads: missingGuest },
        { status: 422 }
      )
    }

    const { data: updated, error: updateError } = await admin
      .from("relays")
      .update({ status: "complete" })
      .eq("id", id)
      .eq("status", "claimed")
      .select("id")
    if (updateError !== null) {
      throw new Error(updateError.message)
    }
    if ((updated ?? []).length === 0) {
      /* Balapan: permintaan lain sudah menuntaskan estafet ini lebih dulu. */
      return Response.json(TAKEN, { status: 409 })
    }

    return Response.json(await createDraftStrip(admin, row.id, row.layout))
  } catch (error) {
    console.error("POST /api/relays/[id]/complete gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
