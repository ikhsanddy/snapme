import { createHash } from "node:crypto"

/* ARCHITECTURE §8: pembatasan laju rute POST. M10 memindahkan hitungannya ke
   dua tempat sesuai sifatnya:

   - Kuota pembuatan strip dan estafet dihitung PERSIS dari baris di D1
     (`strips`/`relays`), pola lama dipertahankan: hitung-setelah-sisip.
   - Anggaran peristiwa analitik dihitung di KV dengan jendela tetap per jam,
     karena tabel `events` tidak lagi dihitung per permintaan (memindai tabel
     yang terus tumbuh untuk anggaran telemetri itu boros). Jendela tetap
     berbeda dari jendela bergulir lama; selisihnya hanya di batas jam dan
     didokumentasikan di docs/DECISIONS.md M10.

   Yang disimpan pada baris adalah sidang SHA-256 terpotong dari alamat IP
   ditambah garam dari env. Nilainya tidak bisa dipakai mengenali orang dan
   ikut terhapus bersama barisnya; satu kalimat di halaman Privasi menjelaskan
   hal ini. */

export const CREATE_LIMIT = 10
export const CREATE_WINDOW_MS = 3_600_000

/** PRD §8: anggaran peristiwa analitik per sidang per jam. Klien mengirim
 *  satu beacon per delapan peristiwa, jadi sesi biasa memakai belasan baris;
 *  200 memberi ruang untuk sesi panjang tanpa membuka pintu penyalahgunaan. */
export const EVENT_LIMIT = 200

/** Satu kunci KV per sidang per jam. TTL dua jam: kunci jam sebelumnya masih
 *  terbaca pembersih, dan kunci basi hilang sendiri. */
const EVENT_BUDGET_TTL_SECONDS = 7_200

/** Alamat pemanggil. Di Cloudflare Workers, `cf-connecting-ip` diisi platform
 *  dan tidak bisa dipalsukan klien; itu yang dipakai lebih dulu. `x-real-ip`
 *  (warisan penyedia sebelumnya) dan hop pertama `x-forwarded-for` hanya
 *  cadangan untuk proxy lain; hop pertama header itu bisa dipalsukan klien bila
 *  proxy hanya menambahkan, dan itu dicatat di docs/DECISIONS.md. */
export function clientKeyFromRequest(request: Request): string {
  const connecting = request.headers.get("cf-connecting-ip")?.trim()
  if (connecting !== undefined && connecting !== "") {
    return connecting
  }
  const real = request.headers.get("x-real-ip")?.trim()
  if (real !== undefined && real !== "") {
    return real
  }
  const forwarded = request.headers.get("x-forwarded-for")
  const first = forwarded?.split(",")[0]?.trim()
  return first === undefined || first === "" ? "lokal" : first
}

/** `null` bila garam belum diatur: tanpa garam, sidangnya bisa dibalik dengan
 *  menebak seluruh ruang alamat IPv4, jadi rutenya menolak melayani.
 *
 *  `scope` memisahkan ruang sidang antar-tabel (M9, temuan security-reviewer):
 *  tanpa pemisahan, nilai `rate_key` yang sama muncul di `strips`, `relays`,
 *  dan `events`, sehingga pemegang akses basis data bisa menyambung timeline
 *  peristiwa analitik ke baris strip berisi foto. Rute lama memakai scope
 *  bawaan supaya nilai yang sudah tersimpan tidak berubah. */
export function rateKeyFor(clientKey: string, scope = ""): string | null {
  const salt = process.env.RATE_LIMIT_SALT
  if (salt === undefined || salt === "") {
    return null
  }
  return createHash("sha256")
    .update(`${scope}:${clientKey}:${salt}`)
    .digest("hex")
    .slice(0, 16)
}

/** M9: permintaan yang jelas datang dari situs lain. Gate jenis isi sudah
 *  menutup form dan `fetch no-cors` bermuatan safelist, tetapi `Origin` dan
 *  `Sec-Fetch-Site` menutupnya tanpa bergantung perilaku peramban. `null`
 *  berarti header tidak ada (klien non-peramban, mis. uji API) dan dibiarkan
 *  lewat selama gate lain lolos. */
export function isCrossSite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite !== null && fetchSite.toLowerCase() === "cross-site") {
    return true
  }
  const origin = request.headers.get("origin")
  if (origin === null) {
    return false
  }
  return origin !== new URL(request.url).origin
}

/** Jumlah baris yang ditulis dalam jendela terakhir untuk sidang ini, dihitung
 *  dari baris yang ada di tabel (termasuk draf dan batu nisan). Tabelnya
 *  dipilih pemanggil: estafet memakai kuota terpisah dari strip (M8). */
export async function countRecentCreations(
  db: D1Database,
  table: "strips" | "relays",
  rateKey: string,
  sinceIso: string
): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE rate_key = ?1 AND created_at > ?2`)
    .bind(rateKey, sinceIso)
    .first<{ n: number }>()
  return row?.n ?? 0
}

function eventsBudgetKey(rateKey: string, now: Date): string {
  return `ev:${rateKey}:${Math.floor(now.getTime() / CREATE_WINDOW_MS)}`
}

export async function readEventsBudget(
  kv: KVNamespace,
  rateKey: string,
  now: Date
): Promise<number> {
  const value = await kv.get(eventsBudgetKey(rateKey, now))
  const count = Number(value)
  return Number.isFinite(count) ? count : 0
}

/** Menambah anggaran SETELAH batchnya tersimpan. Tidak ada rollback: selisih
 *  balapan paling banyak satu batch per permintaan serentak, dan tabel ini
 *  telemetri tanpa nilai uang (docs/DECISIONS.md M10). */
export async function bumpEventsBudget(
  kv: KVNamespace,
  rateKey: string,
  add: number,
  now: Date
): Promise<void> {
  const next = (await readEventsBudget(kv, rateKey, now)) + add
  await kv.put(eventsBudgetKey(rateKey, now), String(next), {
    expirationTtl: EVENT_BUDGET_TTL_SECONDS,
  })
}
