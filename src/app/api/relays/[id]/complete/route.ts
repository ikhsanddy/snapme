import { getBindings, type Bindings } from "@/server/cloudflare"
import {
  completeRelayOnce,
  releaseRelayStrip,
  selectRelay,
  setRelayStripOnce,
} from "@/server/db/relays"
import { relaySlotsOf, type RelayRow, type StripRow } from "@/server/db/rows"
import {
  deleteDraftStrip,
  insertStrip,
  selectStrip,
  selectStripByRelayId,
  updateStripDeleteToken,
} from "@/server/db/strips"
import { isExpired } from "@/server/expiry"
import { presignPut } from "@/server/r2/presign"
import { verifyStoredFile } from "@/server/r2/storage"
import {
  RELAY_SLOT_BYTE_LIMIT,
  RELAY_SLOT_MIME,
  STILL_MIME,
  stripStillPath,
} from "@/lib/schemas"
import { hashToken, newDeleteToken, newStripId, verifyToken } from "@/server/tokens"

/* M8 (SE-07): POST /api/relays/[id]/complete ditutup teman setelah semua slot
   terisi. Rutenya menuntaskan estafet, membuat baris strip yang menunjuk balik
   ke estafetnya (`relay_id`), dan menyerahkan satu URL unggah untuk PNG hasil
   hias. Selepas ini keduanya membaca halaman `/s/{id}` yang sama.

   Dua hal yang dijaga di sini:

   - Kemenangan hanya sekali. UPDATE-nya bersyarat `status = 'claimed'`, jadi
     dua penuntasan bersamaan tidak menghasilkan dua strip.
   - Semua berkas slot diperiksa sebelum menang. Bila slot teman belum
     terunggah (mis. sesinya pulih dari perangkat lain), jawabannya 422
     beserta URL unggah baru untuk slot yang kurang, supaya klien bisa
     mengunggah ulang dari foto yang ada di sesinya lalu mencoba sekali lagi.

   Rute ini idempoten: estafet yang sudah `complete` bisa dipanggil lagi, dan
   yang dijawab adalah strip yang sama, atau URL unggah baru bila stripnya
   masih draf.

   Jalur pemulihan yang terakhir itu bisa dimasuki dua permintaan sekaligus,
   jadi ia dijaga gerbang pemenang tunggal (M9): draf baru hanya dipakai
   setelah UPDATE bersyarat `relays.strip_id is null` berhasil, dan yang kalah
   membuang draf yatimnya. Dengan begitu satu estafet tidak pernah punya dua
   baris strip. */

const UNAVAILABLE = { error: "Pembuatan link belum tersedia." }
const MISSING_TOKEN = { error: "Token estafet tidak ada." }
const WRONG_TOKEN = { error: "Token estafet tidak cocok." }
const NOT_FOUND = { error: "Estafet tidak ditemukan." }
const EXPIRED = { error: "Estafet ini sudah kedaluwarsa." }
const CANCELLED = { error: "Estafet ini sudah dibatalkan." }
const TAKEN = { error: "Estafet ini sudah diambil." }
const FILE_REJECTED = {
  error: "Berkas tidak lolos pemeriksaan. Isi ulang foto yang kurang.",
}
const FAILED = { error: "Estafet belum bisa diselesaikan. Coba lagi sebentar lagi." }

interface SlotUpload {
  index: number
  path: string
  url: string
}

/** Membuat baris strip draf untuk estafet ini dan URL unggah PNG-nya. */
async function createDraftStrip(
  bindings: Bindings,
  relayId: string,
  layout: string
) {
  const stripId = newStripId()
  const deleteToken = newDeleteToken()
  const stillPath = stripStillPath(stripId)
  await insertStrip(bindings.db, {
    id: stripId,
    layout,
    stillPath,
    deleteTokenHash: hashToken(deleteToken),
    relayId,
    rateKey: "",
    createdAt: new Date().toISOString(),
  })
  return {
    stripId,
    deleteToken,
    upload: {
      path: stillPath,
      url: await presignPut(bindings.s3, stillPath, STILL_MIME),
    },
  }
}

/** Token hapus baru untuk draf yang sudah ada; dipakai bila penuntasan
 *  sebelumnya terputus sebelum PNG-nya terunggah. */
async function reissueDraftStrip(bindings: Bindings, strip: StripRow) {
  if (strip.still_path === null) {
    throw new Error("Draf strip estafet tidak punya path berkas.")
  }
  const deleteToken = newDeleteToken()
  await updateStripDeleteToken(bindings.db, strip.id, hashToken(deleteToken))
  return {
    stripId: strip.id,
    deleteToken,
    upload: {
      path: strip.still_path,
      url: await presignPut(bindings.s3, strip.still_path, STILL_MIME),
    },
  }
}

/** Jeda singkat antar-percobaan pembacaan baris strip pemenang. */
function pauseBeforeReread(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, 15)
  return promise
}

/** Baris strip pemenang gerbang `relays.strip_id`. `strip` null berarti
 *  kolomnya menunjuk strip yang barisnya tidak ada (sudah dihapus pembersih
 *  atau belum sempat terlihat).
 *
 *  Pemenang menulis gerbangnya sebelum baris stripnya terbaca, jadi baris yang
 *  belum ada dibaca ulang beberapa kali dulu: pembacaan yang terlalu cepat
 *  tidak boleh disalahartikan sebagai strip yang hilang, karena gerbang yang
 *  dibuka keliru bisa melahirkan pemenang kedua. */
async function claimedStrip(db: D1Database, relayId: string) {
  const row = await db
    .prepare("SELECT strip_id FROM relays WHERE id = ?1")
    .bind(relayId)
    .first<{ strip_id: string | null }>()
  const stripId = row?.strip_id ?? null
  if (stripId === null) {
    return null
  }
  for (let percobaan = 0; percobaan < 4; percobaan += 1) {
    const strip = await selectStrip(db, stripId)
    if (strip !== null) {
      return { id: stripId, strip }
    }
    await pauseBeforeReread()
  }
  return { id: stripId, strip: null }
}

/** Membuang draf yang kalah balapan. Barisnya saja: URL unggahnya baru dibuat
 *  dan tidak pernah dipakai klien, jadi belum ada berkas yang bisa yatim.
 *  Kegagalannya tidak menjatuhkan jawaban, karena pemenangnya sudah punya draf
 *  yang sah; sisa baris yatim paling lama dibersihkan pembersih draf basi. */
async function dropDraftStrip(db: D1Database, stripId: string) {
  try {
    await deleteDraftStrip(db, stripId)
  } catch (error) {
    console.error("Draf strip estafet yang kalah balapan gagal dibuang:", error)
  }
}

/** Jawaban untuk strip estafet yang sudah ada: draf diterbitkan ulang
 *  unggahannya, yang sudah selesai dijawab apa adanya. */
async function existingStripResponse(bindings: Bindings, strip: StripRow) {
  if (strip.status === "complete") {
    return Response.json({ stripId: strip.id, expiresAt: strip.expires_at })
  }
  return Response.json(await reissueDraftStrip(bindings, strip))
}

/** Jawaban untuk estafet yang sudah `complete`: strip yang sama bila sudah
 *  selesai, URL unggah bila masih draf, atau draf baru bila stripnya sudah
 *  dihapus.
 *
 *  Jalur "stripnya sudah dihapus" bisa dimasuki dua permintaan sekaligus
 *  (mis. pemulihan dari dua tab), jadi draf barunya dijaga gerbang
 *  `relays.strip_id`: pembuat draf harus memenangkan UPDATE bersyarat
 *  `strip_id is null` sebelum drafnya dipakai. Yang kalah membuang draf
 *  yatimnya lalu memakai draf pemenang.
 *
 *  Gerbangnya dibaca lebih dulu daripada pencarian lewat `relay_id`, supaya
 *  draf yang kalah balapan tidak pernah bisa diserahkan ke klien lain
 *  (temuan tinjauan keamanan M9): `relay_id` hanya dipakai untuk baris lama
 *  yang belum punya gerbang. Untuk alasan yang sama, satu estafet bisa punya
 *  lebih dari satu baris strip kalau baris lamanya adalah batu nisan
 *  penghapusan; yang dijaga di sini adalah satu strip AKTIF per estafet. */
async function completedResponse(bindings: Bindings, row: RelayRow) {
  /* Tiga putaran: balapan biasa selesai di putaran kedua. Putaran ketiga hanya
     terpakai bila strip pemenang dihapus di antara dua permintaan. */
  for (let putaran = 0; putaran < 3; putaran += 1) {
    const winner = await claimedStrip(bindings.db, row.id)
    if (winner !== null) {
      if (winner.strip !== null && winner.strip.status !== "deleted") {
        return await existingStripResponse(bindings, winner.strip)
      }
      await releaseRelayStrip(bindings.db, row.id, winner.id)
      continue
    }

    /* Tanpa pemenang di gerbang: baris lama dari sebelum migrasi (atau sisa
       yang gerbangnya sudah dibuka) boleh dipakai apa adanya. */
    const legacy = await selectStripByRelayId(bindings.db, row.id)
    if (legacy !== null && legacy.status !== "deleted") {
      return await existingStripResponse(bindings, legacy)
    }

    const draft = await createDraftStrip(bindings, row.id, row.layout)
    if (await setRelayStripOnce(bindings.db, row.id, draft.stripId)) {
      return Response.json(draft)
    }
    await dropDraftStrip(bindings.db, draft.stripId)
  }
  throw new Error("Klaim strip estafet tidak menemukan pemenang.")
}

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
    if (row.status === "waiting") {
      return Response.json(TAKEN, { status: 409 })
    }
    if (row.guest_token_hash === null || !verifyToken(token, row.guest_token_hash)) {
      return Response.json(WRONG_TOKEN, { status: 401 })
    }
    if (row.status === "complete") {
      return await completedResponse(bindings, row)
    }

    /* Status `claimed`: semua slot diperiksa. Slot pembuat tidak bisa diperbaiki
       dari sisi teman (kalau berkasnya hilang, estafetnya memang tidak utuh);
       slot teman yang kurang dikembalikan bersama URL unggah baru. */
    const missingGuest: SlotUpload[] = []
    let hostInvalid = false
    for (const slot of relaySlotsOf(row)) {
      const ok = await verifyStoredFile(
        bindings.bucket,
        slot.path,
        RELAY_SLOT_BYTE_LIMIT,
        [RELAY_SLOT_MIME]
      )
      if (ok) {
        continue
      }
      if (slot.owner === "guest") {
        missingGuest.push({
          index: slot.index,
          path: slot.path,
          url: await presignPut(bindings.s3, slot.path, RELAY_SLOT_MIME),
        })
      } else {
        hostInvalid = true
      }
    }
    if (hostInvalid) {
      return Response.json(FILE_REJECTED, { status: 422 })
    }
    if (missingGuest.length > 0) {
      return Response.json(
        { ...FILE_REJECTED, uploads: missingGuest },
        { status: 422 }
      )
    }

    if (!(await completeRelayOnce(bindings.db, id))) {
      /* Balapan: permintaan lain sudah menuntaskan estafet ini lebih dulu. */
      return Response.json(TAKEN, { status: 409 })
    }

    /* Draf stripnya dibuat lewat jalur yang sama dengan pemulihan: gerbang
       `relays.strip_id` berlaku untuk keduanya, jadi penuntasan dan pemulihan
       yang berbarengan tetap hanya menghasilkan satu draf. */
    return await completedResponse(bindings, row)
  } catch (error) {
    console.error("POST /api/relays/[id]/complete gagal:", error)
    return Response.json(FAILED, { status: 500 })
  }
}
