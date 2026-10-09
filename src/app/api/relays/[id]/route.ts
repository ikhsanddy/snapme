import { deletedGraceExpiry, isExpired } from "@/lib/expiry"
import { STORAGE_BUCKET } from "@/lib/schemas"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { RELAY_COLUMNS, relaySlotsOf, type RelayRow } from "@/lib/supabase/relays"
import { STRIP_COLUMNS, type StripRow } from "@/lib/supabase/strips"
import { verifyToken } from "@/lib/tokens"

/* M8 (SE-09): DELETE /api/relays/[id] membatalkan estafet dan menghapus
   berkasnya. Satu permintaan menghapus semuanya: berkas slot, strip hasilnya
   (bila sudah ada), lalu barisnya ditandai `cancelled` dengan masa tenggang
   yang sama dengan batu nisan strip, supaya berkas yang diunggah setelah
   pembatalan tetap diketahui pembersih.

   Token pembuat datang lewat header dan hanya hash-nya ada di basis data. */

const UNAVAILABLE = { error: "Penghapusan link belum tersedia." }
const MISSING_TOKEN = { error: "Token estafet tidak ada." }
const WRONG_TOKEN = { error: "Token estafet tidak cocok." }
const NOT_FOUND = { error: "Estafet tidak ditemukan." }
const EXPIRED = { error: "Estafet ini sudah kedaluwarsa." }
const FAILED = { error: "Estafet belum bisa dihapus. Coba lagi sebentar lagi." }

export async function DELETE(
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
    if (!verifyToken(token, row.host_token_hash)) {
      return Response.json(WRONG_TOKEN, { status: 401 })
    }
    /* Sudah dibatalkan: permintaan kedua tidak perlu mengulang penghapusan
       berkas, dan jawabannya tetap 204. */
    if (row.status === "cancelled") {
      return new Response(null, { status: 204 })
    }

    const paths: (string | null)[] = relaySlotsOf(row).map((slot) => slot.path)

    /* Gerbang `strip_id` lebih dulu supaya penghapusan tidak menyasar draf
       sisa yang bukan milik estafet ini; `relay_id` hanya untuk baris lama
       (temuan tinjauan keamanan M9). */
    const stripColumn = row.strip_id === null ? "relay_id" : "id"
    const { data: stripData, error: stripError } = await admin
      .from("strips")
      .select(STRIP_COLUMNS)
      .eq(stripColumn, row.strip_id ?? id)
      .limit(1)
      .maybeSingle()
    if (stripError !== null) {
      throw new Error(stripError.message)
    }
    const strip = stripData as StripRow | null
    let stripId: string | null = null
    if (strip !== null && strip.status !== "deleted") {
      stripId = strip.id
      paths.push(strip.still_path, strip.live_path)
    }

    const existing = paths.filter((path): path is string => path !== null)
    if (existing.length > 0) {
      const { error: removeError } = await admin.storage
        .from(STORAGE_BUCKET)
        .remove(existing)
      if (removeError !== null) {
        throw new Error(removeError.message)
      }
    }

    /* Stripnya ikut jadi batu nisan: halaman /s/[id] hanya menerima status
       `complete`, jadi linknya langsung berhenti bekerja sementara pembersih
       tetap tahu path berkas yang mungkin diunggah setelah penghapusan. */
    if (stripId !== null) {
      const { error: tombstoneError } = await admin
        .from("strips")
        .update({
          status: "deleted",
          expires_at: deletedGraceExpiry(now).toISOString(),
        })
        .eq("id", stripId)
      if (tombstoneError !== null) {
        throw new Error(tombstoneError.message)
      }
    }

    const { error: updateError } = await admin
      .from("relays")
      .update({
        status: "cancelled",
        expires_at: deletedGraceExpiry(now).toISOString(),
      })
      .eq("id", id)
    if (updateError !== null) {
      throw new Error(updateError.message)
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("DELETE /api/relays/[id] gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
