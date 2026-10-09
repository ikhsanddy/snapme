import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { EVENT_BATCH_MAX, EVENT_NAMES } from "@/lib/analyticsEvents"
import { EVENT_LIMIT, rateKeyFor } from "@/lib/rateLimit"
import { EVENT_RETENTION_DAYS } from "@/lib/expiry"

/* Rute peristiwa analitik diuji sebagai fungsi dengan klien Supabase palsu:
/* bentuk permintaan, kode status, dan baris yang benar-benar tersimpan
   diperiksa tanpa proyek Supabase sungguhan. Konvensi dan alasan teknisnya
   sama dengan tests/api-strips.test.ts dan tests/api-relays.test.ts. */

const hoisted = vi.hoisted(() => ({ admin: null as unknown }))

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => hoisted.admin,
}))

import { GET as pembersih } from "@/app/api/cron/purge/route"
import { POST as catatPeristiwa } from "@/app/api/events/route"

const ASAL = "1.2.3.4"
const DAY_MS = 86_400_000

interface EventRow {
  id: number
  name: string
  rate_key: string
  created_at: string
}

type Filter = (row: EventRow) => boolean

function buatKlienPalsu(seed: EventRow[] = []) {
  const rows = new Map<number, EventRow>()
  let nextId = 1
  for (const row of seed) {
    rows.set(row.id, { ...row })
    /* `id` adalah identity di basis data: urutannya melanjutkan yang terbesar. */
    nextId = Math.max(nextId, row.id + 1)
  }

  const log = { deleted: [] as number[], inserted: 0 }

  function cocok(filters: Filter[]): EventRow[] {
    return [...rows.values()].filter((row) =>
      filters.every((saring) => saring(row))
    )
  }

  function pembangun(mode: "select" | "delete", denganJumlah = false) {
    const filters: Filter[] = []
    const builder = {
      eq(column: keyof EventRow, value: unknown) {
        filters.push((row) => row[column] === value)
        return builder
      },
      gt(column: keyof EventRow, value: unknown) {
        filters.push((row) => String(row[column]) > String(value))
        return builder
      },
      lte(column: keyof EventRow, value: unknown) {
        filters.push((row) => String(row[column]) <= String(value))
        return builder
      },
      in(column: keyof EventRow, values: unknown[]) {
        filters.push((row) => values.includes(row[column]))
        return builder
      },
      then<T>(
        resolve: (value: {
          data: EventRow[] | null
          count?: number
          error: null
        }) => T
      ) {
        const found = cocok(filters)
        if (mode === "delete") {
          for (const row of found) {
            log.deleted.push(row.id)
            rows.delete(row.id)
          }
        }
        return Promise.resolve({
          data: mode === "select" ? found : null,
          count: denganJumlah ? found.length : undefined,
          error: null,
        }).then(resolve)
      },
    }
    return builder
  }

  /** Kueri kosong untuk tabel di luar lingkup berkas ini: pembersih juga
   *  menyapu `strips` dan `relays`, yang diuji di berkasnya masing-masing. */
  function kueriKosong() {
    const kosong = {
      eq: () => kosong,
      not: () => kosong,
      lte: () => kosong,
      in: () => kosong,
      then<T>(resolve: (value: { data: EventRow[]; error: null }) => T) {
        return Promise.resolve({ data: [] as EventRow[], error: null }).then(
          resolve
        )
      },
    }
    return kosong
  }

  const client = {
    from(table: "events" | "strips" | "relays") {
      if (table !== "events") {
        return { select: () => kueriKosong() }
      }
      return {
        insert(values: { name: string; rate_key: string }[]) {
          const inserted: EventRow[] = []
          for (const item of values) {
            const row: EventRow = {
              id: nextId,
              created_at: new Date().toISOString(),
              ...item,
            }
            nextId += 1
            rows.set(row.id, row)
            inserted.push(row)
            log.inserted += 1
          }
          return {
            select: () =>
              Promise.resolve({
                data: inserted.map((row) => ({ id: row.id })),
                error: null,
              }),
          }
        },
        select: (_columns: string, options?: { head?: boolean }) =>
          pembangun("select", options?.head === true),
        delete: () => pembangun("delete"),
      }
    },
    storage: {
      from() {
        return { remove: () => Promise.resolve({ data: [], error: null }) }
      },
    },
  }

  return { client, rows, log }
}

function pasangKlien(seed: EventRow[] = []) {
  const fake = buatKlienPalsu(seed)
  hoisted.admin = fake.client
  return fake
}

function barisPeristiwa(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 1,
    name: "welcome_loaded",
    rate_key: "",
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function permintaan(body?: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ASAL,
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  })
}

function sidang(alamat: string): string {
  /* M9: ruang sidang analitik dipisah dari tabel lain lewat scope, jadi
     hashnya berbeda dari strips/relays untuk alamat yang sama. */
  const key = rateKeyFor(alamat, "events")
  if (key === null) {
    throw new Error("garam pembatasan laju belum dipasang")
  }
  return key
}

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_SALT", "garam-uji")
  vi.stubEnv("CRON_SECRET", "rahasia-pembersih")
})

afterEach(() => {
  vi.unstubAllEnvs()
  hoisted.admin = null
})

describe("POST /api/events", () => {
  it("menyimpan peristiwa yang sah dengan sidang pembatasan laju, tanpa isi balasan", async () => {
    const fake = pasangKlien()
    const response = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded", "photo_taken_gesture"] })
    )

    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
    expect([...fake.rows.values()]).toMatchObject([
      { name: "welcome_loaded", rate_key: sidang(ASAL) },
      { name: "photo_taken_gesture", rate_key: sidang(ASAL) },
    ])
    /* Tidak ada kolom identitas lain yang ikut tersimpan. */
    expect(Object.keys([...fake.rows.values()][0]).sort()).toEqual([
      "created_at",
      "id",
      "name",
      "rate_key",
    ])
  })

  it("menerima seluruh nama di daftar tertutup", async () => {
    const fake = pasangKlien()
    const response = await catatPeristiwa(permintaan({ events: [...EVENT_NAMES] }))

    expect(response.status).toBe(204)
    expect([...fake.rows.values()].map((row) => row.name)).toEqual([
      ...EVENT_NAMES,
    ])
  })

  it("menolak jenis isi lain, badan rusak, nama tak dikenal, dan jumlah di luar batas", async () => {
    const fake = pasangKlien()
    const jenisIsi = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded"] }, { "content-type": "text/plain" })
    )
    expect(jenisIsi.status).toBe(400)

    const rusak = await catatPeristiwa(permintaan("bukan-json"))
    expect(rusak.status).toBe(400)

    const namaSalah = await catatPeristiwa(permintaan({ events: ["bukan_peristiwa"] }))
    expect(namaSalah.status).toBe(400)

    const kosong = await catatPeristiwa(permintaan({ events: [] }))
    expect(kosong.status).toBe(400)

    const kebanyakan = await catatPeristiwa(
      permintaan({ events: Array.from({ length: EVENT_BATCH_MAX + 1 }, () => "welcome_loaded") })
    )
    expect(kebanyakan.status).toBe(400)

    const bukanArray = await catatPeristiwa(permintaan({ events: "welcome_loaded" }))
    expect(bukanArray.status).toBe(400)

    /* M9: permintaan yang jelas dari situs lain ditolak tanpa bergantung
       perilaku peramban terhadap jenis isi. */
    const lintasSitusOrigin = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded"] }, { origin: "https://jahat.example" })
    )
    expect(lintasSitusOrigin.status).toBe(400)

    const lintasSitusFetch = await catatPeristiwa(
      permintaan(
        { events: ["welcome_loaded"] },
        { "sec-fetch-site": "cross-site" }
      )
    )
    expect(lintasSitusFetch.status).toBe(400)

    expect(fake.log.inserted).toBe(0)
    expect(fake.rows.size).toBe(0)
  })

  it("menerima permintaan dari origin sendiri", async () => {
    const fake = pasangKlien()
    const response = await catatPeristiwa(
      permintaan(
        { events: ["welcome_loaded"] },
        { origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }
      )
    )

    expect(response.status).toBe(204)
    expect(fake.rows.size).toBe(1)
  })

  it("menolak melayani tanpa garam pembatasan laju dan tanpa basis data", async () => {
    pasangKlien()
    vi.stubEnv("RATE_LIMIT_SALT", "")
    const tanpaGaram = await catatPeristiwa(permintaan({ events: ["welcome_loaded"] }))
    expect(tanpaGaram.status).toBe(503)

    vi.stubEnv("RATE_LIMIT_SALT", "garam-uji")
    hoisted.admin = null
    const tanpaKlien = await catatPeristiwa(permintaan({ events: ["welcome_loaded"] }))
    expect(tanpaKlien.status).toBe(503)
  })

  it("membatasi anggaran per jam tanpa menulis apa pun saat sudah penuh", async () => {
    const baru = new Date().toISOString()
    const fake = pasangKlien(
      Array.from({ length: EVENT_LIMIT }, (_, index) =>
        barisPeristiwa({ id: index + 1, rate_key: sidang(ASAL), created_at: baru })
      )
    )
    const response = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded", "download_png"] })
    )

    expect(response.status).toBe(429)
    /* Gerbang sebelum-sisip: anggaran yang sudah penuh ditolak tanpa INSERT
       sama sekali, jadi membanjiri rute ini tidak memaksa kerja tulis basis
       data (temuan security-reviewer M9). Pemeriksaan setelah sisip tetap ada
       sebagai gerbang resmi untuk permintaan serentak. */
    expect(fake.log.inserted).toBe(0)
    expect(fake.log.deleted).toEqual([])
    expect(fake.rows.size).toBe(EVENT_LIMIT)
  })
})

describe("GET /api/cron/purge untuk peristiwa", () => {
  it("membuang peristiwa yang lebih tua dari retensi dan menghitungnya terpurge", async () => {
    const now = Date.now()
    const fake = pasangKlien([
      barisPeristiwa({
        id: 1,
        created_at: new Date(now - (EVENT_RETENTION_DAYS + 1) * DAY_MS).toISOString(),
      }),
      barisPeristiwa({
        id: 2,
        created_at: new Date(now - (EVENT_RETENTION_DAYS - 1) * DAY_MS).toISOString(),
      }),
    ])
    const response = await pembersih(
      new Request("http://localhost:3000/api/cron/purge", {
        headers: { authorization: "Bearer rahasia-pembersih" },
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ purged: 1 })
    expect(fake.log.deleted).toEqual([1])
    expect([...fake.rows.keys()]).toEqual([2])
  })
})
