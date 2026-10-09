import { getBindings } from "@/lib/cloudflare"
import { selectRelay } from "@/lib/db/relays"
import { relaySlotsOf } from "@/lib/db/rows"
import { selectStripForRelay } from "@/lib/db/strips"
import { isExpired } from "@/lib/expiry"
import { presignGet } from "@/lib/r2/presign"
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
    const strip = await selectStripForRelay(bindings.db, row)
    const ready = strip !== null && strip.status === "complete"

    const slots: { index: number; url: string }[] = []
    if (ready) {
      for (const slot of relaySlotsOf(row)) {
        try {
          slots.push({
            index: slot.index,
            url: await presignGet(bindings.s3, slot.path),
          })
        } catch {
          /* Satu tautan gagal tidak menjatuhkan daftarnya. */
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
