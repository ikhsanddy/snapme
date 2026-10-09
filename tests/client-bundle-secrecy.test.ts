import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/* ARCHITECTURE §8: kunci service role hanya ada di server. Dua pemeriksaan:

   (a) tidak ada berkas ber-`"use client"` yang mengimpor klien service role;
   (b) nilai kuncinya tidak muncul di bundel statis hasil build.

   Bagian (b) butuh build di `.next/static` dan nilai kunci dari `.env.local`
   atau dari lingkungan proses (mis. build dengan kunci uji). Bila keduanya
   tidak ada, bagian itu dilewati, bukan gagal. */

const ROOT = process.cwd()

function berkasKode(dir: string): string[] {
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir).flatMap((nama) => {
    const path = join(dir, nama)
    if (statSync(path).isDirectory()) {
      return berkasKode(path)
    }
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : []
  })
}

function berkasBundel(dir: string): string[] {
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir).flatMap((nama) => {
    const path = join(dir, nama)
    if (statSync(path).isDirectory()) {
      return berkasBundel(path)
    }
    return /\.(js|mjs|css|map|json|txt)$/.test(nama) ? [path] : []
  })
}

/** Nilai kunci dari `.env.local`, atau dari lingkungan proses. */
function kunciServiceRole(): string | null {
  const envPath = join(ROOT, ".env.local")
  if (existsSync(envPath)) {
    const baris = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((line) => line.startsWith("SUPABASE_SERVICE_ROLE_KEY="))
    const nilai = baris?.slice("SUPABASE_SERVICE_ROLE_KEY=".length).trim()
    if (nilai !== undefined && nilai !== "") {
      return nilai
    }
  }
  const dariLingkungan = process.env.SUPABASE_SERVICE_ROLE_KEY
  return dariLingkungan === undefined || dariLingkungan === ""
    ? null
    : dariLingkungan
}

describe("rahasia server tidak ikut ke klien", () => {
  it("tidak ada berkas klien yang mengimpor klien service role", () => {
    const pelanggar = berkasKode(join(ROOT, "src")).filter((path) => {
      const isi = readFileSync(path, "utf8")
      return (
        isi.includes('"use client"') && isi.includes("@/lib/supabase/server")
      )
    })
    expect(pelanggar).toEqual([])
  })

  it("nilai kunci service role tidak ada di bundel statis", () => {
    const kunci = kunciServiceRole()
    const bundel = berkasBundel(join(ROOT, ".next", "static"))
    if (kunci === null || bundel.length === 0) {
      /* Prasyaratnya belum ada (proyek Supabase belum dibuat). */
      expect(true).toBe(true)
      return
    }
    const bocor = bundel.filter((path) =>
      readFileSync(path, "utf8").includes(kunci)
    )
    expect(bocor).toEqual([])
  })
})
