import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/* ARCHITECTURE §8: kredensial dan seam server hanya ada di server. Tiga
   pemeriksaan:

   (a) tidak ada berkas ber-`"use client"` yang mengimpor modul khusus server
       (M10: getBindings, lapisan database/bucket, pembersih, token);
   (b) nilai rahasianya tidak muncul di bundel statis hasil build;
   (c) tidak ada lagi rujukan env publik yang bocor ke bundel klien
       (M10: satu-satunya URL yang dipakai klien datang dari server lewat
       respons JSON, bukan dari `process.env`).

   Bagian (b) butuh build di `.next/static` dan nilai rahasia dari `.dev.vars`
   atau dari lingkungan proses. Bila keduanya tidak ada, bagian itu dilewati,
   bukan gagal. */

const ROOT = process.cwd()

/* Modul yang bergantung pada binding rahasia atau `node:crypto`; mengimpor
   salah satunya dari berkas klien akan menggagalkan build klien. */
const MODUL_SERVER = [
  "@/lib/cloudflare",
  "@/lib/db/",
  "@/lib/r2/",
  "@/lib/purge",
  "@/lib/tokens",
]

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

/** Nilai rahasia dari `.dev.vars` (format KEY=NILAI), atau dari lingkungan
 *  proses bila berkasnya belum ada. */
function rahasia(nama: string): string | null {
  const envPath = join(ROOT, ".dev.vars")
  if (existsSync(envPath)) {
    const baris = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((line) => line.startsWith(`${nama}=`))
    const nilai = baris?.slice(nama.length + 1).trim()
    if (nilai !== undefined && nilai !== "") {
      return nilai
    }
  }
  const dariLingkungan = process.env[nama]
  return dariLingkungan === undefined || dariLingkungan === ""
    ? null
    : dariLingkungan
}

describe("rahasia server tidak ikut ke klien", () => {
  it("tidak ada berkas klien yang mengimpor modul server", () => {
    const pelanggar = berkasKode(join(ROOT, "src")).filter((path) => {
      const isi = readFileSync(path, "utf8")
      return (
        isi.includes('"use client"') &&
        MODUL_SERVER.some((modul) => isi.includes(modul))
      )
    })
    expect(pelanggar).toEqual([])
  })

  it("tidak ada env publik yang dibaca kode klien", () => {
    const pembaca = berkasKode(join(ROOT, "src")).filter((path) =>
      readFileSync(path, "utf8").includes("process.env.NEXT_PUBLIC_")
    )
    expect(pembaca).toEqual([])
  })

  it("nilai rahasia tidak ada di bundel statis", () => {
    const nama = ["R2_SECRET_ACCESS_KEY", "RATE_LIMIT_SALT"]
    const nilai = nama
      .map((kunci) => rahasia(kunci))
      .filter((value): value is string => value !== null)
    const bundel = berkasBundel(join(ROOT, ".next", "static"))
    if (nilai.length === 0 || bundel.length === 0) {
      /* Prasyaratnya belum ada (rahasia lokal atau build belum dibuat). */
      expect(true).toBe(true)
      return
    }
    const bocor = bundel.filter((path) => {
      const isi = readFileSync(path, "utf8")
      return nilai.some((secret) => isi.includes(secret))
    })
    expect(bocor).toEqual([])
  })
})
