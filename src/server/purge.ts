import { deleteOldEvents } from "@/server/db/events"
import { deleteRelays, selectExpiredRelays } from "@/server/db/relays"
import { relaySlotsOf } from "@/server/db/rows"
import {
  deleteStrips,
  selectExpiredStrips,
  selectStaleDrafts,
} from "@/server/db/strips"
import { deleteObjects } from "@/server/r2/storage"
import {
  eventRetentionCutoff,
  isExpired,
  isStaleDraft,
  STALE_DRAFT_HOURS,
} from "@/server/expiry"

/* M10: badan pembersih harian, dipakai dua jalur: Cron Trigger Workers
   (`scheduled` di worker.ts, tanpa HTTP dan tanpa rahasia) dan rute
   GET /api/cron/purge untuk pemicu manual. Isinya sama dengan rute lama:
   baris yang lewat `expires_at`, draf yang tidak pernah diselesaikan kliennya
   (pengguna menutup halaman sebelum mengunggah), estafet yang lewat 48 jam
   atau dibatalkan, dan peristiwa analitik yang lebih tua dari 90 hari.
   Kedaluwarsa tetap juga diperiksa saat baca, jadi pembersih ini menjaga
   penyimpanan, bukan kebenaran status. */

const HOUR_MS = 3_600_000

interface PurgeResult {
  strips: number
  relays: number
  events: number
}

export async function purgeExpired(
  db: D1Database,
  bucket: R2Bucket,
  now: Date
): Promise<PurgeResult> {
  const nowIso = now.toISOString()
  const staleBefore = new Date(
    now.getTime() - STALE_DRAFT_HOURS * HOUR_MS
  ).toISOString()

  /* Penyaringan dilakukan lewat fungsi murni server/expiry.ts, bukan hanya
     filter kueri, supaya aturannya satu sumber dengan rute lain. */
  const stripRows = [
    ...(await selectExpiredStrips(db, nowIso)),
    ...(await selectStaleDrafts(db, staleBefore)),
  ].filter(
    (row) => isExpired(row.expires_at, now) || isStaleDraft(row.created_at, row.status, now)
  )
  const stripIds = [...new Set(stripRows.map((row) => row.id))]
  if (stripIds.length > 0) {
    await deleteObjects(
      bucket,
      stripRows
        .flatMap((row) => [row.still_path, row.live_path])
        .filter((path): path is string => path !== null)
    )
    await deleteStrips(db, stripIds)
  }

  /* M8: link estafet yang lewat 48 jam, dan baris yang dibatalkan setelah
     masa tenggangnya habis. Strip hasil estafet tidak disentuh di sini: ia
     punya umur 7 hari sendiri (SE-08). */
  const relayRows = (await selectExpiredRelays(db, nowIso)).filter((row) =>
    isExpired(row.expires_at, now)
  )
  const relayIds = [...new Set(relayRows.map((row) => row.id))]
  if (relayIds.length > 0) {
    await deleteObjects(
      bucket,
      relayRows.flatMap((row) => relaySlotsOf(row).map((slot) => slot.path))
    )
    await deleteRelays(db, relayIds)
  }

  /* M9 (PRD §4): peristiwa analitik disimpan 90 hari. Tabelnya hanya berisi
     hitungan, jadi tidak ada berkas yang perlu dibersihkan. */
  const events = await deleteOldEvents(db, eventRetentionCutoff(now).toISOString())

  return { strips: stripIds.length, relays: relayIds.length, events }
}
