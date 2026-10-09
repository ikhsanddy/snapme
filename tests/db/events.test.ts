// @vitest-environment node
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { Bindings } from "@/lib/cloudflare"
import {
  EVENT_BATCH_MAX,
  EVENT_BATCH_SIZE,
  EVENT_NAMES,
} from "@/lib/analyticsEvents"
import { EVENT_RETENTION_DAYS } from "@/lib/expiry"
import { CREATE_WINDOW_MS, EVENT_LIMIT, rateKeyFor } from "@/lib/rateLimit"

import { createDbEnv, truncateAll, type DbEnv } from "./harness"

/* Rute peristiwa analitik diuji terhadap D1 dan KV sungguhan dari harness
   (miniflare lewat wrangler): SQL, gerbang anggaran jendela tetap, dan bentuk
   barisnya dijalankan oleh penyimpanan yang sama seperti produksi, bukan klien
   palsu. Konvensi dan alasan teknisnya sama dengan tests/db/strips.test.ts dan
   tests/db/relays.test.ts.

   M10: anggaran 200 peristiwa per jam pindah dari pemindaian tabel ke KV
   dengan kunci per sidang per jam, dan ditegakkan SEBELUM INSERT. Kasus 25
   batch (200 peristiwa) lalu 429 dipertahankan utuh sebagai bukti ujung-ke-
   ujung; satu kasus tambahan menyetel anggaran KV langsung supaya gerbangnya
   terbukti tanpa 25 panggilan. */

const hoisted = vi.hoisted(() => ({ bindings: null as unknown }))

vi.mock("@/lib/cloudflare", () => ({
  getBindings: () => hoisted.bindings,
}))

import { GET as pembersih } from "@/app/api/cron/purge/route"
import { POST as catatPeristiwa } from "@/app/api/events/route"

const ASAL = "1.2.3.4"
const DAY_MS = 86_400_000

let env: DbEnv
let bindings: Bindings

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

/** Kunci anggaran jam berjalan; rumusnya kontrak rute dengan lib/rateLimit. */
function kunciAnggaran(alamat: string): string {
  return `ev:${sidang(alamat)}:${Math.floor(Date.now() / CREATE_WINDOW_MS)}`
}

async function jumlahBaris(): Promise<number> {
  const row = await env.db
    .prepare("SELECT COUNT(*) AS n FROM events")
    .first<{ n: number }>()
  return row?.n ?? 0
}

beforeAll(async () => {
  env = await createDbEnv()
  bindings = {
    db: env.db,
    bucket: env.bucket,
    kv: env.kv,
    s3: {
      accountId: "uji",
      accessKeyId: "AKIAUJI",
      secretAccessKey: "rahasia-uji",
    },
  }
})

afterAll(async () => {
  await env.dispose()
})

beforeEach(async () => {
  hoisted.bindings = bindings
  vi.stubEnv("RATE_LIMIT_SALT", "garam-uji")
  vi.stubEnv("CRON_SECRET", "rahasia-pembersih")
  await truncateAll(env.db)
  /* Anggaran KV bertahan antar-kasus di dalam berkas ini, sedangkan D1
     dikosongkan: kunci `ev:` dibersihkan supaya setiap kasus mulai dari
     anggaran nol. */
  const anggaran = await env.kv.list({ prefix: "ev:" })
  await Promise.all(anggaran.keys.map((key) => env.kv.delete(key.name)))
})

afterEach(() => {
  vi.unstubAllEnvs()
  hoisted.bindings = null
})

describe("POST /api/events", () => {
  it("menyimpan peristiwa sah, menaikkan anggaran KV, dan memakai sidang bercakupan events", async () => {
    const response = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded", "photo_taken_gesture"] })
    )

    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")

    const rows = await env.db
      .prepare("SELECT * FROM events ORDER BY id")
      .all<Record<string, unknown>>()
    expect(rows.results).toMatchObject([
      { name: "welcome_loaded", rate_key: sidang(ASAL) },
      { name: "photo_taken_gesture", rate_key: sidang(ASAL) },
    ])
    /* Tidak ada kolom identitas lain yang ikut tersimpan. */
    expect(Object.keys(rows.results[0]).sort()).toEqual([
      "created_at",
      "id",
      "name",
      "rate_key",
    ])
    /* Scope "events" memisahkan sidang ini dari strips/relays, jadi nilainya
       tidak sama dengan hash tanpa scope untuk alamat yang sama. */
    expect(sidang(ASAL)).not.toBe(rateKeyFor(ASAL))

    expect(await env.kv.get(kunciAnggaran(ASAL))).toBe("2")
  })

  it("menerima seluruh nama di daftar tertutup", async () => {
    const response = await catatPeristiwa(
      permintaan({ events: [...EVENT_NAMES] })
    )

    expect(response.status).toBe(204)
    const rows = await env.db
      .prepare("SELECT name FROM events ORDER BY id")
      .all<{ name: string }>()
    expect(rows.results.map((row) => row.name)).toEqual([...EVENT_NAMES])
  })

  it("menolak jenis isi lain, badan rusak, dan muatan di luar skema", async () => {
    const jenisIsi = await catatPeristiwa(
      permintaan(
        { events: ["welcome_loaded"] },
        { "content-type": "text/plain" }
      )
    )
    expect(jenisIsi.status).toBe(400)

    const rusak = await catatPeristiwa(permintaan("bukan-json"))
    expect(rusak.status).toBe(400)

    const namaSalah = await catatPeristiwa(
      permintaan({ events: ["bukan_peristiwa"] })
    )
    expect(namaSalah.status).toBe(400)

    const kosong = await catatPeristiwa(permintaan({ events: [] }))
    expect(kosong.status).toBe(400)

    const kebanyakan = await catatPeristiwa(
      permintaan({
        events: Array.from({ length: EVENT_BATCH_MAX + 1 }, () => "welcome_loaded"),
      })
    )
    expect(kebanyakan.status).toBe(400)

    const bukanArray = await catatPeristiwa(
      permintaan({ events: "welcome_loaded" })
    )
    expect(bukanArray.status).toBe(400)

    /* Validasi berjalan sebelum INSERT: tidak ada baris maupun anggaran yang
       bertambah. */
    expect(await jumlahBaris()).toBe(0)
    expect((await env.kv.list({ prefix: "ev:" })).keys).toEqual([])
  })

  it("menolak permintaan lintas situs lewat Origin dan Sec-Fetch-Site", async () => {
    /* M9: permintaan yang jelas dari situs lain ditolak tanpa bergantung
       perilaku peramban terhadap jenis isi. */
    const lintasSitusOrigin = await catatPeristiwa(
      permintaan(
        { events: ["welcome_loaded"] },
        { origin: "https://jahat.example" }
      )
    )
    expect(lintasSitusOrigin.status).toBe(400)

    const lintasSitusFetch = await catatPeristiwa(
      permintaan(
        { events: ["welcome_loaded"] },
        { "sec-fetch-site": "cross-site" }
      )
    )
    expect(lintasSitusFetch.status).toBe(400)

    expect(await jumlahBaris()).toBe(0)
  })

  it("menerima permintaan dari origin sendiri", async () => {
    const response = await catatPeristiwa(
      permintaan(
        { events: ["welcome_loaded"] },
        { origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }
      )
    )

    expect(response.status).toBe(204)
    expect(await jumlahBaris()).toBe(1)
  })

  it("menolak melayani tanpa garam pembatasan laju dan tanpa binding", async () => {
    vi.stubEnv("RATE_LIMIT_SALT", "")
    const tanpaGaram = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded"] })
    )
    expect(tanpaGaram.status).toBe(503)

    vi.stubEnv("RATE_LIMIT_SALT", "garam-uji")
    hoisted.bindings = null
    const tanpaBinding = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded"] })
    )
    expect(tanpaBinding.status).toBe(503)

    expect(await jumlahBaris()).toBe(0)
  })

  it("menolak tanpa menulis saat anggaran jam ini sudah penuh", async () => {
    /* Menyetel anggaran langsung di KV membuktikan gerbang sebelum-INSERT
       tanpa harus mengirim 25 batch: rute membaca kunci jam berjalan dan
       menolak saat nilainya mencapai EVENT_LIMIT. */
    await env.kv.put(kunciAnggaran(ASAL), String(EVENT_LIMIT))

    const response = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded", "download_png"] })
    )

    expect(response.status).toBe(429)
    expect(await jumlahBaris()).toBe(0)
    expect(await env.kv.get(kunciAnggaran(ASAL))).toBe(String(EVENT_LIMIT))
  })

  it("menerima 25 batch lalu menolak batch ke-26 (batas 200 peristiwa per jam)", async () => {
    /* Kasus lama dipertahankan utuh: satu batch berisi EVENT_BATCH_SIZE
       peristiwa, dan anggaran habis setelah EVENT_LIMIT / EVENT_BATCH_SIZE
       batch. */
    const batch = Array.from({ length: EVENT_BATCH_SIZE }, () => "welcome_loaded")
    for (let index = 0; index < EVENT_LIMIT / EVENT_BATCH_SIZE; index += 1) {
      const response = await catatPeristiwa(permintaan({ events: batch }))
      expect(response.status).toBe(204)
    }

    const kelebihan = await catatPeristiwa(permintaan({ events: batch }))
    expect(kelebihan.status).toBe(429)

    expect(await jumlahBaris()).toBe(EVENT_LIMIT)
    expect(await env.kv.get(kunciAnggaran(ASAL))).toBe(String(EVENT_LIMIT))
  })

  it("menjawab 500 saat D1 gagal menulis", async () => {
    /* Kegagalan basis data yang nyata: tabel `events` tidak ada. Tabelnya
       dipulihkan seusai kasus supaya kasus pembersih tetap bisa mengosongkan
       tabel; kasus ini sengaja ditaruh paling akhir di blok ini. */
    await env.db.prepare("DROP TABLE events").run()

    const response = await catatPeristiwa(
      permintaan({ events: ["welcome_loaded"] })
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: "Peristiwa belum bisa dicatat.",
    })
    /* Sisipan gagal sebelum bump, jadi anggaran tidak ikut naik. */
    expect(await env.kv.get(kunciAnggaran(ASAL))).toBeNull()

    await env.db.batch([
      env.db.prepare(
        "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, rate_key TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"
      ),
      env.db.prepare(
        "CREATE INDEX IF NOT EXISTS events_rate_idx ON events (rate_key, created_at)"
      ),
      env.db.prepare(
        "CREATE INDEX IF NOT EXISTS events_name_idx ON events (name, created_at)"
      ),
    ])
  })
})

describe("GET /api/cron/purge untuk peristiwa", () => {
  it("membuang peristiwa yang lebih tua dari retensi dan menghitungnya terpurge", async () => {
    const now = Date.now()
    await env.db.batch([
      env.db
        .prepare("INSERT INTO events (name, rate_key, created_at) VALUES (?1, ?2, ?3)")
        .bind(
          "welcome_loaded",
          "",
          new Date(now - (EVENT_RETENTION_DAYS + 1) * DAY_MS).toISOString()
        ),
      env.db
        .prepare("INSERT INTO events (name, rate_key, created_at) VALUES (?1, ?2, ?3)")
        .bind(
          "download_png",
          "",
          new Date(now - (EVENT_RETENTION_DAYS - 1) * DAY_MS).toISOString()
        ),
    ])

    const response = await pembersih(
      new Request("http://localhost:3000/api/cron/purge", {
        headers: { authorization: "Bearer rahasia-pembersih" },
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ purged: 1 })

    const rows = await env.db
      .prepare("SELECT name FROM events")
      .all<{ name: string }>()
    expect(rows.results.map((row) => row.name)).toEqual(["download_png"])
  })
})
