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
   masih draf.

   Jalur pemulihan yang terakhir itu bisa dimasuki dua permintaan sekaligus,
   jadi ia dijaga gerbang pemenang tunggal (M9): draf baru hanya dipakai
   setelah UPDATE bersyarat `relays.strip_id is null` berhasil, dan yang kalah
   membuang draf yatimnya. Dengan begitu satu estafet tidak pernah punya dua
   baris strip. */

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

/** Baris strip yang menunjuk balik ke estafet ini. */
async function findRelayStrip(admin: SupabaseClient, relayId: string) {
  const { data, error } = await admin
    .from("strips")
    .select(STRIP_COLUMNS)
    .eq("relay_id", relayId)
    .limit(1)
    .maybeSingle()
  if (error !== null) {
    throw new Error(error.message)
  }
  return data as StripRow | null
}

/** Jeda singkat antar-percobaan pembacaan baris strip pemenang. */
function pauseBeforeReread(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, 15)
  return promise
}

/** Baris strip pemenang gerbang `relays.strip_id`. `strip` null berarti
 *  kolomnya menunjuk strip yang barisnya tidak ada (sudah dihapus pembersih
 *  atau belum sempat terlihat).
 *
 *  Pemenang menulis gerbangnya sebelum baris stripnya terbaca, jadi baris yang
 *  belum ada dibaca ulang beberapa kali dulu: pembacaan yang terlalu cepat
 *  tidak boleh disalahartikan sebagai strip yang hilang, karena gerbang yang
 *  dibuka keliru bisa melahirkan pemenang kedua. */
async function claimedStrip(admin: SupabaseClient, relayId: string) {
  const { data, error } = await admin
    .from("relays")
    .select("strip_id")
    .eq("id", relayId)
    .maybeSingle()
  if (error !== null) {
    throw new Error(error.message)
  }
  const stripId = (data as { strip_id: string | null } | null)?.strip_id ?? null
  if (stripId === null) {
    return null
  }
  for (let percobaan = 0; percobaan < 4; percobaan += 1) {
    const { data: stripData, error: stripError } = await admin
      .from("strips")
      .select(STRIP_COLUMNS)
      .eq("id", stripId)
      .maybeSingle()
    if (stripError !== null) {
      throw new Error(stripError.message)
    }
    if (stripData !== null) {
      return { id: stripId, strip: stripData as StripRow }
    }
    await pauseBeforeReread()
  }
  return { id: stripId, strip: null }
}

/** Merekam pemenang: hanya berhasil bila `strip_id` masih kosong. */
async function claimRelayStrip(
  admin: SupabaseClient,
  relayId: string,
  stripId: string
) {
  const { data, error } = await admin
    .from("relays")
    .update({ strip_id: stripId })
    .eq("id", relayId)
    .is("strip_id", null)
    .select("id")
  if (error !== null) {
    throw new Error(error.message)
  }
  return (data ?? []).length > 0
}

/** Membuka gerbang bila strip pemenangnya sudah tidak ada, supaya draf
 *  berikutnya bisa mengisi kolom yang sama. */
async function releaseRelayStrip(
  admin: SupabaseClient,
  relayId: string,
  stripId: string
) {
  const { error } = await admin
    .from("relays")
    .update({ strip_id: null })
    .eq("id", relayId)
    .eq("strip_id", stripId)
  if (error !== null) {
    throw new Error(error.message)
  }
}

/** Membuang draf yang kalah balapan. Barisnya saja: URL unggahnya baru dibuat
 *  dan tidak pernah dipakai klien, jadi belum ada berkas yang bisa yatim.
 *  Kegagalannya tidak menjatuhkan jawaban, karena pemenangnya sudah punya draf
 *  yang sah; sisa baris yatim paling lama dibersihkan pembersih draf basi. */
async function dropDraftStrip(admin: SupabaseClient, stripId: string) {
  try {
    const { error } = await admin
      .from("strips")
      .delete()
      .eq("id", stripId)
      .eq("status", "draft")
    if (error !== null) {
      throw new Error(error.message)
    }
  } catch (error) {
    console.error("Draf strip estafet yang kalah balapan gagal dibuang:", error)
  }
}

/** Jawaban untuk strip estafet yang sudah ada: draf diterbitkan ulang
 *  unggahannya, yang sudah selesai dijawab apa adanya. */
async function existingStripResponse(admin: SupabaseClient, strip: StripRow) {
  if (strip.status === "complete") {
    return Response.json({ stripId: strip.id, expiresAt: strip.expires_at })
  }
  return Response.json(await reissueDraftStrip(admin, strip))
}

/** Jawaban untuk estafet yang sudah `complete`: strip yang sama bila sudah
 *  selesai, URL unggah bila masih draf, atau draf baru bila stripnya sudah
 *  dihapus.
 *
 *  Jalur "stripnya sudah dihapus" bisa dimasuki dua permintaan sekaligus
 *  (mis. pemulihan dari dua tab), jadi draf barunya dijaga gerbang
 *  `relays.strip_id`: pembuat draf harus memenangkan UPDATE bersyarat
 *  `strip_id is null` sebelum drafnya dipakai. Yang kalah membuang draf
 *  yatimnya lalu memakai draf pemenang.
 *
 *  Gerbangnya dibaca lebih dulu daripada pencarian lewat `relay_id`, supaya
 *  draf yang kalah balapan tidak pernah bisa diserahkan ke klien lain
 *  (temuan tinjauan keamanan M9): `relay_id` hanya dipakai untuk baris lama
 *  yang belum punya gerbang. Untuk alasan yang sama, satu estafet bisa punya
 *  lebih dari satu baris strip kalau baris lamanya adalah batu nisan
 *  penghapusan; yang dijaga di sini adalah satu strip AKTIF per estafet. */
async function completedResponse(admin: SupabaseClient, row: RelayRow) {
  /* Tiga putaran: balapan biasa selesai di putaran kedua. Putaran ketiga hanya
     terpakai bila strip pemenang dihapus di antara dua permintaan. */
  for (let putaran = 0; putaran < 3; putaran += 1) {
    const winner = await claimedStrip(admin, row.id)
    if (winner !== null) {
      if (winner.strip !== null && winner.strip.status !== "deleted") {
        return await existingStripResponse(admin, winner.strip)
      }
      await releaseRelayStrip(admin, row.id, winner.id)
      continue
    }

    /* Tanpa pemenang di gerbang: baris lama dari sebelum migrasi (atau sisa
       yang gerbangnya sudah dibuka) boleh dipakai apa adanya. */
    const legacy = await findRelayStrip(admin, row.id)
    if (legacy !== null && legacy.status !== "deleted") {
      return await existingStripResponse(admin, legacy)
    }

    const draft = await createDraftStrip(admin, row.id, row.layout)
    if (await claimRelayStrip(admin, row.id, draft.stripId)) {
      return Response.json(draft)
    }
    await dropDraftStrip(admin, draft.stripId)
  }
  throw new Error("Klaim strip estafet tidak menemukan pemenang.")
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

    /* Draf stripnya dibuat lewat jalur yang sama dengan pemulihan: gerbang
       `relays.strip_id` berlaku untuk keduanya, jadi penuntasan dan pemulihan
       yang berbarengan tetap hanya menghasilkan satu draf. */
    return await completedResponse(admin, row)
  } catch (error) {
    console.error("POST /api/relays/[id]/complete gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
