import { readFileSync } from "node:fs"
import { getPlatformProxy } from "wrangler"

/* M10: harness uji basis data. Uji rute memakai binding SUNGGUHAN dari
   wrangler (`getPlatformProxy` menyalakan miniflare lokal), bukan klien palsu:
   SQL, gerbang atomik `meta.changes`, dan bentuk barisnya dijalankan oleh D1
   yang sama seperti di produksi.

   Penyimpangan tercatat di docs/DECISIONS.md M10: rencana awal memakai
   `@cloudflare/vitest-pool-workers`, tetapi paket itu masih mensyaratkan
   vitest 4 (proyek ini vitest 5) dan memaku wrangler versi lama, jadi pool-nya
   dilepas; `getPlatformProxy` adalah API resmi wrangler untuk kebutuhan yang
   sama.

   Konfigurasinya dibaca dari `wrangler.jsonc` supaya nama binding tidak
   ditulis dua kali. State-nya tidak dipersistensikan: setiap berkas uji mulai
   dari basis data kosong. */

export interface DbEnv {
  db: D1Database
  bucket: R2Bucket
  kv: KVNamespace
  dispose(): Promise<void>
}

/** D1 `exec` memecah masukannya per baris, jadi pernyataan multi-baris harus
 *  dirapatkan lebih dulu; komentar penuh-baris dibuang karena bukan pernyataan
 *  yang sah. Isi migrasi tidak memuat `;` di dalam string, jadi pemecahan
 *  sederhana ini aman. */
function migrationStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter((statement) => statement.length > 0)
}

export async function createDbEnv(): Promise<DbEnv> {
  const proxy = await getPlatformProxy({ configPath: "wrangler.jsonc", persist: false })
  const env = proxy.env as unknown as {
    DB: D1Database
    BUCKET: R2Bucket
    RATE_LIMIT_KV: KVNamespace
  }
  for (const statement of migrationStatements(
    readFileSync("migrations/0001_init.sql", "utf8")
  )) {
    await env.DB.exec(statement)
  }
  return {
    db: env.DB,
    bucket: env.BUCKET,
    kv: env.RATE_LIMIT_KV,
    dispose: () => proxy.dispose(),
  }
}

/** Mengosongkan tabel antar-kasus di dalam satu berkas uji. */
export async function truncateAll(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM strips"),
    db.prepare("DELETE FROM relays"),
    db.prepare("DELETE FROM events"),
  ])
}

/** Objek contoh untuk uji verifyStoredFile: ukuran dan jenisnya persis. */
export async function putObject(
  bucket: R2Bucket,
  path: string,
  contentType: string,
  size = 3
): Promise<void> {
  await bucket.put(path, new Uint8Array(size).fill(7), {
    httpMetadata: { contentType },
  })
}
