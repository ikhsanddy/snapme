import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, resolve, sep } from "node:path"
import { describe, expect, it } from "vitest"

/* ARCHITECTURE §8: kredensial dan seam server hanya ada di server. Tiga
   pemeriksaan:

   (a) tidak ada berkas ber-`"use client"` yang mengimpor modul khusus server
       (seluruh isi `src/server/`, apa pun namanya);
   (b) nilai rahasianya tidak muncul di bundel statis hasil build;
   (c) tidak ada lagi rujukan env publik yang bocor ke bundel klien
       (M10: satu-satunya URL yang dipakai klien datang dari server lewat
       respons JSON, bukan dari `process.env`).

   Bagian (b) butuh build di `.next/static` dan nilai rahasia dari `.dev.vars`
   atau dari lingkungan proses. Bila keduanya tidak ada, bagian itu dilewati,
   bukan gagal. */

const ROOT = process.cwd()

/* Modul khusus server tinggal di satu folder, jadi batasnya cukup satu
   awalan: berkas klien tidak boleh mengimpor `@/server/**`. Pemeriksaan ini
   menelusuri spesifier relatif juga, supaya jalur seperti `../server/x`
   tertangkap walau tidak memakai alias. */
const DIR_SERVER = join(ROOT, "src", "server")

/** Spesifier impor statis dan dinamis, tanpa menyentuh isi string lain. */
function spesifier(isi: string): string[] {
  const hasil: string[] = []
  const pola = /(?:from|import)\s*\(?\s*"([^"]+)"/g
  for (const cocok of isi.matchAll(pola)) {
    hasil.push(cocok[1])
  }
  return hasil
}

/** Benar bila spesifier menunjuk berkas di dalam `src/server/`. */
function menujuServer(spec: string, dariBerkas: string): boolean {
  const jalur = spec.startsWith("@/")
    ? join(ROOT, "src", spec.slice(2))
    : spec.startsWith(".")
      ? resolve(dirname(dariBerkas), spec)
      : null
  if (jalur === null) {
    return false
  }
  return `${jalur}${sep}`.startsWith(`${DIR_SERVER}${sep}`)
}

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
        spesifier(isi).some((spec) => menujuServer(spec, path))
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
