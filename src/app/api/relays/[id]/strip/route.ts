import { isExpired } from "@/lib/expiry"
import { STORAGE_BUCKET } from "@/lib/schemas"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { RELAY_COLUMNS, relaySlotsOf, type RelayRow } from "@/lib/supabase/relays"
import { STRIP_COLUMNS, type StripRow } from "@/lib/supabase/strips"
import { verifyToken } from "@/lib/tokens"

/* M8 (SE-07, SE-10): POST /api/relays/[id]/strip menyerahkan tautan strip dan
   URL baca foto slot HANYA kepada pemegang token pembuat atau tamu. Halaman
   /r/[id] sendiri tidak lagi mengirim data itu ke klien: token dikirim lewat
   header, jadi halaman GET tidak bisa memeriksanya, dan apa pun yang
   dirender server akan terbaca oleh siapa pun pemegang link estafet.

   Balasan: `{ stripId, expiresAt, role, slots }`. `stripId` null berarti
   estafetnya selesai tetapi stripnya sudah dihapus. */

const UNAVAILABLE = { error: "Pembuatan link belum tersedia." }
const MISSING_TOKEN = { error: "Token estafet tidak ada." }
const WRONG_TOKEN = { error: "Token estafet tidak cocok." }
const NOT_FOUND = { error: "Estafet tidak ditemukan." }
const EXPIRED = { error: "Estafet ini sudah kedaluwarsa." }
const CANCELLED = { error: "Estafet ini sudah dibatalkan." }
const NOT_COMPLETE = { error: "Estafet ini belum selesai." }
const FAILED = { error: "Status estafet belum bisa dibaca. Coba lagi sebentar lagi." }

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
    if (row.status !== "complete") {
      return Response.json(NOT_COMPLETE, { status: 409 })
    }

    const isHost = verifyToken(token, row.host_token_hash)
    const isGuest =
      row.guest_token_hash !== null && verifyToken(token, row.guest_token_hash)
    if (!isHost && !isGuest) {
      return Response.json(WRONG_TOKEN, { status: 401 })
    }

    /* Gerbang `strip_id` lebih dulu; `relay_id` hanya untuk baris lama yang
       belum punya gerbang. Draf yang kalah balapan (sisa yang belum sempat
       dibuang) tidak boleh membayangi strip pemenangnya (temuan tinjauan
       keamanan M9). */
    const stripColumn = row.strip_id === null ? "relay_id" : "id"
    const { data: stripData, error: stripError } = await admin
      .from("strips")
      .select(STRIP_COLUMNS)
      .eq(stripColumn, row.strip_id ?? row.id)
      .limit(1)
      .maybeSingle()
    if (stripError !== null) {
      throw new Error(stripError.message)
    }
    const strip = stripData as StripRow | null
    const ready = strip !== null && strip.status === "complete"

    const slots: { index: number; url: string }[] = []
    if (ready) {
      for (const slot of relaySlotsOf(row)) {
        const { data: url, error: signError } = await admin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(slot.path, 3_600)
        if (signError === null) {
          slots.push({ index: slot.index, url: url.signedUrl })
        }
      }
    }

    return Response.json({
      stripId: ready ? strip.id : null,
      expiresAt: ready ? strip.expires_at : null,
      role: isHost ? "host" : "guest",
      slots,
    })
  } catch (error) {
    console.error("POST /api/relays/[id]/strip gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
