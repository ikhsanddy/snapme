import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/* ARCHITECTURE §8: kunci service role hanya ada di server. Berkas ini tidak
   boleh diimpor berkas bertanda `"use client"`; uji
   tests/client-bundle-secrecy.test.ts menjaga aturan itu.

   Aplikasi tetap jalan tanpa proyek Supabase: `getSupabaseAdmin()` mengembalikan
   null bila env belum diisi, dan rute menjawab 503. */

let admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url === undefined || url === "" || key === undefined || key === "") {
    return null
  }
  admin ??= createClient(url, key, { auth: { persistSession: false } })
  return admin
}
