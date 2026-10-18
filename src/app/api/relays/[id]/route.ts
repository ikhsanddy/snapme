import { getBindings } from "@/server/cloudflare"
import { cancelRelay, selectRelay } from "@/server/db/relays"
import { relaySlotsOf } from "@/server/db/rows"
import { markStripDeleted, selectStripForRelay } from "@/server/db/strips"
import { deletedGraceExpiry, isExpired } from "@/server/expiry"
import { deleteObjects } from "@/server/r2/storage"
import { verifyToken } from "@/server/tokens"

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
  const bindings = getBindings()
  if (bindings === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }
  const token = request.headers.get("x-relay-token")
  if (token === null || token === "") {
    return Response.json(MISSING_TOKEN, { status: 401 })
  }
  const { id } = await ctx.params

  try {
    const row = await selectRelay(bindings.db, id)
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

    const paths: string[] = relaySlotsOf(row).map((slot) => slot.path)

    /* Gerbang `strip_id` lebih dulu supaya penghapusan tidak menyasar draf
       sisa yang bukan milik estafet ini; `relay_id` hanya untuk baris lama
       (temuan tinjauan keamanan M9). */
    const strip = await selectStripForRelay(bindings.db, row)
    let stripId: string | null = null
    if (strip !== null && strip.status !== "deleted") {
      stripId = strip.id
      if (strip.still_path !== null) {
        paths.push(strip.still_path)
      }
      if (strip.live_path !== null) {
        paths.push(strip.live_path)
      }
    }

    await deleteObjects(bindings.bucket, paths)

    /* Stripnya ikut jadi batu nisan: halaman /s/[id] hanya menerima status
       `complete`, jadi linknya langsung berhenti bekerja sementara pembersih
       tetap tahu path berkas yang mungkin diunggah setelah penghapusan. */
    if (stripId !== null) {
      await markStripDeleted(
        bindings.db,
        stripId,
        deletedGraceExpiry(now).toISOString()
      )
    }

    await cancelRelay(bindings.db, id, deletedGraceExpiry(now).toISOString())

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("DELETE /api/relays/[id] gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
