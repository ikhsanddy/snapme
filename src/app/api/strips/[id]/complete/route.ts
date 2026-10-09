import { getBindings } from "@/lib/cloudflare"
import { selectStrip, updateStripComplete } from "@/lib/db/strips"
import { isExpired, stripExpiry } from "@/lib/expiry"
import { deleteObjects, verifyStoredFile } from "@/lib/r2/storage"
import {
  LIVE_BYTE_LIMIT,
  LIVE_MEDIA_TYPES,
  STILL_BYTE_LIMIT,
  STILL_MIME,
} from "@/lib/schemas"

/* ARCHITECTURE §7: POST /api/strips/[id]/complete memverifikasi berkas yang
   sudah diunggah lalu memasang `expires_at` 7 hari. Pemeriksaan ukuran dan
   jenis terjadi di sini karena URL unggah bertanda tangan tidak bisa membatasi
   isi berkas. Rute ini idempoten: panggilan kedua mengembalikan tanggal yang
   sama, bukan tanggal baru. */

const UNAVAILABLE = { error: "Pembuatan link belum tersedia." }
const NOT_FOUND = { error: "Strip tidak ditemukan." }
const EXPIRED = { error: "Strip ini sudah kedaluwarsa." }
const FILE_REJECTED = {
  error: "Berkas tidak lolos pemeriksaan. Buat ulang linknya.",
}
const FAILED = { error: "Strip belum bisa diselesaikan. Coba lagi sebentar lagi." }

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const bindings = getBindings()
  if (bindings === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }
  const { id } = await ctx.params

  try {
    const row = await selectStrip(bindings.db, id)
    if (row === null) {
      return Response.json(NOT_FOUND, { status: 404 })
    }

    const now = new Date()
    /* Kedaluwarsa diperiksa saat baca, jadi jawabannya 410 walau pembersih
       harian belum sempat berjalan (ARCHITECTURE §7). */
    if (isExpired(row.expires_at, now)) {
      return Response.json(EXPIRED, { status: 410 })
    }
    if (row.status === "complete") {
      return Response.json({ id, expiresAt: row.expires_at })
    }
    const stillPath = row.still_path
    if (
      stillPath === null ||
      !(await verifyStoredFile(bindings.bucket, stillPath, STILL_BYTE_LIMIT, [
        STILL_MIME,
      ]))
    ) {
      /* Berkas yang ditolak langsung dibuang supaya tidak menumpuk di bucket. */
      if (stillPath !== null) {
        await deleteObjects(bindings.bucket, [stillPath])
      }
      return Response.json(FILE_REJECTED, { status: 422 })
    }

    const expiresAt = stripExpiry(now).toISOString()

    /* M7: klip Strip Hidup adalah pelengkap best-effort. Berkas yang tidak ada
       (mis. rekaman gagal di browser pengguna) atau tidak lolos pemeriksaan
       dibuang dan `live_path` dikosongkan; strip diamnya tetap selesai. */
    let liveInvalid = false
    const livePath = row.live_path
    if (livePath !== null) {
      liveInvalid = !(await verifyStoredFile(
        bindings.bucket,
        livePath,
        LIVE_BYTE_LIMIT,
        Object.keys(LIVE_MEDIA_TYPES)
      ))
      if (liveInvalid) {
        try {
          await deleteObjects(bindings.bucket, [livePath])
        } catch (removeError) {
          console.error("Berkas klip gagal dibuang:", removeError)
        }
      }
    }

    await updateStripComplete(bindings.db, id, {
      expiresAt,
      clearLivePath: liveInvalid,
    })

    return Response.json({ id, expiresAt })
  } catch (error) {
    console.error("POST /api/strips/[id]/complete gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
