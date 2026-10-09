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
 *  menebak seluruh ruang alamat IPv4, jadi rutenya menolak melayani. */
export function rateKeyFor(clientKey: string): string | null {
  const salt = process.env.RATE_LIMIT_SALT
  if (salt === undefined || salt === "") {
    return null
  }
  return createHash("sha256")
    .update(`${clientKey}:${salt}`)
    .digest("hex")
    .slice(0, 16)
}

/** Jumlah pembuatan link dalam jendela terakhir untuk sidang ini, dihitung
 *  dari baris yang ada di tabel (termasuk draf dan batu nisan). */
export async function countRecentCreations(
  admin: SupabaseClient,
  rateKey: string,
  now: Date
): Promise<number> {
  const since = new Date(now.getTime() - CREATE_WINDOW_MS).toISOString()
  const { count, error } = await admin
    .from("strips")
    .select("id", { count: "exact", head: true })
    .eq("rate_key", rateKey)
    .gt("created_at", since)
  if (error !== null) {
    throw new Error(error.message)
  }
  return count ?? 0
}
