import { isExpired, stripExpiry } from "@/lib/expiry"
import {
  LIVE_BYTE_LIMIT,
  LIVE_MEDIA_TYPES,
  STILL_BYTE_LIMIT,
  STILL_MIME,
  STORAGE_BUCKET,
} from "@/lib/schemas"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { STRIP_COLUMNS, type StripRow } from "@/lib/supabase/strips"

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
  const admin = getSupabaseAdmin()
  if (admin === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
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
    if (row.still_path === null) {
      return Response.json(FILE_REJECTED, { status: 422 })
    }
    const stillPath = row.still_path

    const { data: signed, error: signError } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(stillPath, 60)
    if (signError !== null || signed === null) {
      return Response.json(FILE_REJECTED, { status: 422 })
    }

    const head = await fetch(signed.signedUrl, { method: "HEAD" })
    const byteLength = Number(head.headers.get("content-length") ?? "0")
    /* Jenis persis, bukan awalan: "image/pngx" juga diawali "image/png". */
    const mediaType = (head.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase()
    if (
      !head.ok ||
      !Number.isFinite(byteLength) ||
      byteLength <= 0 ||
      byteLength > STILL_BYTE_LIMIT ||
      mediaType !== STILL_MIME
    ) {
      /* Berkas yang ditolak langsung dibuang supaya tidak menumpuk di Storage;
         batas ukuran dan jenis juga ditegakkan bucket (migrasi M6). */
      await admin.storage.from(STORAGE_BUCKET).remove([stillPath])
      return Response.json(FILE_REJECTED, { status: 422 })
    }

    const expiresAt = stripExpiry(now).toISOString()

    /* M7: klip Strip Hidup adalah pelengkap best-effort. Berkas yang tidak ada
       (mis. rekaman gagal di browser pengguna) atau tidak lolos pemeriksaan
       dibuang dan `live_path` dikosongkan; strip diamnya tetap selesai. */
    let liveInvalid = false
    const livePath = row.live_path
    if (livePath !== null) {
      const { data: liveSigned, error: liveSignError } = await admin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(livePath, 60)
      if (liveSignError !== null || liveSigned === null) {
        liveInvalid = true
      } else {
        const liveHead = await fetch(liveSigned.signedUrl, { method: "HEAD" })
        const liveBytes = Number(liveHead.headers.get("content-length") ?? "0")
        const liveType = (liveHead.headers.get("content-type") ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase()
        liveInvalid = !(
          liveHead.ok &&
          Number.isFinite(liveBytes) &&
          liveBytes > 0 &&
          liveBytes <= LIVE_BYTE_LIMIT &&
          LIVE_MEDIA_TYPES[liveType] === true
        )
      }
      if (liveInvalid) {
        try {
          await admin.storage.from(STORAGE_BUCKET).remove([livePath])
        } catch (removeError) {
          console.error("Berkas klip gagal dibuang:", removeError)
        }
      }
    }

    const { error: updateError } = await admin
      .from("strips")
      .update({
        status: "complete",
        expires_at: expiresAt,
        ...(liveInvalid ? { live_path: null } : {}),
      })
      .eq("id", id)
    if (updateError !== null) {
      throw new Error(updateError.message)
    }

    return Response.json({ id, expiresAt })
  } catch (error) {
    console.error("POST /api/strips/[id]/complete gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
