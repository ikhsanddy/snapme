import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { rateKeyFor } from "@/lib/rateLimit"
import { STILL_BYTE_LIMIT, stripLivePath, stripStillPath } from "@/lib/schemas"
import type { StripRow } from "@/lib/supabase/strips"
import { hashToken } from "@/lib/tokens"

/* Rute diuji langsung sebagai fungsi, dengan klien Supabase palsu di memori:
   bentuk permintaan, kode status, dan efek sampingnya diperiksa tanpa proyek
   Supabase sungguhan (MILESTONES M6: proyek menyusul, keputusan pengguna). */

const hoisted = vi.hoisted(() => ({ admin: null as unknown }))

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => hoisted.admin,
}))

import { GET as pembersih } from "@/app/api/cron/purge/route"
import { DELETE as hapusStrip } from "@/app/api/strips/[id]/route"
import { POST as lengkapiStrip } from "@/app/api/strips/[id]/complete/route"
import { POST as buatStrip } from "@/app/api/strips/route"

type Row = Partial<StripRow> & { id: string } & Record<string, unknown>

interface Builder {
  eq(column: string, value: unknown): Builder
  gt(column: string, value: unknown): Builder
  lte(column: string, value: unknown): Builder
  not(column: string, operator: string, value: unknown): Builder
  in(column: string, values: unknown[]): Builder
  maybeSingle(): Promise<{ data: Row | null; error: null }>
  then<T>(
    resolve: (value: { data: Row[] | null; count?: number; error: null }) => T
  ): Promise<T>
}

const TOKEN = "token-hapus-uji"
const ASAL = "1.2.3.4"

function baris(overrides: Row): Row {
  return {
    layout: "strip-4",
    still_path: stripStillPath(overrides.id),
    live_path: null,
    status: "draft",
    delete_token_hash: hashToken(TOKEN),
    created_at: new Date().toISOString(),
    expires_at: null,
    ...overrides,
  }
}

function buatKlienPalsu(seed: Row[] = []) {
  const rows = new Map<string, Row>()
  for (const item of seed) {
    rows.set(item.id, { ...baris(item) })
  }

  const log = {
    removed: [] as string[],
    signedUploads: [] as string[],
    signedUrls: [] as string[],
  }

  function cocok(filters: ((row: Row) => boolean)[]): Row[] {
    return [...rows.values()].filter((row) =>
      filters.every((saring) => saring(row))
    )
  }

  function pembangun(
    mode: "select" | "update" | "delete",
    patch: Partial<Row> = {},
    denganJumlah = false
  ): Builder {
    const filters: ((row: Row) => boolean)[] = []
    const builder: Builder = {
      eq(column, value) {
        filters.push((row) => row[column] === value)
        return builder
      },
      gt(column, value) {
        filters.push((row) => String(row[column] ?? "") > String(value))
        return builder
      },
      lte(column, value) {
        filters.push((row) => String(row[column] ?? "") <= String(value))
        return builder
      },
      not(column, operator, value) {
        filters.push((row) =>
          operator === "is" && value === null ? row[column] !== null : true
        )
        return builder
      },
      in(column, values) {
        filters.push((row) => values.includes(row[column]))
        return builder
      },
      maybeSingle() {
        return Promise.resolve({ data: cocok(filters)[0] ?? null, error: null })
      },
      then(resolve) {
        const found = cocok(filters)
        if (mode === "update") {
          for (const row of found) {
            Object.assign(row, patch)
          }
        }
        if (mode === "delete") {
          for (const row of found) {
            rows.delete(String(row.id))
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

  const client = {
    from(table: string) {
      /* M8: pembersih juga menyapu tabel `relays`. Berkas uji ini tidak
         menguji estafet (itu di tests/api-relays.test.ts), jadi tabel itu
         dijawab kosong di sini. */
      if (table === "relays") {
        return {
          select: () => ({
            not: () => ({
              lte: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }
      }
      return {
        insert: (values: Row | Row[]) => {
          for (const item of Array.isArray(values) ? values : [values]) {
            const id = String(item.id)
            /* Hanya nilai bawaan kolom yang ditambahkan, seperti basis data.
               Rute harus menulis sendiri kolom lain (mis. still_path), dan uji
               tidak boleh menambalnya diam-diam. */
            rows.set(id, {
              status: "draft",
              created_at: new Date().toISOString(),
              expires_at: null,
              still_path: null,
              live_path: null,
              ...item,
            })
          }
          return Promise.resolve({ error: null })
        },
        select: (_columns: string, options?: { head?: boolean }) =>
          pembangun("select", {}, options?.head === true),
        update: (patch: Row) => pembangun("update", patch),
        delete: () => pembangun("delete"),
      }
    },
    storage: {
      from(bucket: string) {
        expect(bucket).toBe("snapme")
        return {
          createSignedUploadUrl(path: string) {
            log.signedUploads.push(path)
            return Promise.resolve({
              data: {
                signedUrl: `https://storage.test/${path}`,
                token: "token-unggah",
                path,
              },
              error: null,
            })
          },
          createSignedUrl(path: string, expiresIn: number) {
            log.signedUrls.push(path)
            return Promise.resolve({
              data: { signedUrl: `https://storage.test/${path}?exp=${expiresIn}` },
              error: null,
            })
          },
          remove(paths: string[]) {
            log.removed.push(...paths)
            return Promise.resolve({ data: [], error: null })
          },
        }
      },
    },
  }

  return { client, rows, log }
}

function pasangKlien(seed: Row[] = []) {
  const fake = buatKlienPalsu(seed)
  hoisted.admin = fake.client
  return fake
}

function permintaan(body?: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/strips", {
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

function konteks(id: string) {
  return { params: Promise.resolve({ id }) }
}

/** Sidang alamat IP dengan garam uji yang dipasang beforeEach. */
function sidang(alamat: string): string {
  const key = rateKeyFor(alamat)
  if (key === null) {
    throw new Error("garam pembatasan laju belum dipasang")
  }
  return key
}

function pasangFetch(status: number, bytes: number, type: string) {
  vi.stubGlobal("fetch", () =>
    Promise.resolve({
      ok: status < 400,
      headers: new Headers({
        "content-length": String(bytes),
        "content-type": type,
      }),
    } as Response)
  )
}

/** M7: rute complete memeriksa dua berkas (still dan klip), jadi stub `fetch`
 *  memilih respons berdasarkan potongan URL. */
function pasangFetchUrl(
  entries: { match: string; status: number; bytes: number; type: string }[]
) {
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    const url = String(input)
    const entry = entries.find((item) => url.includes(item.match))
    if (entry === undefined) {
      throw new Error(`Tidak ada stub fetch untuk ${url}`)
    }
    return Promise.resolve({
      ok: entry.status < 400,
      headers: new Headers({
        "content-length": String(entry.bytes),
        "content-type": entry.type,
      }),
    } as Response)
  })
}

beforeEach(() => {
  /* Garam wajib ada: tanpa itu rute menolak melayani (sidang alamat IP bisa
     dibalik dengan menebak ruang IPv4). */
  vi.stubEnv("RATE_LIMIT_SALT", "garam-uji")
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  hoisted.admin = null
})

describe("POST /api/strips", () => {
  it("membuat baris draf dan URL unggah bertanda tangan", async () => {
    const fake = pasangKlien()
    const response = await buatStrip(permintaan({ layout: "strip-3" }))

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      id: string
      deleteToken: string
      upload: { path: string; token: string }
    }
    expect(body.id).toHaveLength(12)
    expect(body.upload.path).toBe(stripStillPath(body.id))
    expect(body.upload.token).toBe("token-unggah")
    expect(fake.log.signedUploads).toEqual([stripStillPath(body.id)])

    expect([...fake.rows.values()]).toEqual([
      expect.objectContaining({
        id: body.id,
        layout: "strip-3",
        status: "draft",
        /* Path berkas ditulis sejak pembuatan: pembersih dan penghapusan harus
           tahu berkas mana yang jadi milik baris ini. */
        still_path: stripStillPath(body.id),
        delete_token_hash: hashToken(body.deleteToken),
        rate_key: sidang(ASAL),
        expires_at: null,
      }),
    ])
    /* Token mentah tidak pernah masuk basis data. */
    expect(JSON.stringify([...fake.rows.values()])).not.toContain(body.deleteToken)
  })

  it("menolak badan yang bukan JSON, layout tak dikenal, dan jenis isi lain", async () => {
    pasangKlien()
    const bukanJson = await buatStrip(permintaan("bukan-json"))
    expect(bukanJson.status).toBe(400)
    expect(await bukanJson.json()).toEqual({ error: "Permintaan tidak valid." })

    const layoutSalah = await buatStrip(permintaan({ layout: "strip-9" }))
    expect(layoutSalah.status).toBe(400)

    /* Permintaan lintas situs tanpa preflight mengirim text/plain. */
    const lintasSitus = await buatStrip(
      permintaan('{"layout":"strip-4"}', { "content-type": "text/plain" })
    )
    expect(lintasSitus.status).toBe(400)
  })

  it("menyertakan URL unggah klip bila klipnya diminta", async () => {
    const fake = pasangKlien()
    const response = await buatStrip(
      permintaan({ layout: "strip-4", live: "webm" })
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      id: string
      upload: { path: string }
      liveUpload?: { path: string; token: string }
    }
    expect(body.liveUpload).toEqual({
      path: stripLivePath(body.id, "webm"),
      token: "token-unggah",
    })
    /* Still lebih dulu, klip kedua. */
    expect(fake.log.signedUploads).toEqual([
      stripStillPath(body.id),
      stripLivePath(body.id, "webm"),
    ])
    expect(fake.rows.get(body.id)?.live_path).toBe(
      stripLivePath(body.id, "webm")
    )
    /* MP4 juga diterima: Safari merekamnya. */
    const mp4 = await buatStrip(permintaan({ layout: "strip-4", live: "mp4" }))
    const mp4Body = (await mp4.json()) as { id: string }
    expect(fake.rows.get(mp4Body.id)?.live_path).toBe(
      stripLivePath(mp4Body.id, "mp4")
    )
  })

  it("tidak menawarkan unggah klip bila tidak diminta", async () => {
    const fake = pasangKlien()
    const response = await buatStrip(permintaan({ layout: "strip-4" }))

    expect(response.status).toBe(201)
    const body = (await response.json()) as Record<string, unknown>
    expect("liveUpload" in body).toBe(false)
    expect(fake.rows.get(String(body.id))?.live_path).toBeNull()

    /* Jenis klip di luar dua yang dikenal ditolak sebelum baris dibuat. */
    const avi = await buatStrip(permintaan({ layout: "strip-4", live: "avi" }))
    expect(avi.status).toBe(400)
  })

  it("menolak melayani tanpa garam pembatasan laju", async () => {
    pasangKlien()
    vi.stubEnv("RATE_LIMIT_SALT", "")
    const response = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: "Pembuatan link belum tersedia.",
    })
  })

  it("membatasi 10 pembuatan per jam untuk sidang yang sama", async () => {
    const baru = new Date().toISOString()
    const fake = pasangKlien(
      Array.from({ length: 10 }, (_, index) =>
        baris({ id: `lama${index}`, rate_key: sidang(ASAL), created_at: baru })
      )
    )

    const ditolak = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(ditolak.status).toBe(429)
    expect(await ditolak.json()).toEqual({
      error: "Terlalu banyak link dibuat. Tunggu sebentar, lalu coba lagi.",
    })
    /* Baris yang baru dibuat dibatalkan lagi dan tidak ada URL unggah yang
       diberikan, jadi kuota tidak bisa dikembalikan percobaan yang ditolak. */
    expect(fake.rows.size).toBe(10)
    expect(fake.log.signedUploads).toEqual([])

    /* Baris yang lebih tua dari satu jam tidak dihitung, dan sidang lain tidak
       terpengaruh. */
    fake.rows.set(
      "basi",
      baris({
        id: "basi",
        rate_key: sidang(ASAL),
        created_at: new Date(Date.now() - 7_200_000).toISOString(),
      })
    )
    fake.rows.set("tetangga", baris({ id: "tetangga", rate_key: sidang("5.6.7.8") }))
    const masihPenuh = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(masihPenuh.status).toBe(429)

    const lain = await buatStrip(
      permintaan({ layout: "strip-4" }, { "x-forwarded-for": "9.9.9.9" })
    )
    expect(lain.status).toBe(201)
  })

  it("menerima pembuatan kesepuluh dan tidak bisa dipalsukan lewat x-forwarded-for", async () => {
    const fake = pasangKlien(
      Array.from({ length: 9 }, (_, index) =>
        baris({ id: `lama${index}`, rate_key: sidang(ASAL) })
      )
    )
    const kesepuluh = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(kesepuluh.status).toBe(201)
    expect(fake.rows.size).toBe(10)

    /* `x-real-ip` diisi platform hosting; header yang bisa dipalsukan klien
       tidak boleh memindahkan keranjangnya. */
    const dipalsukan = await buatStrip(
      permintaan(
        { layout: "strip-4" },
        { "x-forwarded-for": "9.9.9.9", "x-real-ip": ASAL }
      )
    )
    expect(dipalsukan.status).toBe(429)
  })

  it("pembuatan belum tersedia tanpa env Supabase", async () => {
    hoisted.admin = null
    const response = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: "Pembuatan link belum tersedia.",
    })
  })
})

describe("POST /api/strips/[id]/complete", () => {
  it("menjawab 404 untuk strip yang tidak ada", async () => {
    pasangKlien()
    const response = await lengkapiStrip(permintaan(), konteks("tidakada1234"))
    expect(response.status).toBe(404)
  })

  it("menjawab 410 untuk strip yang sudah lewat 7 hari, walau pembersih belum jalan", async () => {
    const fake = pasangKlien([
      baris({
        id: "kedalwarsa1",
        expires_at: new Date(Date.now() - 8 * 86_400_000).toISOString(),
      }),
    ])
    const response = await lengkapiStrip(permintaan(), konteks("kedalwarsa1"))
    expect(response.status).toBe(410)
    expect(await response.json()).toEqual({ error: "Strip ini sudah kedaluwarsa." })
    expect(fake.rows.get("kedalwarsa1")?.status).toBe("draft")
    expect(fake.log.signedUrls).toEqual([])
  })

  it("menolak berkas yang terlalu besar atau bukan PNG, berkasnya dibuang", async () => {
    const fake = pasangKlien([baris({ id: "berkas123456" })])

    pasangFetch(200, STILL_BYTE_LIMIT + 1, "image/png")
    const besar = await lengkapiStrip(permintaan(), konteks("berkas123456"))
    expect(besar.status).toBe(422)

    pasangFetch(200, 1024, "image/jpeg")
    const jenis = await lengkapiStrip(permintaan(), konteks("berkas123456"))
    expect(jenis.status).toBe(422)

    /* Awalan yang sama bukan jenis yang sama. */
    pasangFetch(200, 1024, "image/pngx")
    const mirip = await lengkapiStrip(permintaan(), konteks("berkas123456"))
    expect(mirip.status).toBe(422)

    pasangFetch(404, 1024, "image/png")
    const hilang = await lengkapiStrip(permintaan(), konteks("berkas123456"))
    expect(hilang.status).toBe(422)

    expect(fake.rows.get("berkas123456")?.status).toBe("draft")
    expect(fake.rows.get("berkas123456")?.expires_at).toBeNull()
    /* Tiap penolakan membuang berkasnya supaya tidak menumpuk di Storage. */
    expect(fake.log.removed).toEqual([
      "strips/berkas123456/still.png",
      "strips/berkas123456/still.png",
      "strips/berkas123456/still.png",
      "strips/berkas123456/still.png",
    ])
  })

  it("memasang kedaluwarsa 7 hari sekali saja, panggilan berikutnya idempoten", async () => {
    const fake = pasangKlien([baris({ id: "selesai12345" })])
    pasangFetch(200, 1024, "image/png")

    const pertama = await lengkapiStrip(permintaan(), konteks("selesai12345"))
    expect(pertama.status).toBe(200)
    const satu = (await pertama.json()) as { id: string; expiresAt: string }
    expect(satu.id).toBe("selesai12345")
    expect(
      Math.abs(Date.parse(satu.expiresAt) - (Date.now() + 7 * 86_400_000))
    ).toBeLessThan(5_000)
    expect(fake.rows.get("selesai12345")?.status).toBe("complete")

    const kedua = await lengkapiStrip(permintaan(), konteks("selesai12345"))
    expect(kedua.status).toBe(200)
    expect(await kedua.json()).toEqual(satu)
    expect(fake.log.signedUrls).toHaveLength(1)
  })

  /* M7: klip Strip Hidup best-effort. Yang lolos disimpan, yang tidak dibuang
     dan dikosongkan; strip diamnya tetap selesai. */
  it("menyimpan klip yang lolos pemeriksaan", async () => {
    const id = "berklip12345"
    const livePath = stripLivePath(id, "webm")
    const fake = pasangKlien([baris({ id, live_path: livePath })])
    pasangFetchUrl([
      { match: "/still.png", status: 200, bytes: 1024, type: "image/png" },
      { match: "/live.webm", status: 200, bytes: 1_048_576, type: "video/webm" },
    ])

    const response = await lengkapiStrip(permintaan(), konteks(id))
    expect(response.status).toBe(200)
    expect(fake.rows.get(id)?.status).toBe("complete")
    expect(fake.rows.get(id)?.live_path).toBe(livePath)
    expect(fake.log.removed).toEqual([])
  })

  it("menolak klip yang tidak ada atau terlalu besar, berkasnya dibuang", async () => {
    const id = "berklip67890"
    const livePath = stripLivePath(id, "mp4")
    const fake = pasangKlien([baris({ id, live_path: livePath })])
    const still = {
      match: "/still.png",
      status: 200,
      bytes: 1024,
      type: "image/png",
    }

    /* Berkasnya tidak pernah terunggah. */
    pasangFetchUrl([
      still,
      { match: "/live.mp4", status: 404, bytes: 0, type: "video/mp4" },
    ])
    const hilang = await lengkapiStrip(permintaan(), konteks(id))
    expect(hilang.status).toBe(200)
    expect(fake.rows.get(id)?.status).toBe("complete")
    expect(fake.rows.get(id)?.live_path).toBeNull()
    expect(fake.log.removed).toEqual([livePath])

    /* Jenis klip yang tidak dikenal, lalu ukuran di atas 5 MB. */
    fake.rows.set(id, baris({ id, live_path: livePath }))
    pasangFetchUrl([
      still,
      { match: "/live.mp4", status: 200, bytes: 2048, type: "video/quicktime" },
    ])
    const jenis = await lengkapiStrip(permintaan(), konteks(id))
    expect(jenis.status).toBe(200)
    expect(fake.rows.get(id)?.live_path).toBeNull()

    fake.rows.set(id, baris({ id, live_path: livePath }))
    pasangFetchUrl([
      still,
      { match: "/live.mp4", status: 200, bytes: 6_291_456, type: "video/mp4" },
    ])
    const besar = await lengkapiStrip(permintaan(), konteks(id))
    expect(besar.status).toBe(200)
    expect(fake.rows.get(id)?.live_path).toBeNull()
    expect(fake.log.removed).toEqual([livePath, livePath, livePath])
    /* Strip diamnya tidak tersentuh. */
    expect(fake.log.removed).not.toContain(stripStillPath(id))
  })

  it("tidak memeriksa klip untuk baris tanpa live_path", async () => {
    const fake = pasangKlien([baris({ id: "tanpaklip123" })])
    pasangFetch(200, 1024, "image/png")

    const response = await lengkapiStrip(permintaan(), konteks("tanpaklip123"))
    expect(response.status).toBe(200)
    expect(fake.log.signedUrls).toEqual([stripStillPath("tanpaklip123")])
    expect(fake.log.removed).toEqual([])
  })
})

describe("DELETE /api/strips/[id]", () => {
  it("butuh token hapus yang cocok", async () => {
    const fake = pasangKlien([baris({ id: "hapus1234567" })])

    const tanpa = await hapusStrip(
      new Request("http://localhost:3000/api/strips/hapus1234567", {
        method: "DELETE",
      }),
      konteks("hapus1234567")
    )
    expect(tanpa.status).toBe(401)
    expect(await tanpa.json()).toEqual({ error: "Token hapus tidak ada." })

    const salah = await hapusStrip(
      new Request("http://localhost:3000/api/strips/hapus1234567", {
        method: "DELETE",
        headers: { "x-delete-token": "token-palsu" },
      }),
      konteks("hapus1234567")
    )
    expect(salah.status).toBe(401)
    expect(await salah.json()).toEqual({ error: "Token hapus tidak cocok." })
    expect(fake.rows.has("hapus1234567")).toBe(true)
    expect(fake.log.removed).toEqual([])
  })

  it("menjawab 404 dan 410 seperti rute complete", async () => {
    pasangKlien([
      baris({
        id: "tua123456789",
        expires_at: new Date(Date.now() - 86_400_000).toISOString(),
      }),
    ])
    const hilang = await hapusStrip(
      new Request("http://localhost:3000/api/strips/tidakada1234", {
        method: "DELETE",
        headers: { "x-delete-token": TOKEN },
      }),
      konteks("tidakada1234")
    )
    expect(hilang.status).toBe(404)

    const kedalwarsa = await hapusStrip(
      new Request("http://localhost:3000/api/strips/tua123456789", {
        method: "DELETE",
        headers: { "x-delete-token": TOKEN },
      }),
      konteks("tua123456789")
    )
    expect(kedalwarsa.status).toBe(410)
  })

  it("menghapus berkas lalu menyisakan batu nisan saat token cocok", async () => {
    const fake = pasangKlien([
      baris({
        id: "punyaku12345",
        status: "complete",
        live_path: "strips/punyaku12345/live.webm",
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    ])
    const response = await hapusStrip(
      new Request("http://localhost:3000/api/strips/punyaku12345", {
        method: "DELETE",
        headers: { "x-delete-token": TOKEN },
      }),
      konteks("punyaku12345")
    )

    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
    expect(fake.log.removed).toEqual([
      "strips/punyaku12345/still.png",
      "strips/punyaku12345/live.webm",
    ])
    /* Barisnya tinggal sebagai batu nisan sampai token unggah kedaluwarsa:
       berkas yang diunggah setelah penghapusan tetap punya path yang diketahui
       pembersih, dan kuota pembatasan laju tidak kembali. */
    const sisa = fake.rows.get("punyaku12345")
    expect(sisa?.status).toBe("deleted")
    expect(sisa?.still_path).toBe("strips/punyaku12345/still.png")
    expect(
      Math.abs(Date.parse(String(sisa?.expires_at)) - (Date.now() + 3 * 3_600_000))
    ).toBeLessThan(5_000)

    /* Penghapusan kedua tidak menghapus batu nisannya. */
    const kedua = await hapusStrip(
      new Request("http://localhost:3000/api/strips/punyaku12345", {
        method: "DELETE",
        headers: { "x-delete-token": TOKEN },
      }),
      konteks("punyaku12345")
    )
    expect(kedua.status).toBe(404)
    expect(fake.rows.has("punyaku12345")).toBe(true)
  })
})

describe("GET /api/cron/purge", () => {
  function permintaanCron(bearer: string) {
    return new Request("http://localhost:3000/api/cron/purge", {
      headers: { authorization: `Bearer ${bearer}` },
    })
  }

  it("butuh rahasia pembersih", async () => {
    pasangKlien()
    vi.stubEnv("CRON_SECRET", "")
    const belumDiatur = await pembersih(permintaanCron("apa-saja"))
    expect(belumDiatur.status).toBe(500)

    vi.stubEnv("CRON_SECRET", "rahasia-uji")
    const salah = await pembersih(permintaanCron("bukan-rahasia"))
    expect(salah.status).toBe(401)
  })

  it("membuang baris kedaluwarsa, draf basi, dan batu nisan, berkasnya sekalian", async () => {
    const fake = pasangKlien([
      baris({
        id: "kedalwarsa2",
        status: "complete",
        expires_at: new Date(Date.now() - 86_400_000).toISOString(),
      }),
      baris({
        id: "drafbasi123",
        created_at: new Date(Date.now() - 30 * 3_600_000).toISOString(),
      }),
      baris({ id: "draffresh12" }),
      baris({
        id: "masihidup12",
        status: "complete",
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      }),
      /* Batu nisan dari penghapusan: berkasnya sudah hilang, barisnya menunggu
         masa tenggangnya lewat. */
      baris({
        id: "batunisan123",
        status: "deleted",
        expires_at: new Date(Date.now() - 3_600_000).toISOString(),
      }),
    ])
    vi.stubEnv("CRON_SECRET", "rahasia-uji")

    const response = await pembersih(permintaanCron("rahasia-uji"))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ purged: 3 })

    expect([...fake.rows.keys()].sort()).toEqual(["draffresh12", "masihidup12"])
    expect(fake.log.removed.sort()).toEqual([
      "strips/batunisan123/still.png",
      "strips/drafbasi123/still.png",
      "strips/kedalwarsa2/still.png",
    ])

    const lagi = await pembersih(permintaanCron("rahasia-uji"))
    expect(await lagi.json()).toEqual({ purged: 0 })
  })
})
