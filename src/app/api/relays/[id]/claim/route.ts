import { isExpired } from "@/lib/expiry"
import { RELAY_SLOT_BYTE_LIMIT, RELAY_SLOT_MIME, STORAGE_BUCKET } from "@/lib/schemas"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { verifyStoredFile } from "@/lib/supabase/storage"
import { RELAY_COLUMNS, relaySlotsOf, type RelayRow } from "@/lib/supabase/relays"
import { hashToken, newDeleteToken } from "@/lib/tokens"

/* M8 (SE-06): POST /api/relays/[id]/claim mengambil giliran mengisi slot
   teman. Sekali saja, dijamin basis data bukan klien: UPDATE-nya bersyarat
   `status = 'waiting'`, jadi dua permintaan yang datang bersamaan hanya satu
   yang mengubah baris; yang kalah melihat nol baris dan dijawab 409.

   Sebelum giliran diberikan, berkas slot pembuat diperiksa: teman hanya bisa
   melanjutkan kalau foto yang sudah ada benar-benar ada di Storage. Berkas yang
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
  const admin = getSupabaseAdmin()
  if (admin === null) {
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
    if (row.status !== "waiting") {
      return Response.json(TAKEN, { status: 409 })
    }

    const invalid: string[] = []
    for (const slot of relaySlotsOf(row)) {
      if (slot.owner !== "host") {
        continue
      }
      const ok = await verifyStoredFile(
        admin,
        slot.path,
        RELAY_SLOT_BYTE_LIMIT,
        [RELAY_SLOT_MIME]
      )
      if (!ok) {
        invalid.push(slot.path)
      }
    }
    if (invalid.length > 0) {
      await admin.storage.from(STORAGE_BUCKET).remove(invalid)
      return Response.json(HOST_INCOMPLETE, { status: 422 })
    }

    const guestToken = newDeleteToken()
    const { data: updated, error: updateError } = await admin
      .from("relays")
      .update({ status: "claimed", guest_token_hash: hashToken(guestToken) })
      .eq("id", id)
      .eq("status", "waiting")
      .select("id")
    if (updateError !== null) {
      throw new Error(updateError.message)
    }
    if ((updated ?? []).length === 0) {
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
