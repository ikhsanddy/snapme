import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

/* ARCHITECTURE §8: pembatasan laju rute POST. Keputusan pengguna untuk M6:
   hitungannya di Supabase, bukan di memori fungsi serverless (setiap instans
   punya memorinya sendiri, jadi hitungan di memori tidak mengikat).

   Yang disimpan pada baris strip adalah sidang SHA-256 terpotong dari alamat
   IP ditambah garam dari env. Nilainya tidak bisa dipakai mengenali orang dan
   ikut terhapus bersama stripnya; satu kalimat di halaman Privasi menjelaskan
   hal ini.

   Perhitungannya dilakukan SETELAH baris disisipkan (hitung-setelah-sisip),
   bukan sebelumnya: periksa-dulu-lalu-sisip bisa dilewati permintaan serentak,
   sedangkan cara ini menghitung baris yang benar-benar ada, termasuk baris
   batu nisan dari penghapusan. */

export const CREATE_LIMIT = 10
export const CREATE_WINDOW_MS = 3_600_000

/** PRD §8: anggaran peristiwa analitik per sidang per jam. Klien mengirim
 *  satu beacon per delapan peristiwa, jadi sesi biasa memakai belasan baris;
 *  200 memberi ruang untuk sesi panjang tanpa membuka pintu penyalahgunaan. */
export const EVENT_LIMIT = 200

/** Alamat pemanggil. `x-real-ip` diisi platform hosting (Vercel menimpanya),
 *  jadi itu yang dipakai lebih dulu; `x-forwarded-for` hop pertama hanya
 *  cadangan untuk proxy lain. Hop pertama header itu bisa dipalsukan klien
 *  bila proxy hanya menambahkan, dan itu dicatat di docs/DECISIONS.md. */
export function clientKeyFromRequest(request: Request): string {
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
 *  dipilih pemanggil: estafet memakai kuota terpisah dari strip (M8), dan
 *  peristiwa analitik memakai anggaran sendiri yang jauh lebih longgar (M9). */
export async function countRecentCreations(
  admin: SupabaseClient,
  table: "strips" | "relays" | "events",
  rateKey: string,
  now: Date
): Promise<number> {
  const since = new Date(now.getTime() - CREATE_WINDOW_MS).toISOString()
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("rate_key", rateKey)
    .gt("created_at", since)
  if (error !== null) {
    throw new Error(error.message)
  }
  return count ?? 0
}
