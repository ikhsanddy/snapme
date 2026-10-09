import { getBindings } from "@/lib/cloudflare"
import { markStripDeleted, selectStrip } from "@/lib/db/strips"
import { deletedGraceExpiry, isExpired } from "@/lib/expiry"
import { deleteObjects } from "@/lib/r2/storage"
import { verifyToken } from "@/lib/tokens"

/* ARCHITECTURE §7: DELETE /api/strips/[id] menghapus berkas lalu menandai
   barisnya. Token hapus datang lewat header dan hanya hash-nya ada di basis
   data (ARCHITECTURE §8), jadi token yang bocor dari perangkat pengguna tidak
   bisa dibaca ulang dari server. */

const UNAVAILABLE = { error: "Penghapusan link belum tersedia." }
const MISSING_TOKEN = { error: "Token hapus tidak ada." }
const WRONG_TOKEN = { error: "Token hapus tidak cocok." }
const NOT_FOUND = { error: "Strip tidak ditemukan." }
const EXPIRED = { error: "Strip ini sudah kedaluwarsa." }
const FAILED = { error: "Strip belum bisa dihapus. Coba lagi sebentar lagi." }

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const bindings = getBindings()
  if (bindings === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }

  const token = request.headers.get("x-delete-token")
  if (token === null || token === "") {
    return Response.json(MISSING_TOKEN, { status: 401 })
  }
  const { id } = await ctx.params

  try {
    const row = await selectStrip(bindings.db, id)
    if (row === null || row.status === "deleted") {
      return Response.json(NOT_FOUND, { status: 404 })
    }
    const now = new Date()
    if (isExpired(row.expires_at, now)) {
      return Response.json(EXPIRED, { status: 410 })
    }
    if (!verifyToken(token, row.delete_token_hash)) {
      return Response.json(WRONG_TOKEN, { status: 401 })
    }

    await deleteObjects(
      bindings.bucket,
      [row.still_path, row.live_path].filter(
        (path): path is string => path !== null
      )
    )

    /* Berkasnya hilang sekarang, barisnya tidak: URL unggah bertanda tangan
       masih berlaku setelah ini dan bucket tidak melihat tabel ini, jadi berkas
       bisa muncul kembali setelah penghapusan. Baris `deleted` menjaga path-nya
       tetap diketahui pembersih sampai token itu kedaluwarsa, dan sekaligus
       menjaga kuota pembatasan laju tidak bisa dikembalikan dengan menghapus
       baris. Halaman /s/[id] hanya menerima status `complete`, jadi strip yang
       dihapus langsung menjawab 404. */
    await markStripDeleted(bindings.db, id, deletedGraceExpiry(now).toISOString())

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("DELETE /api/strips/[id] gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
