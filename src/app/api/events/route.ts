import { z } from "zod"

import { EVENT_BATCH_MAX, EVENT_NAMES } from "@/lib/analyticsEvents"
import { getBindings } from "@/server/cloudflare"
import { insertEvents } from "@/server/db/events"
import {
  bumpEventsBudget,
  clientKeyFromRequest,
  EVENT_LIMIT,
  isCrossSite,
  rateKeyFor,
  readEventsBudget,
} from "@/server/rateLimit"

/* PRD §4 dan ARCHITECTURE §8: analitik first-party, tanpa pelacak pihak
   ketiga. Klien mengirim sendBeacon ke rute ini, dan yang disimpan hanya nama
   peristiwa, sidang pembatasan laju (SHA-256 alamat IP bergaram, sama seperti
   rute POST lain), dan waktu. Tidak ada cookie, tidak ada kolom identitas.

   Rutenya best-effort dan tidak pernah menghalangi alur foto: tanpa binding
   ia menjawab 503 diam-diam (pola lama), dan klien tidak pernah menunggu
   jawabannya. M10: anggaran 200 peristiwa per jam per sidang dihitung di KV
   (jendela tetap per jam), bukan dengan memindai tabel `events` yang terus
   tumbuh; batasnya ditegakkan sebelum INSERT supaya membanjiri rute ini tidak
   bisa memaksa kerja tulis basis data. */

const INVALID = { error: "Permintaan tidak valid." }
const UNAVAILABLE = { error: "Pencatatan peristiwa belum tersedia." }
const TOO_MANY = { error: "Terlalu banyak peristiwa. Tunggu sebentar." }

const EVENTS_SCHEMA = z.object({
  events: z.array(z.enum(EVENT_NAMES)).min(1).max(EVENT_BATCH_MAX),
})

export async function POST(request: Request) {
  const bindings = getBindings()
  if (bindings === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }
  /* sendBeacon selalu mengirim Blob bertipe application/json, jadi gate jenis
     isi ini sekaligus menutup permintaan lintas situs tanpa preflight (form
     atau fetch `no-cors`) yang bisa dipakai menggelembungkan hitungan. M9
     menambah gate Origin/Sec-Fetch-Site supaya pagarnya tidak bergantung pada
     perilaku peramban terhadap jenis isi. */
  if (isCrossSite(request)) {
    return Response.json(INVALID, { status: 400 })
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
  const parsed = EVENTS_SCHEMA.safeParse(payload)
  if (!parsed.success) {
    return Response.json(INVALID, { status: 400 })
  }

  const rateKey = rateKeyFor(clientKeyFromRequest(request), "events")
  /* Tanpa garam, sidang alamat IP bisa dibalik dengan menebak seluruh ruang
     IPv4, jadi rutenya menolak melayani daripada memakai garam bawaan. */
  if (rateKey === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }

  const now = new Date()
  try {
    if ((await readEventsBudget(bindings.kv, rateKey, now)) >= EVENT_LIMIT) {
      return Response.json(TOO_MANY, { status: 429 })
    }

    await insertEvents(
      bindings.db,
      parsed.data.events,
      rateKey,
      now.toISOString()
    )
    await bumpEventsBudget(bindings.kv, rateKey, parsed.data.events.length, now)

    /* 204: klien tidak memakai jawabannya, jadi tidak ada isi yang perlu
       disusun. */
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("POST /api/events gagal:", error)
    return Response.json(
      { error: "Peristiwa belum bisa dicatat." },
      { status: 500 }
    )
  }
}
