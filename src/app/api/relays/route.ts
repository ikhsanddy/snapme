import {
  clientKeyFromRequest,
  countRecentCreations,
  CREATE_LIMIT,
  rateKeyFor,
} from "@/lib/rateLimit"
import { relayExpiry } from "@/lib/expiry"
import { relaySlotsFor } from "@/lib/relaySlots"
import {
  CREATE_RELAY_SCHEMA,
  relaySlotPath,
  STORAGE_BUCKET,
} from "@/lib/schemas"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { hashToken, newDeleteToken, newRelayId } from "@/lib/tokens"

/* M8 (SE-01, SE-02): POST /api/relays membuat baris estafet `waiting` dan URL
   unggah bertanda tangan untuk slot pembuat saja. Pola dan alasan teknisnya
   sama dengan POST /api/strips: berkas tidak melewati rute server, kuota
   dihitung setelah sisip, dan tanpa garam pembatasan laju rute menolak
   melayani.

   Slot disusun di sini dari geometri layout (lib/relaySlots.ts), jadi klien
   tidak bisa mengarang pemilik slot: pembuat selalu mengisi indeks genap. */

const UNAVAILABLE = { error: "Pembuatan link belum tersedia." }
const INVALID = { error: "Permintaan tidak valid." }
const TOO_MANY = {
  error: "Terlalu banyak link dibuat. Tunggu sebentar, lalu coba lagi.",
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin()
  if (admin === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return Response.json(INVALID, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json(INVALID, { status: 400 })
  }
  const parsed = CREATE_RELAY_SCHEMA.safeParse(payload)
  if (!parsed.success) {
    return Response.json(INVALID, { status: 400 })
  }

  const now = new Date()
  const rateKey = rateKeyFor(clientKeyFromRequest(request))
  if (rateKey === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }

  const id = newRelayId()
  const hostToken = newDeleteToken()
  const layout = parsed.data.layout
  const slots = relaySlotsFor(layout).map((slot) => ({
    ...slot,
    path: relaySlotPath(id, slot.index),
  }))

  try {
    const { error: insertError } = await admin.from("relays").insert({
      id,
      layout,
      slots,
      host_token_hash: hashToken(hostToken),
      status: "waiting",
      rate_key: rateKey,
      expires_at: relayExpiry(now).toISOString(),
    })
    if (insertError !== null) {
      throw new Error(insertError.message)
    }

    if (
      (await countRecentCreations(admin, "relays", rateKey, now)) > CREATE_LIMIT
    ) {
      /* Kuota tidak boleh dikembalikan oleh percobaan yang ditolak, jadi baris
         yang baru dibuat dibuang lagi sebelum menjawab 429. */
      const { error: rollbackError } = await admin
        .from("relays")
        .delete()
        .eq("id", id)
      if (rollbackError !== null) {
        throw new Error(rollbackError.message)
      }
      return Response.json(TOO_MANY, { status: 429 })
    }

    /* Hanya slot pembuat yang mendapat URL unggah; slot teman baru dibuka saat
       gilirannya diambil (claim), dan rute claim yang memeriksa berkas
       pembuatnya dulu. */
    const uploads: { index: number; path: string; token: string }[] = []
    for (const slot of slots) {
      if (slot.owner !== "host") {
        continue
      }
      const { data, error } = await admin.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(slot.path)
      if (error !== null || data === null) {
        throw new Error(error?.message ?? "URL unggah slot gagal dibuat.")
      }
      uploads.push({ index: slot.index, path: data.path, token: data.token })
    }

    return Response.json(
      {
        id,
        hostToken,
        expiresAt: relayExpiry(now).toISOString(),
        uploads,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/relays gagal:", error)
    return Response.json(
      { error: "Link estafet belum bisa dibuat. Coba lagi sebentar lagi." },
      { status: 500 }
    )
  }
}
