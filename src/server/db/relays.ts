import {
  DELETE_BATCH_SIZE,
  RELAY_COLUMNS,
  type RelayRow,
  type RelaySlot,
} from "@/server/db/rows"

/* M10: prepared statement D1 untuk tabel `relays`. Tiga gerbang atomik di
   bawah menjaga kebenaran yang sebelumnya dijaga UPDATE bersyarat Supabase;
   hasilnya dibaca dari `meta.changes === 1`, bukan dari klien menyimpan
   keputusan. */

export async function selectRelay(
  db: D1Database,
  id: string
): Promise<RelayRow | null> {
  return await db
    .prepare(`SELECT ${RELAY_COLUMNS} FROM relays WHERE id = ?1`)
    .bind(id)
    .first<RelayRow>()
}

interface InsertRelayInput {
  id: string
  layout: string
  slots: readonly RelaySlot[]
  hostTokenHash: string
  rateKey: string
  createdAt: string
  expiresAt: string
}

export async function insertRelay(
  db: D1Database,
  input: InsertRelayInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO relays (
         id, layout, slots, host_token_hash, status, rate_key, created_at,
         expires_at
       ) VALUES (?1, ?2, ?3, ?4, 'waiting', ?5, ?6, ?7)`
    )
    .bind(
      input.id,
      input.layout,
      JSON.stringify(input.slots),
      input.hostTokenHash,
      input.rateKey,
      input.createdAt,
      input.expiresAt
    )
    .run()
}

/** SE-06: giliran tamu hanya diberikan sekali. `false` berarti permintaan lain
 *  sudah mengubah barisnya lebih dulu. */
export async function claimRelayOnce(
  db: D1Database,
  id: string,
  guestTokenHash: string
): Promise<boolean> {
  const result = await db
    .prepare(
      "UPDATE relays SET status = 'claimed', guest_token_hash = ?2 WHERE id = ?1 AND status = 'waiting'"
    )
    .bind(id, guestTokenHash)
    .run()
  return result.meta.changes === 1
}

/** Penuntasan estafet hanya sekali: dua penuntasan bersamaan tidak boleh
 *  menghasilkan dua strip. */
export async function completeRelayOnce(
  db: D1Database,
  id: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE relays SET status = 'complete' WHERE id = ?1 AND status = 'claimed'")
    .bind(id)
    .run()
  return result.meta.changes === 1
}

/** Gerbang pemenang tunggal jalur pemulihan (M9): draf baru hanya dipakai bila
 *  `strip_id` masih kosong. */
export async function setRelayStripOnce(
  db: D1Database,
  id: string,
  stripId: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE relays SET strip_id = ?2 WHERE id = ?1 AND strip_id IS NULL")
    .bind(id, stripId)
    .run()
  return result.meta.changes === 1
}

/** Membuka gerbang bila strip pemenangnya sudah tidak ada. */
export async function releaseRelayStrip(
  db: D1Database,
  id: string,
  stripId: string
): Promise<void> {
  await db
    .prepare("UPDATE relays SET strip_id = NULL WHERE id = ?1 AND strip_id = ?2")
    .bind(id, stripId)
    .run()
}

export async function cancelRelay(
  db: D1Database,
  id: string,
  expiresAt: string
): Promise<void> {
  await db
    .prepare("UPDATE relays SET status = 'cancelled', expires_at = ?2 WHERE id = ?1")
    .bind(id, expiresAt)
    .run()
}

export async function selectExpiredRelays(
  db: D1Database,
  nowIso: string
): Promise<RelayRow[]> {
  const result = await db
    .prepare(
      `SELECT ${RELAY_COLUMNS} FROM relays WHERE expires_at IS NOT NULL AND expires_at <= ?1`
    )
    .bind(nowIso)
    .all<RelayRow>()
  return result.results
}

export async function deleteRelays(
  db: D1Database,
  ids: readonly string[]
): Promise<void> {
  for (let start = 0; start < ids.length; start += DELETE_BATCH_SIZE) {
    await db.batch(
      ids
        .slice(start, start + DELETE_BATCH_SIZE)
        .map((id) => db.prepare("DELETE FROM relays WHERE id = ?1").bind(id))
    )
  }
}
