import { DELETE_BATCH_SIZE, STRIP_COLUMNS, type StripRow } from "@/server/db/rows"

/* M10: prepared statement D1 untuk tabel `strips`, menggantikan rantai query
   builder Supabase. Satu fungsi per operasi yang dipakai rute, supaya SQL-nya
   tetap satu tempat saat dibaca ulang. */

export async function selectStrip(
  db: D1Database,
  id: string
): Promise<StripRow | null> {
  return await db
    .prepare(`SELECT ${STRIP_COLUMNS} FROM strips WHERE id = ?1`)
    .bind(id)
    .first<StripRow>()
}

/** Baris yang menunjuk balik ke estafet lewat kolom `relay_id` (baris lama
 *  sebelum gerbang `relays.strip_id` dipasang di M9). */
export async function selectStripByRelayId(
  db: D1Database,
  relayId: string
): Promise<StripRow | null> {
  return await db
    .prepare(`SELECT ${STRIP_COLUMNS} FROM strips WHERE relay_id = ?1 LIMIT 1`)
    .bind(relayId)
    .first<StripRow>()
}

/** Baris strip milik satu estafet. Gerbang `strip_id` dibaca lebih dulu dan
 *  `relay_id` hanya untuk baris lama, supaya draf yang kalah balapan tidak
 *  pernah membayangi strip pemenangnya (temuan tinjauan keamanan M9). */
export async function selectStripForRelay(
  db: D1Database,
  relay: { id: string; strip_id: string | null }
): Promise<StripRow | null> {
  return relay.strip_id === null
    ? await selectStripByRelayId(db, relay.id)
    : await selectStrip(db, relay.strip_id)
}

interface InsertStripInput {
  id: string
  layout: string
  stillPath: string | null
  livePath?: string | null
  deleteTokenHash: string
  relayId?: string | null
  rateKey: string
  createdAt: string
}

export async function insertStrip(
  db: D1Database,
  input: InsertStripInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO strips (
         id, layout, still_path, live_path, delete_token_hash, relay_id,
         rate_key, created_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
    .bind(
      input.id,
      input.layout,
      input.stillPath,
      input.livePath ?? null,
      input.deleteTokenHash,
      input.relayId ?? null,
      input.rateKey,
      input.createdAt
    )
    .run()
}

/** `clearLivePath` mengosongkan `live_path` sekaligus (klip yang tidak lolos
 *  pemeriksaan rute complete). */
export async function updateStripComplete(
  db: D1Database,
  id: string,
  options: { expiresAt: string; clearLivePath: boolean }
): Promise<void> {
  const sql = options.clearLivePath
    ? "UPDATE strips SET status = 'complete', expires_at = ?2, live_path = NULL WHERE id = ?1"
    : "UPDATE strips SET status = 'complete', expires_at = ?2 WHERE id = ?1"
  await db.prepare(sql).bind(id, options.expiresAt).run()
}

export async function updateStripDeleteToken(
  db: D1Database,
  id: string,
  deleteTokenHash: string
): Promise<void> {
  await db
    .prepare("UPDATE strips SET delete_token_hash = ?2 WHERE id = ?1")
    .bind(id, deleteTokenHash)
    .run()
}

/** Batu nisan penghapusan: berkasnya sudah dibuang, barisnya menunggu masa
 *  tenggang supaya pembersih tetap tahu path berkas yang mungkin diunggah
 *  setelah penghapusan. */
export async function markStripDeleted(
  db: D1Database,
  id: string,
  expiresAt: string
): Promise<void> {
  await db
    .prepare("UPDATE strips SET status = 'deleted', expires_at = ?2 WHERE id = ?1")
    .bind(id, expiresAt)
    .run()
}

/** Membuang draf yang kalah balapan. Syarat `status = 'draft'` menjaganya
 *  tidak menghapus strip yang sudah dipakai klien. */
export async function deleteDraftStrip(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare("DELETE FROM strips WHERE id = ?1 AND status = 'draft'")
    .bind(id)
    .run()
}

export async function selectExpiredStrips(
  db: D1Database,
  nowIso: string
): Promise<StripRow[]> {
  const result = await db
    .prepare(
      `SELECT ${STRIP_COLUMNS} FROM strips WHERE expires_at IS NOT NULL AND expires_at <= ?1`
    )
    .bind(nowIso)
    .all<StripRow>()
  return result.results
}

export async function selectStaleDrafts(
  db: D1Database,
  beforeIso: string
): Promise<StripRow[]> {
  const result = await db
    .prepare(
      `SELECT ${STRIP_COLUMNS} FROM strips WHERE status = 'draft' AND created_at <= ?1`
    )
    .bind(beforeIso)
    .all<StripRow>()
  return result.results
}

export async function deleteStrips(
  db: D1Database,
  ids: readonly string[]
): Promise<void> {
  for (let start = 0; start < ids.length; start += DELETE_BATCH_SIZE) {
    await db.batch(
      ids
        .slice(start, start + DELETE_BATCH_SIZE)
        .map((id) => db.prepare("DELETE FROM strips WHERE id = ?1").bind(id))
    )
  }
}
