import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { rateKeyFor } from "@/lib/rateLimit"
import { relaySlotPath } from "@/lib/schemas"
import type { RelaySlot } from "@/lib/supabase/relays"
import { hashToken } from "@/lib/tokens"
import { RELAY_TTL_HOURS } from "@/lib/expiry"

/* Rute estafet diuji langsung sebagai fungsi dengan klien Supabase palsu:
   bentuk permintaan, kode status, dan efek sampingnya (baris, berkas, token)
   diperiksa tanpa proyek Supabase sungguhan. Konvensi dan alasan teknisnya
   sama dengan tests/api-strips.test.ts. */

const hoisted = vi.hoisted(() => ({ admin: null as unknown }))

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => hoisted.admin,
}))

import { GET as pembersih } from "@/app/api/cron/purge/route"
import { POST as klaimRelay } from "@/app/api/relays/[id]/claim/route"
import { POST as lengkapiRelay } from "@/app/api/relays/[id]/complete/route"
import { DELETE as hapusRelay } from "@/app/api/relays/[id]/route"
import { POST as buatRelay } from "@/app/api/relays/route"
import { POST as mintaStripRoute } from "@/app/api/relays/[id]/strip/route"

type Table = "strips" | "relays"
type Row = Record<string, unknown> & { id: string }

const TOKEN_PEMBUAT = "token-pembuat-uji"
const TOKEN_TAMU = "token-tamu-uji"
const ASAL = "1.2.3.4"

interface FakeOptions {
  strips?: Row[]
  relays?: Row[]
}

function barisRelay(overrides: Row): Row {
  const id = overrides.id
  const layout = (overrides.layout as string | undefined) ?? "strip-4"
  const count = layout === "strip-3" ? 3 : 4
  const slots: RelaySlot[] = Array.from({ length: count }, (_, index) => ({
    index,
    owner: index % 2 === 0 ? "host" : "guest",
    path: relaySlotPath(id, index),
  }))
  return {
    layout,
    slots,
    host_token_hash: hashToken(TOKEN_PEMBUAT),
    guest_token_hash: null,
    status: "waiting",
    rate_key: "",
    created_at: new Date().toISOString(),
    expires_at: new Date(
      Date.now() + RELAY_TTL_HOURS * 3_600_000
    ).toISOString(),
    ...overrides,
  }
}

function barisStrip(overrides: Row): Row {
  return {
    layout: "strip-4",
    still_path: `strips/${overrides.id}/still.png`,
    live_path: null,
    status: "draft",
    delete_token_hash: hashToken("token-hapus"),
    relay_id: null,
    rate_key: "",
    created_at: new Date().toISOString(),
    expires_at: null,
    ...overrides,
  }
}

function buatKlienPalsu(options: FakeOptions = {}) {
  const tables: Record<Table, Map<string, Row>> = {
    strips: new Map(),
    relays: new Map(),
  }
  for (const row of options.strips ?? []) {
    tables.strips.set(row.id, barisStrip(row))
  }
  for (const row of options.relays ?? []) {
    tables.relays.set(row.id, barisRelay(row))
  }

  const log = {
    removed: [] as string[],
    signedUploads: [] as string[],
    signedUrls: [] as string[],
  }

  function pembangun(
    table: Table,
    mode: "select" | "update" | "delete",
    patch: Record<string, unknown> = {},
    jumlah = false
  ) {
    const filters: ((row: Row) => boolean)[] = []
    let limit: number | null = null
    let denganBaris = false

    function terpilih(): Row[] {
      const found = [...tables[table].values()].filter((row) =>
        filters.every((saring) => saring(row))
      )
      return limit === null ? found : found.slice(0, limit)
    }

    const builder = {
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value)
        return builder
      },
      gt(column: string, value: unknown) {
        filters.push((row) => String(row[column] ?? "") > String(value))
        return builder
      },
      lte(column: string, value: unknown) {
        filters.push((row) => String(row[column] ?? "") <= String(value))
        return builder
      },
      not(column: string, operator: string, value: unknown) {
        filters.push((row) =>
          operator === "is" && value === null ? row[column] !== null : true
        )
        return builder
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]))
        return builder
      },
      limit(jumlahBaris: number) {
        limit = jumlahBaris
        return builder
      },
      select() {
        denganBaris = true
        return builder
      },
      maybeSingle() {
        return Promise.resolve({ data: terpilih()[0] ?? null, error: null })
      },
      then<T>(
        resolve: (value: {
          data: Row[] | null
          count?: number
          error: null
        }) => T
      ) {
        const found = terpilih()
        if (mode === "update") {
          for (const row of found) {
            Object.assign(row, patch)
          }
          return Promise.resolve({
            data: denganBaris ? found : null,
            error: null,
          }).then(resolve)
        }
        if (mode === "delete") {
          for (const row of found) {
            tables[table].delete(row.id)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        }
        return Promise.resolve({
          data: jumlah ? null : found,
          count: jumlah ? found.length : undefined,
          error: null,
        }).then(resolve)
      },
    }
    return builder
  }

  const client = {
    from(table: Table) {
      const defaults: Record<string, unknown> =
        table === "strips"
          ? {
              layout: "strip-4",
              still_path: null,
              live_path: null,
              status: "draft",
              delete_token_hash: "",
              relay_id: null,
              rate_key: "",
              created_at: new Date().toISOString(),
              expires_at: null,
            }
          : {
              slots: [],
              host_token_hash: "",
              guest_token_hash: null,
              status: "waiting",
              rate_key: "",
              created_at: new Date().toISOString(),
              expires_at: null,
            }
      return {
        insert(values: Row | Row[]) {
          for (const item of Array.isArray(values) ? values : [values]) {
            tables[table].set(item.id, { ...defaults, ...item })
          }
          return Promise.resolve({ error: null })
        },
        select(_columns: string, opts?: { head?: boolean }) {
          return pembangun(table, "select", {}, opts?.head === true)
        },
        update(patch: Row) {
          return pembangun(table, "update", patch)
        },
        delete() {
          return pembangun(table, "delete")
        },
      }
    },
    storage: {
      from(bucket: string) {
        expect(bucket).toBe("snapme")
        return {
          createSignedUploadUrl(path: string) {
            log.signedUploads.push(path)
            return Promise.resolve({
              data: { signedUrl: `https://storage.test/${path}`, token: "token-unggah", path },
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

  return { client, tables, log }
}

function pasangKlien(options: FakeOptions = {}) {
  const fake = buatKlienPalsu(options)
  hoisted.admin = fake.client
  return fake
}

/** HEAD berkas slot dijawab sehat, kecuali path yang disebut `hilang`. */
function pasangFetchSlot(hilang: string[] = []) {
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    const url = String(input)
    const missing = hilang.some((path) => url.includes(path))
    return Promise.resolve({
      ok: !missing,
      headers: new Headers({
        "content-length": String(missing ? 0 : 1024),
        "content-type": missing ? "text/plain" : "image/jpeg",
      }),
    } as Response)
  })
}

function permintaan(body?: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/relays", {
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

function sidang(alamat: string): string {
  const key = rateKeyFor(alamat)
  if (key === null) {
    throw new Error("garam pembatasan laju belum dipasang")
  }
  return key
}

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_SALT", "garam-uji")
  vi.stubEnv("CRON_SECRET", "rahasia-pembersih")
  pasangFetchSlot()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  hoisted.admin = null
})

describe("POST /api/relays", () => {
  it("membuat baris estafet dan URL unggah slot pembuat saja", async () => {
    const fake = pasangKlien()
    const response = await buatRelay(permintaan({ layout: "strip-4" }))

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      id: string
      hostToken: string
      expiresAt: string
      uploads: { index: number; path: string; token: string }[]
    }
    expect(body.id).toHaveLength(12)
    expect(body.uploads.map((upload) => upload.index)).toEqual([0, 2])
    expect(body.uploads.map((upload) => upload.path)).toEqual([
      relaySlotPath(body.id, 0),
      relaySlotPath(body.id, 2),
    ])
    expect(fake.log.signedUploads).toEqual([
      relaySlotPath(body.id, 0),
      relaySlotPath(body.id, 2),
    ])
    expect(new Date(body.expiresAt).getTime() - Date.now()).toBeGreaterThan(
      (RELAY_TTL_HOURS - 1) * 3_600_000
    )

    const row = fake.tables.relays.get(body.id)
    expect(row).toMatchObject({
      layout: "strip-4",
      status: "waiting",
      rate_key: sidang(ASAL),
      guest_token_hash: null,
    })
    /* Token mentah tidak pernah masuk basis data. */
    expect(JSON.stringify(row)).not.toContain(body.hostToken)
    /* Slot teman tidak diberi URL unggah. */
    expect(fake.log.signedUploads).not.toContain(relaySlotPath(body.id, 1))
  })

  it("menolak badan yang bukan JSON, layout tak dikenal, dan jenis isi lain", async () => {
    pasangKlien()
    const bukanJson = await buatRelay(permintaan("bukan-json"))
    expect(bukanJson.status).toBe(400)
    expect(await bukanJson.json()).toEqual({ error: "Permintaan tidak valid." })

    const layoutSalah = await buatRelay(permintaan({ layout: "strip-9" }))
    expect(layoutSalah.status).toBe(400)

    const lintasSitus = await buatRelay(
      permintaan('{"layout":"strip-4"}', { "content-type": "text/plain" })
    )
    expect(lintasSitus.status).toBe(400)
  })

  it("menolak melayani tanpa garam pembatasan laju dan tanpa basis data", async () => {
    pasangKlien()
    vi.stubEnv("RATE_LIMIT_SALT", "")
    const tanpaGaram = await buatRelay(permintaan({ layout: "strip-4" }))
    expect(tanpaGaram.status).toBe(503)

    vi.stubEnv("RATE_LIMIT_SALT", "garam-uji")
    hoisted.admin = null
    const tanpaKlien = await buatRelay(permintaan({ layout: "strip-4" }))
    expect(tanpaKlien.status).toBe(503)
  })

  it("membatasi 10 pembuatan estafet per jam untuk sidang yang sama", async () => {
    const baru = new Date().toISOString()
    const fake = pasangKlien({
      relays: Array.from({ length: 10 }, (_, index) =>
        barisRelay({ id: `lama${index}`, rate_key: sidang(ASAL), created_at: baru })
      ),
    })

    const ditolak = await buatRelay(permintaan({ layout: "strip-4" }))
    expect(ditolak.status).toBe(429)
    /* Baris yang baru dibuat dibatalkan lagi dan tidak ada URL unggah yang
       diberikan. */
    expect(fake.tables.relays.size).toBe(10)
    expect(fake.log.signedUploads).toEqual([])
  })
})

describe("POST /api/relays/[id]/claim", () => {
  it("memberikan giliran sekali dan memasang token tamu ter-hash", async () => {
    const fake = pasangKlien({ relays: [{ id: "relayklaim01" }] })
    const response = await klaimRelay(permintaan(), konteks("relayklaim01"))

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      guestToken: string
      relay: { id: string; layout: string; slots: { index: number; owner: string }[] }
    }
    expect(body.guestToken).not.toBe("")
    expect(body.relay.layout).toBe("strip-4")
    expect(body.relay.slots).toEqual([
      { index: 0, owner: "host" },
      { index: 1, owner: "guest" },
      { index: 2, owner: "host" },
      { index: 3, owner: "guest" },
    ])
    const row = fake.tables.relays.get("relayklaim01")
    expect(row?.status).toBe("claimed")
    expect(row?.guest_token_hash).toBe(hashToken(body.guestToken))
    expect(JSON.stringify(row)).not.toContain(body.guestToken)

    /* Giliran kedua tidak diberikan lagi. */
    const kedua = await klaimRelay(permintaan(), konteks("relayklaim01"))
    expect(kedua.status).toBe(409)
    expect(await kedua.json()).toEqual({ error: "Estafet ini sudah diambil." })
  })

  it("menjawab 404, 410, dan 409 sesuai keadaan barisnya", async () => {
    const kedaluwarsa = new Date(Date.now() - 60_000).toISOString()
    pasangKlien({
      relays: [
        { id: "relayklaim02", status: "claimed" },
        { id: "relayklaim03", status: "complete" },
        { id: "relayklaim04", expires_at: kedaluwarsa },
        { id: "relayklaim05", status: "cancelled", expires_at: null },
      ],
    })

    const hilang = await klaimRelay(permintaan(), konteks("tidakada1234"))
    expect(hilang.status).toBe(404)

    const terisi = await klaimRelay(permintaan(), konteks("relayklaim02"))
    expect(terisi.status).toBe(409)
    const selesai = await klaimRelay(permintaan(), konteks("relayklaim03"))
    expect(selesai.status).toBe(409)

    const tua = await klaimRelay(permintaan(), konteks("relayklaim04"))
    expect(tua.status).toBe(410)
    expect(await tua.json()).toEqual({
      error: "Estafet ini sudah kedaluwarsa.",
    })

    const batal = await klaimRelay(permintaan(), konteks("relayklaim05"))
    expect(batal.status).toBe(410)
    expect(await batal.json()).toEqual({
      error: "Estafet ini sudah dibatalkan.",
    })
  })

  it("menolak memberi giliran bila berkas pembuat belum lengkap", async () => {
    const fake = pasangKlien({ relays: [{ id: "relayklaim06" }] })
    pasangFetchSlot([relaySlotPath("relayklaim06", 2)])

    const response = await klaimRelay(permintaan(), konteks("relayklaim06"))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error: "Foto pembuat belum selesai diunggah. Coba lagi sebentar.",
    })
    /* Berkas yang gagal diperiksa dibuang, dan barisnya tetap menunggu. */
    expect(fake.log.removed).toEqual([relaySlotPath("relayklaim06", 2)])
    expect(fake.tables.relays.get("relayklaim06")?.status).toBe("waiting")
  })

  it("menolak permintaan tanpa jenis isi JSON", async () => {
    /* POST sederhana (form atau fetch `no-cors`) bisa dikirim lintas situs;
       tanpa gate ini giliran sekali pakai bisa dibakar pihak ketiga. */
    const fake = pasangKlien({ relays: [{ id: "relayklaim07" }] })
    const lintasSitus = await klaimRelay(
      permintaan(undefined, { "content-type": "text/plain" }),
      konteks("relayklaim07")
    )
    expect(lintasSitus.status).toBe(400)
    expect(await lintasSitus.json()).toEqual({
      error: "Permintaan tidak valid.",
    })
    expect(fake.tables.relays.get("relayklaim07")?.status).toBe("waiting")
  })
})

describe("POST /api/relays/[id]/complete", () => {
  function lengkapi(id: string, token: string | null = TOKEN_TAMU) {
    return lengkapiRelay(
      new Request(`http://localhost:3000/api/relays/${id}/complete`, {
        method: "POST",
        headers: token === null ? {} : { "x-relay-token": token },
      }),
      konteks(id)
    )
  }

  it("menuntaskan estafet dan membuat baris strip ber-relay_id", async () => {
    const fake = pasangKlien({
      relays: [
        { id: "relaytuntas1", status: "claimed", guest_token_hash: hashToken(TOKEN_TAMU) },
      ],
    })
    const response = await lengkapi("relaytuntas1")

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      stripId: string
      deleteToken: string
      upload: { path: string; token: string }
    }
    expect(body.upload.path).toBe(`strips/${body.stripId}/still.png`)
    expect(fake.log.signedUploads).toEqual([`strips/${body.stripId}/still.png`])

    expect(fake.tables.relays.get("relaytuntas1")?.status).toBe("complete")
    const strip = fake.tables.strips.get(body.stripId)
    expect(strip).toMatchObject({
      layout: "strip-4",
      status: "draft",
      still_path: `strips/${body.stripId}/still.png`,
      relay_id: "relaytuntas1",
      delete_token_hash: hashToken(body.deleteToken),
    })
    expect(JSON.stringify(strip)).not.toContain(body.deleteToken)
  })

  it("idempoten: penuntasan kedua mengembalikan strip yang sama", async () => {
    const fake = pasangKlien({
      relays: [
        { id: "relaytuntas2", status: "claimed", guest_token_hash: hashToken(TOKEN_TAMU) },
      ],
    })
    const pertama = await lengkapi("relaytuntas2")
    const body = (await pertama.json()) as { stripId: string }

    /* Setelah PNG-nya terunggah, complete strip menandai barisnya selesai. */
    const row = fake.tables.strips.get(body.stripId)
    Object.assign(row as Row, {
      status: "complete",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    })

    const kedua = await lengkapi("relaytuntas2")
    expect(kedua.status).toBe(200)
    expect(await kedua.json()).toEqual({
      stripId: body.stripId,
      expiresAt: row?.expires_at,
    })
    /* Tanpa permintaan unggah baru. */
    expect(fake.log.signedUploads).toHaveLength(1)
  })

  it("menerbitkan ulang unggahan bila drafnya belum sempat diunggah", async () => {
    const fake = pasangKlien({
      relays: [
        { id: "relaytuntas3", status: "claimed", guest_token_hash: hashToken(TOKEN_TAMU) },
      ],
    })
    const pertama = await lengkapi("relaytuntas3")
    const body = (await pertama.json()) as { stripId: string; deleteToken: string }

    const kedua = await lengkapi("relaytuntas3")
    expect(kedua.status).toBe(200)
    const ulang = (await kedua.json()) as {
      stripId: string
      deleteToken: string
      upload: { path: string }
    }
    expect(ulang.stripId).toBe(body.stripId)
    expect(ulang.deleteToken).not.toBe(body.deleteToken)
    expect(ulang.upload.path).toBe(`strips/${body.stripId}/still.png`)
    /* Token lama tidak berlaku lagi: hashnya diganti. */
    expect(fake.tables.strips.get(body.stripId)?.delete_token_hash).toBe(
      hashToken(ulang.deleteToken)
    )
  })

  it("menerbitkan draf baru bila strip estafetnya sudah dihapus", async () => {
    pasangKlien({
      relays: [
        { id: "relaytuntas4", status: "complete", guest_token_hash: hashToken(TOKEN_TAMU) },
      ],
      strips: [{ id: "striplama123", status: "deleted", relay_id: "relaytuntas4" }],
    })
    const response = await lengkapi("relaytuntas4")
    expect(response.status).toBe(200)
    const body = (await response.json()) as { stripId: string }
    expect(body.stripId).not.toBe("striplama123")
  })

  it("menolak token yang hilang atau salah, dan estafet yang belum diambil", async () => {
    pasangKlien({
      relays: [
        { id: "relaytuntas5", status: "claimed", guest_token_hash: hashToken(TOKEN_TAMU) },
        { id: "relaytuntas6", status: "waiting" },
      ],
    })
    const tanpaToken = await lengkapi("relaytuntas5", null)
    expect(tanpaToken.status).toBe(401)
    expect(await tanpaToken.json()).toEqual({
      error: "Token estafet tidak ada.",
    })

    const salah = await lengkapi("relaytuntas5", "token-palsu")
    expect(salah.status).toBe(401)
    expect(await salah.json()).toEqual({
      error: "Token estafet tidak cocok.",
    })

    const belum = await lengkapi("relaytuntas6")
    expect(belum.status).toBe(409)
    expect(await belum.json()).toEqual({ error: "Estafet ini sudah diambil." })
  })

  it("menjawab 422 beserta unggahan slot tamu yang belum ada", async () => {
    const fake = pasangKlien({
      relays: [
        { id: "relaytuntas7", status: "claimed", guest_token_hash: hashToken(TOKEN_TAMU) },
      ],
    })
    const hilang = relaySlotPath("relaytuntas7", 3)
    pasangFetchSlot([hilang])

    const response = await lengkapi("relaytuntas7")
    expect(response.status).toBe(422)
    const body = (await response.json()) as {
      error: string
      uploads: { index: number; path: string }[]
    }
    expect(body.error).toBe(
      "Berkas tidak lolos pemeriksaan. Isi ulang foto yang kurang."
    )
    expect(body.uploads).toEqual([{ index: 3, path: hilang, token: "token-unggah" }])
    /* Belum menang: estafetnya tetap `claimed` dan tidak ada strip baru. */
    expect(fake.tables.relays.get("relaytuntas7")?.status).toBe("claimed")
    expect(fake.tables.strips.size).toBe(0)

    /* Setelah foto temannya terunggah, penuntasan kedua berhasil. */
    pasangFetchSlot()
    const kedua = await lengkapi("relaytuntas7")
    expect(kedua.status).toBe(200)
  })

  it("menjawab 422 tanpa unggahan bila berkas pembuatnya yang hilang", async () => {
    const fake = pasangKlien({
      relays: [
        { id: "relaytuntas8", status: "claimed", guest_token_hash: hashToken(TOKEN_TAMU) },
      ],
    })
    pasangFetchSlot([relaySlotPath("relaytuntas8", 0)])

    const response = await lengkapi("relaytuntas8")
    expect(response.status).toBe(422)
    const body = (await response.json()) as Record<string, unknown>
    expect("uploads" in body).toBe(false)
    expect(fake.tables.relays.get("relaytuntas8")?.status).toBe("claimed")
  })

  it("410 menolak estafet yang kedaluwarsa atau dibatalkan", async () => {
    const kedaluwarsa = new Date(Date.now() - 60_000).toISOString()
    const fake = pasangKlien({
      relays: [
        {
          id: "relaytuntas9",
          status: "claimed",
          guest_token_hash: hashToken(TOKEN_TAMU),
          expires_at: kedaluwarsa,
        },
        {
          id: "relaytunta10",
          status: "cancelled",
          guest_token_hash: hashToken(TOKEN_TAMU),
        },
      ],
    })
    const tua = await lengkapi("relaytuntas9")
    expect(tua.status).toBe(410)
    const batal = await lengkapi("relaytunta10")
    expect(batal.status).toBe(410)
    expect(fake.tables.strips.size).toBe(0)
  })
})

describe("DELETE /api/relays/[id]", () => {
  function hapus(id: string, token: string | null = TOKEN_PEMBUAT) {
    return hapusRelay(
      new Request(`http://localhost:3000/api/relays/${id}`, {
        method: "DELETE",
        headers: token === null ? {} : { "x-relay-token": token },
      }),
      konteks(id)
    )
  }

  it("menghapus berkas slot, menomborkan stripnya, dan membatalkan barisnya", async () => {
    const fake = pasangKlien({
      relays: [{ id: "relaybatal1", status: "complete" }],
      strips: [
        {
          id: "stripbatal12",
          status: "complete",
          relay_id: "relaybatal1",
          live_path: "strips/stripbatal12/live.webm",
        },
      ],
    })

    const response = await hapus("relaybatal1")
    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
    expect(fake.log.removed.sort()).toEqual(
      [
        relaySlotPath("relaybatal1", 0),
        relaySlotPath("relaybatal1", 1),
        relaySlotPath("relaybatal1", 2),
        relaySlotPath("relaybatal1", 3),
        "strips/stripbatal12/live.webm",
        "strips/stripbatal12/still.png",
      ].sort()
    )
    expect(fake.tables.strips.get("stripbatal12")?.status).toBe("deleted")
    const relay = fake.tables.relays.get("relaybatal1")
    expect(relay?.status).toBe("cancelled")
    /* Masa tenggang: barisnya masih ada sampai pembersih membuangnya. */
    expect(new Date(String(relay?.expires_at)).getTime()).toBeGreaterThan(
      Date.now()
    )

    /* Idempoten: permintaan kedua tidak mengulang penghapusan berkas. */
    const kedua = await hapus("relaybatal1")
    expect(kedua.status).toBe(204)
    expect(fake.log.removed).toHaveLength(6)
  })

  it("menolak token yang hilang, salah, dan estafet yang kedaluwarsa", async () => {
    pasangKlien({
      relays: [
        { id: "relaybatal2" },
        { id: "relaybatal3", expires_at: new Date(Date.now() - 60_000).toISOString() },
      ],
    })
    const tanpaToken = await hapus("relaybatal2", null)
    expect(tanpaToken.status).toBe(401)

    const salah = await hapus("relaybatal2", TOKEN_TAMU)
    expect(salah.status).toBe(401)
    expect(await salah.json()).toEqual({
      error: "Token estafet tidak cocok.",
    })

    const tua = await hapus("relaybatal3")
    expect(tua.status).toBe(410)

    const hilang = await hapus("tidakada1234")
    expect(hilang.status).toBe(404)
  })
})

describe("POST /api/relays/[id]/strip", () => {
  function mintaStrip(id: string, token: string | null = TOKEN_PEMBUAT) {
    return mintaStripRoute(
      new Request(`http://localhost:3000/api/relays/${id}/strip`, {
        method: "POST",
        headers: token === null ? {} : { "x-relay-token": token },
      }),
      konteks(id)
    )
  }

  it("menyerahkan tautan strip dan URL foto slot hanya ke pemegang token", async () => {
    const selesai = new Date(Date.now() + 86_400_000).toISOString()
    const fake = pasangKlien({
      relays: [
        {
          id: "relaystrip01",
          status: "complete",
          guest_token_hash: hashToken(TOKEN_TAMU),
        },
      ],
      strips: [
        {
          id: "stripestafet",
          status: "complete",
          relay_id: "relaystrip01",
          expires_at: selesai,
        },
      ],
    })

    const pembuat = await mintaStrip("relaystrip01", TOKEN_PEMBUAT)
    expect(pembuat.status).toBe(200)
    const body = (await pembuat.json()) as {
      stripId: string
      expiresAt: string
      role: string
      slots: { index: number; url: string }[]
    }
    expect(body.stripId).toBe("stripestafet")
    expect(body.expiresAt).toBe(selesai)
    expect(body.role).toBe("host")
    expect(body.slots.map((slot) => slot.index)).toEqual([0, 1, 2, 3])
    expect(body.slots[0]?.url).toContain(relaySlotPath("relaystrip01", 0))
    /* URL-nya berumur pendek, bukan tautan permanen. */
    expect(fake.log.signedUrls).toHaveLength(4)

    const teman = await mintaStrip("relaystrip01", TOKEN_TAMU)
    expect(teman.status).toBe(200)
    const temanBody = (await teman.json()) as { role: string }
    expect(temanBody.role).toBe("guest")
  })

  it("menolak token yang hilang atau salah, dan estafet yang belum selesai", async () => {
    pasangKlien({
      relays: [
        {
          id: "relaystrip02",
          status: "complete",
          guest_token_hash: hashToken(TOKEN_TAMU),
        },
        { id: "relaystrip03", status: "claimed" },
        { id: "relaystrip04", status: "waiting" },
      ],
    })

    const tanpaToken = await mintaStrip("relaystrip02", null)
    expect(tanpaToken.status).toBe(401)
    expect(await tanpaToken.json()).toEqual({
      error: "Token estafet tidak ada.",
    })

    const salah = await mintaStrip("relaystrip02", "token-palsu")
    expect(salah.status).toBe(401)
    expect(await salah.json()).toEqual({
      error: "Token estafet tidak cocok.",
    })

    const belum = await mintaStrip("relaystrip03")
    expect(belum.status).toBe(409)
    expect(await belum.json()).toEqual({
      error: "Estafet ini belum selesai.",
    })
    const menunggu = await mintaStrip("relaystrip04")
    expect(menunggu.status).toBe(409)
  })

  it("menjawab 404, 410, dan stripId null untuk strip yang sudah dihapus", async () => {
    const kedaluwarsa = new Date(Date.now() - 60_000).toISOString()
    pasangKlien({
      relays: [
        {
          id: "relaystrip05",
          status: "complete",
          guest_token_hash: hashToken(TOKEN_TAMU),
        },
        {
          id: "relaystrip06",
          status: "complete",
          guest_token_hash: hashToken(TOKEN_TAMU),
          expires_at: kedaluwarsa,
        },
        {
          id: "relaystrip07",
          status: "cancelled",
          guest_token_hash: hashToken(TOKEN_TAMU),
        },
        {
          id: "relaystrip08",
          status: "complete",
          guest_token_hash: hashToken(TOKEN_TAMU),
        },
      ],
      strips: [
        { id: "striphapus12", status: "deleted", relay_id: "relaystrip08" },
      ],
    })

    const hilang = await mintaStrip("tidakada1234")
    expect(hilang.status).toBe(404)

    const tua = await mintaStrip("relaystrip06")
    expect(tua.status).toBe(410)
    const batal = await mintaStrip("relaystrip07")
    expect(batal.status).toBe(410)

    const dihapus = await mintaStrip("relaystrip08")
    expect(dihapus.status).toBe(200)
    const body = (await dihapus.json()) as {
      stripId: string | null
      slots: unknown[]
    }
    expect(body.stripId).toBeNull()
    expect(body.slots).toEqual([])
  })
})

describe("GET /api/cron/purge untuk estafet", () => {
  it("membuang estafet kedaluwarsa beserta berkas slotnya", async () => {
    const kedaluwarsa = new Date(Date.now() - 60_000).toISOString()
    const fake = pasangKlien({
      relays: [
        { id: "relaypurge12", expires_at: kedaluwarsa, status: "claimed" },
        { id: "relaypurge13", status: "waiting" },
      ],
    })

    const response = await pembersih(
      new Request("http://localhost:3000/api/cron/purge", {
        headers: { authorization: "Bearer rahasia-pembersih" },
      })
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ purged: 1 })
    expect(fake.tables.relays.has("relaypurge12")).toBe(false)
    expect(fake.tables.relays.has("relaypurge13")).toBe(true)
    expect(fake.log.removed.sort()).toEqual(
      [
        relaySlotPath("relaypurge12", 0),
        relaySlotPath("relaypurge12", 1),
        relaySlotPath("relaypurge12", 2),
        relaySlotPath("relaypurge12", 3),
      ].sort()
    )
  })
})
