import { getCloudflareContext } from "@opennextjs/cloudflare"

/* M10: satu-satunya seam ke Cloudflare, padanan getSupabaseAdmin() yang
   digantikan. Berkas ini tidak boleh diimpor berkas bertanda `"use client"`;
   uji tests/client-bundle-secrecy.test.ts menjaga aturan itu.

   Aplikasi tetap jalan tanpa binding: `getBindings()` mengembalikan null bila
   satu saja nilainya kosong, dan rute menjawab 503 (pola lama dipertahankan).

   `process.env` tidak dipakai untuk membaca binding di sini: di Worker,
   nilainya datang dari objek `env` per permintaan, bukan dari proses. */

export interface S3Credentials {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
}

export interface Bindings {
  db: D1Database
  bucket: R2Bucket
  kv: KVNamespace
  s3: S3Credentials
}

/** Bentuk env yang dibaca dari binding. Opsional semua supaya berkas ini tidak
 *  bergantung pada keluaran `wrangler types` yang berbeda antar-mesin. */
interface SnapmeEnv {
  DB?: D1Database
  BUCKET?: R2Bucket
  RATE_LIMIT_KV?: KVNamespace
  R2_ACCOUNT_ID?: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
}

function filled(value: string | undefined): value is string {
  return value !== undefined && value !== ""
}

export function getBindings(): Bindings | null {
  let env: SnapmeEnv
  try {
    env = getCloudflareContext().env as SnapmeEnv
  } catch {
    /* Di luar Worker (mis. `next dev` tanpa initOpenNextCloudflareForDev) env
       tidak ada; rute menjawab 503 seperti saat env Supabase belum diisi. */
    return null
  }
  const { DB, BUCKET, RATE_LIMIT_KV, R2_ACCOUNT_ID } = env
  if (
    DB === undefined ||
    BUCKET === undefined ||
    RATE_LIMIT_KV === undefined ||
    !filled(R2_ACCOUNT_ID) ||
    !filled(env.R2_ACCESS_KEY_ID) ||
    !filled(env.R2_SECRET_ACCESS_KEY)
  ) {
    return null
  }
  return {
    db: DB,
    bucket: BUCKET,
    kv: RATE_LIMIT_KV,
    s3: {
      accountId: R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  }
}
