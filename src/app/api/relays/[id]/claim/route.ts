import { getBindings } from "@/server/cloudflare"
import { claimRelayOnce, selectRelay } from "@/server/db/relays"
import { relaySlotsOf } from "@/server/db/rows"
import { isExpired } from "@/server/expiry"
import { deleteObjects, verifyStoredFile } from "@/server/r2/storage"
import { RELAY_SLOT_BYTE_LIMIT, RELAY_SLOT_MIME } from "@/lib/schemas"
import { hashToken, newDeleteToken } from "@/server/tokens"

/* M8 (SE-06): POST /api/relays/[id]/claim mengambil giliran mengisi slot
   teman. Sekali saja, dijamin basis data bukan klien: UPDATE-nya bersyarat
   `status = 'waiting'`, jadi dua permintaan yang datang bersamaan hanya satu
   yang mengubah baris; yang kalah melihat nol baris dan dijawab 409.

   Sebelum giliran diberikan, berkas slot pembuat diperiksa: teman hanya bisa
   melanjutkan kalau foto yang sudah ada benar-benar ada di bucket. Berkas yang
   tidak lolos dibuang supaya tidak menumpuk. */

const UNAVAILABLE = { error: "Pembuatan link belum tersedia." }
const INVALID = { error: "Permintaan tidak valid." }
const NOT_FOUND = { error: "Estafet tidak ditemukan." }
const EXPIRED = { error: "Estafet ini sudah kedaluwarsa." }
const CANCELLED = { error: "Estafet ini sudah dibatalkan." }
const TAKEN = { error: "Estafet ini sudah diambil." }
const HOST_INCOMPLETE = {
  error: "Foto pembuat belum selesai diunggah. Coba lagi sebentar.",
}
const FAILED = { error: "Giliran belum bisa diambil. Coba lagi sebentar lagi." }

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const bindings = getBindings()
  if (bindings === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }
  /* Tanpa jenis isi JSON, halaman pihak ketiga bisa mengirim POST sederhana
     (form atau fetch `no-cors`) dan membakar giliran sekali pakai ini; klien
     resmi mengirim body JSON kosong. Sama seperti gate POST /api/relays. */
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return Response.json(INVALID, { status: 400 })
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
    if (row.status !== "waiting") {
      return Response.json(TAKEN, { status: 409 })
    }

    const invalid: string[] = []
    for (const slot of relaySlotsOf(row)) {
      if (slot.owner !== "host") {
        continue
      }
      const ok = await verifyStoredFile(
        bindings.bucket,
        slot.path,
        RELAY_SLOT_BYTE_LIMIT,
        [RELAY_SLOT_MIME]
      )
      if (!ok) {
        invalid.push(slot.path)
      }
    }
    if (invalid.length > 0) {
      await deleteObjects(bindings.bucket, invalid)
      return Response.json(HOST_INCOMPLETE, { status: 422 })
    }

    const guestToken = newDeleteToken()
    const claimed = await claimRelayOnce(
      bindings.db,
      id,
      hashToken(guestToken)
    )
    if (!claimed) {
      /* Balapan: permintaan lain sudah mengubah baris ini lebih dulu. */
      return Response.json(TAKEN, { status: 409 })
    }

    return Response.json({
      guestToken,
      relay: {
        id: row.id,
        layout: row.layout,
        expiresAt: row.expires_at,
        slots: relaySlotsOf(row).map((slot) => ({
          index: slot.index,
          owner: slot.owner,
        })),
      },
    })
  } catch (error) {
    console.error("POST /api/relays/[id]/claim gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
