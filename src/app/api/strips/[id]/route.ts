import { deletedGraceExpiry, isExpired } from "@/lib/expiry"
import { STORAGE_BUCKET } from "@/lib/schemas"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { STRIP_COLUMNS, type StripRow } from "@/lib/supabase/strips"
import { verifyToken } from "@/lib/tokens"

/* ARCHITECTURE §7: DELETE /api/strips/[id] menghapus berkas lalu barisnya.
   Token hapus datang lewat header dan hanya hash-nya ada di basis data
   (ARCHITECTURE §8), jadi token yang bocor dari perangkat pengguna tidak bisa
   dibaca ulang dari server. */

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
  const admin = getSupabaseAdmin()
  if (admin === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }

  const token = request.headers.get("x-delete-token")
  if (token === null || token === "") {
    return Response.json(MISSING_TOKEN, { status: 401 })
  }
  const { id } = await ctx.params

  try {
    const { data, error } = await admin
      .from("strips")
      .select(STRIP_COLUMNS)
      .eq("id", id)
      .maybeSingle()
    if (error !== null) {
      throw new Error(error.message)
    }
    const row = data as StripRow | null
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

    const paths = [row.still_path, row.live_path].filter(
      (path): path is string => path !== null
    )
    if (paths.length > 0) {
      const { error: removeError } = await admin.storage
        .from(STORAGE_BUCKET)
        .remove(paths)
      if (removeError !== null) {
        throw new Error(removeError.message)
      }
    }

    /* Berkasnya hilang sekarang, barisnya tidak: URL unggah bertanda tangan
       berlaku sekitar 2 jam dan Storage tidak melihat tabel ini, jadi berkas
       bisa muncul kembali setelah penghapusan. Baris `deleted` menjaga path-nya
       tetap diketahui pembersih sampai token itu kedaluwarsa, dan sekaligus
       menjaga kuota pembatasan laju tidak bisa dikembalikan dengan menghapus
       baris. Halaman /s/[id] hanya menerima status `complete`, jadi strip yang
       dihapus langsung menjawab 404. */
    const { error: updateError } = await admin
      .from("strips")
      .update({
        status: "deleted",
        expires_at: deletedGraceExpiry(now).toISOString(),
      })
      .eq("id", id)
    if (updateError !== null) {
      throw new Error(updateError.message)
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("DELETE /api/strips/[id] gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
