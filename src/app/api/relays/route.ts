import { getBindings } from "@/lib/cloudflare"
import { insertRelay } from "@/lib/db/relays"
import {
  clientKeyFromRequest,
  countRecentCreations,
  CREATE_LIMIT,
  CREATE_WINDOW_MS,
  isCrossSite,
  rateKeyFor,
} from "@/lib/rateLimit"
import { presignPut } from "@/lib/r2/presign"
import { relayExpiry } from "@/lib/expiry"
import { relaySlotsFor } from "@/lib/relaySlots"
import { CREATE_RELAY_SCHEMA, RELAY_SLOT_MIME, relaySlotPath } from "@/lib/schemas"
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
  const bindings = getBindings()
  if (bindings === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return Response.json(INVALID, { status: 400 })
  }
  /* M9: permintaan yang jelas datang dari situs lain ditolak tanpa bergantung
     pada perilaku peramban terhadap jenis isi. */
  if (isCrossSite(request)) {
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
  const expiresAt = relayExpiry(now).toISOString()
  const slots = relaySlotsFor(layout).map((slot) => ({
    ...slot,
    path: relaySlotPath(id, slot.index),
  }))
  const sinceIso = new Date(now.getTime() - CREATE_WINDOW_MS).toISOString()

  try {
    /* Gerbang murah sebelum menulis (temuan security-reviewer M9): jendela
       kuota yang sudah penuh ditolak tanpa INSERT. Pemeriksaan setelah sisip
       tetap jadi gerbang resmi untuk permintaan serentak. */
    if (
      (await countRecentCreations(bindings.db, "relays", rateKey, sinceIso)) >=
      CREATE_LIMIT
    ) {
      return Response.json(TOO_MANY, { status: 429 })
    }

    await insertRelay(bindings.db, {
      id,
      layout,
      slots,
      hostTokenHash: hashToken(hostToken),
      rateKey,
      createdAt: now.toISOString(),
      expiresAt,
    })

    if (
      (await countRecentCreations(bindings.db, "relays", rateKey, sinceIso)) >
      CREATE_LIMIT
    ) {
      /* Kuota tidak boleh dikembalikan oleh percobaan yang ditolak, jadi baris
         yang baru dibuat dibuang lagi sebelum menjawab 429. */
      await bindings.db.prepare("DELETE FROM relays WHERE id = ?1").bind(id).run()
      return Response.json(TOO_MANY, { status: 429 })
    }

    /* Hanya slot pembuat yang mendapat URL unggah; slot teman baru dibuka saat
       gilirannya diambil (claim), dan rute claim yang memeriksa berkas
       pembuatnya dulu. */
    const uploads: { index: number; path: string; url: string }[] = []
    for (const slot of slots) {
      if (slot.owner !== "host") {
        continue
      }
      uploads.push({
        index: slot.index,
        path: slot.path,
        url: await presignPut(bindings.s3, slot.path, RELAY_SLOT_MIME),
      })
    }

    return Response.json({ id, hostToken, expiresAt, uploads }, { status: 201 })
  } catch (error) {
    console.error("POST /api/relays gagal:", error)
    return Response.json(
      { error: "Link estafet belum bisa dibuat. Coba lagi sebentar lagi." },
      { status: 500 }
    )
  }
}
