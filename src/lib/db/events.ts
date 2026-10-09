/* M10: prepared statement D1 untuk tabel `events` (analitik first-party).
   Tabelnya hanya berisi hitungan; anggaran lajunya ada di KV (lib/rateLimit). */

export async function insertEvents(
  db: D1Database,
  names: readonly string[],
  rateKey: string,
  createdAt: string
): Promise<void> {
  await db.batch(
    names.map((name) =>
      db
        .prepare("INSERT INTO events (name, rate_key, created_at) VALUES (?1, ?2, ?3)")
        .bind(name, rateKey, createdAt)
    )
  )
}

/** Retensi 90 hari (PRD §4). Mengembalikan jumlah baris yang dibuang. */
export async function deleteOldEvents(
  db: D1Database,
  cutoffIso: string
): Promise<number> {
  const result = await db
    .prepare("DELETE FROM events WHERE created_at <= ?1")
    .bind(cutoffIso)
    .run()
  return result.meta.changes
}
