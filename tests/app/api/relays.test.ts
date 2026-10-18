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

import type {
  RelayRow,
  RelaySlot,
  RelayStatus,
  StripRow,
  StripStatus,
} from "@/server/db/rows"
import { RELAY_TTL_HOURS, relayExpiry } from "@/server/expiry"
import type { LayoutId } from "@/lib/layouts"

import { relaySlotsFor } from "@/lib/relaySlots"
import {
  RELAY_SLOT_MIME,
  relaySlotPath,
  STILL_MIME,
  stripStillPath,
} from "@/lib/schemas"
import { hashToken } from "@/server/tokens"
import { createDbEnv, putObject, truncateAll, type DbEnv } from "../../support/harness"
import {
  konteksRute,
  kosongkanBucket,
  permintaanBearer,
  permintaanKe,
  sidangLaju,
} from "../../support/route"

/* M10: rute estafet diuji terhadap binding Cloudflare SUNGGUHAN (D1, R2, dan
   KV dari miniflare lewat tests/support/harness.ts), menggantikan
   tests/api-relays.test.ts yang memakai klien Supabase palsu. Seluruh kasus
   perilaku berkas lama dipertahankan; perbedaan mekaniknya:

   - baris `relays`/`strips` disisipkan langsung ke D1, bukan lewat tabel palsu;
   - verifikasi berkas slot memakai objek R2 sungguhan: slot "hilang" cukup
     tidak ditaruh di bucket, dan slot yang gagal diperiksa benar-benar dibuang
     dari bucket (bisa dipastikan dengan `bucket.head`);
   - URL unggah/baca kini presigned S3 (aws4fetch, offline) dengan kredensial
     palsu; jaminannya `X-Amz-Signature` ada di URL. */

const hoisted = vi.hoisted(() => ({ bindings: null as unknown }))

vi.mock("@/server/cloudflare", () => ({
  getBindings: () => hoisted.bindings,
}))

import { GET as pembersih } from "@/app/api/cron/purge/route"
import { POST as klaimRelay } from "@/app/api/relays/[id]/claim/route"
import { POST as lengkapiRelay } from "@/app/api/relays/[id]/complete/route"
import { DELETE as hapusRelay } from "@/app/api/relays/[id]/route"
import { POST as buatRelay } from "@/app/api/relays/route"
import { POST as mintaStripRoute } from "@/app/api/relays/[id]/strip/route"

const TOKEN_PEMBUAT = "token-pembuat-uji"
const TOKEN_TAMU = "token-tamu-uji"
const ASAL = "1.2.3.4"

let env: DbEnv

/* ---------------------------------------------------------------- bantuan */

function slotsRelay(id: string, layout: LayoutId): RelaySlot[] {
  return relaySlotsFor(layout).map((slot) => ({
    ...slot,
    path: relaySlotPath(id, slot.index),
  }))
}

/** Objek slot yang lolos verifikasi: JPEG di bawah batas 1 MB. */
function isiSlot(
  id: string,
  index: number,
  contentType: string = RELAY_SLOT_MIME
): Promise<void> {
  return putObject(env.bucket, relaySlotPath(id, index), contentType, 1024)
}

interface RelaySeed {
  id: string
  layout?: LayoutId
  status?: RelayStatus
  hostTokenHash?: string
  guestTokenHash?: string | null
  stripId?: string | null
  rateKey?: string
  createdAt?: string
  expiresAt?: string | null
}

async function sisipRelay(overrides: RelaySeed): Promise<void> {
  const layout = overrides.layout ?? "strip-4"
  await env.db
    .prepare(
      `INSERT INTO relays (
         id, layout, slots, host_token_hash, guest_token_hash, status,
         strip_id, rate_key, created_at, expires_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    )
    .bind(
      overrides.id,
      layout,
      JSON.stringify(slotsRelay(overrides.id, layout)),
      overrides.hostTokenHash ?? hashToken(TOKEN_PEMBUAT),
      overrides.guestTokenHash ?? null,
      overrides.status ?? "waiting",
      overrides.stripId ?? null,
      overrides.rateKey ?? "",
      overrides.createdAt ?? new Date().toISOString(),
      overrides.expiresAt === undefined
        ? relayExpiry(new Date()).toISOString()
        : overrides.expiresAt
    )
    .run()
}

interface StripSeed {
  id: string
  layout?: string
  status?: StripStatus
  stillPath?: string | null
  livePath?: string | null
  deleteTokenHash?: string
  relayId?: string | null
  rateKey?: string
  createdAt?: string
  expiresAt?: string | null
}

async function sisipStrip(overrides: StripSeed): Promise<void> {
  await env.db
    .prepare(
      `INSERT INTO strips (
         id, layout, still_path, live_path, status, delete_token_hash,
         relay_id, rate_key, created_at, expires_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    )
    .bind(
      overrides.id,
      overrides.layout ?? "strip-4",
      overrides.stillPath === undefined
        ? stripStillPath(overrides.id)
        : overrides.stillPath,
      overrides.livePath ?? null,
      overrides.status ?? "draft",
      overrides.deleteTokenHash ?? hashToken("token-hapus-uji"),
      overrides.relayId ?? null,
      overrides.rateKey ?? "",
      overrides.createdAt ?? new Date().toISOString(),
      overrides.expiresAt ?? null
    )
    .run()
}

async function bacaRelay(id: string): Promise<RelayRow | null> {
  return await env.db
    .prepare("SELECT * FROM relays WHERE id = ?1")
    .bind(id)
    .first<RelayRow>()
}

async function bacaStrip(id: string): Promise<StripRow | null> {
  return await env.db
    .prepare("SELECT * FROM strips WHERE id = ?1")
    .bind(id)
    .first<StripRow>()
}

async function hitungStrip(relayId: string): Promise<number> {
  const row = await env.db
    .prepare("SELECT COUNT(*) AS n FROM strips WHERE relay_id = ?1")
    .bind(relayId)
    .first<{ n: number }>()
  return row?.n ?? 0
}

/** POST /api/relays dari alamat uji tetap. */
const permintaan = permintaanKe("/api/relays", ASAL)

/* ------------------------------------------------------------- siklus uji */

beforeAll(async () => {
  env = await createDbEnv()
})

afterAll(async () => {
  await env.dispose()
})

beforeEach(async () => {
  process.env.RATE_LIMIT_SALT = "garam-uji"
  process.env.CRON_SECRET = "rahasia-pembersih"
  hoisted.bindings = {
    db: env.db,
    bucket: env.bucket,
    kv: env.kv,
    s3: {
      accountId: "uji",
      accessKeyId: "AKIAUJI",
      secretAccessKey: "rahasia-uji",
    },
  }
  await truncateAll(env.db)
  await kosongkanBucket(env.bucket)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/relays", () => {
  it("membuat baris estafet dan URL unggah slot pembuat saja", async () => {
    const response = await buatRelay(permintaan({ layout: "strip-4" }))

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      id: string
      hostToken: string
      expiresAt: string
      uploads: { index: number; path: string; url: string }[]
    }
    expect(body.id).toHaveLength(12)
    expect(body.uploads.map((upload) => upload.index)).toEqual([0, 2])
    expect(body.uploads.map((upload) => upload.path)).toEqual([
      relaySlotPath(body.id, 0),
      relaySlotPath(body.id, 2),
    ])
    /* Slot teman tidak diberi URL unggah; hanya slot pembuat. */
    for (const upload of body.uploads) {
      expect(upload.url).toContain("X-Amz-Signature")
      expect(upload.url).toContain(upload.path)
    }
    expect(new Date(body.expiresAt).getTime() - Date.now()).toBeGreaterThan(
      (RELAY_TTL_HOURS - 1) * 3_600_000
    )

    const row = await bacaRelay(body.id)
    expect(row).toMatchObject({
      layout: "strip-4",
      status: "waiting",
      rate_key: sidangLaju(ASAL),
      guest_token_hash: null,
      strip_id: null,
    })
    /* Token mentah tidak pernah masuk basis data. */
    expect(JSON.stringify(row)).not.toContain(body.hostToken)
  })

  it("menolak badan yang bukan JSON, layout tak dikenal, dan jenis isi lain", async () => {
    const bukanJson = await buatRelay(permintaan("bukan-json"))
    expect(bukanJson.status).toBe(400)
    expect(await bukanJson.json()).toEqual({ error: "Permintaan tidak valid." })

    const layoutSalah = await buatRelay(permintaan({ layout: "strip-9" }))
    expect(layoutSalah.status).toBe(400)

    const jenisSalah = await buatRelay(
      permintaan('{"layout":"strip-4"}', { "content-type": "text/plain" })
    )
    expect(jenisSalah.status).toBe(400)

    /* M9: gate Origin/Sec-Fetch-Site, tidak bergantung perilaku peramban. */
    const originLain = await buatRelay(
      permintaan({ layout: "strip-4" }, { origin: "https://jahat.example" })
    )
    expect(originLain.status).toBe(400)

    const lintasSitus = await buatRelay(
      permintaan({ layout: "strip-4" }, { "sec-fetch-site": "cross-site" })
    )
    expect(lintasSitus.status).toBe(400)
  })

  it("menolak melayani tanpa garam pembatasan laju dan tanpa binding", async () => {
    vi.stubEnv("RATE_LIMIT_SALT", "")
    const tanpaGaram = await buatRelay(permintaan({ layout: "strip-4" }))
    expect(tanpaGaram.status).toBe(503)

    vi.stubEnv("RATE_LIMIT_SALT", "garam-uji")
    hoisted.bindings = null
    const tanpaBinding = await buatRelay(permintaan({ layout: "strip-4" }))
    expect(tanpaBinding.status).toBe(503)
  })

  it("membatasi 10 pembuatan estafet per jam untuk sidang yang sama", async () => {
    const baru = new Date().toISOString()
    for (let index = 0; index < 10; index += 1) {
      await sisipRelay({
        id: `lama${index}`,
        rateKey: sidangLaju(ASAL),
        createdAt: baru,
      })
    }

    const ditolak = await buatRelay(permintaan({ layout: "strip-4" }))
    expect(ditolak.status).toBe(429)
    /* Baris yang baru dibuat dibatalkan lagi: kuota tidak bertambah. */
    const jumlah = await env.db
      .prepare("SELECT COUNT(*) AS n FROM relays")
      .first<{ n: number }>()
    expect(jumlah?.n).toBe(10)
  })
})

describe("POST /api/relays/[id]/claim", () => {
  it("memberikan giliran sekali dan memasang token tamu ter-hash", async () => {
    await sisipRelay({ id: "relayklaim01" })
    await isiSlot("relayklaim01", 0)
    await isiSlot("relayklaim01", 2)

    const response = await klaimRelay(permintaan(), konteksRute("relayklaim01"))
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      guestToken: string
      relay: {
        id: string
        layout: string
        slots: { index: number; owner: string }[]
      }
    }
    expect(body.guestToken).not.toBe("")
    expect(body.relay.layout).toBe("strip-4")
    expect(body.relay.slots).toEqual([
      { index: 0, owner: "host" },
      { index: 1, owner: "guest" },
      { index: 2, owner: "host" },
      { index: 3, owner: "guest" },
    ])

    const row = await bacaRelay("relayklaim01")
    expect(row?.status).toBe("claimed")
    expect(row?.guest_token_hash).toBe(hashToken(body.guestToken))
    expect(JSON.stringify(row)).not.toContain(body.guestToken)

    /* Giliran kedua tidak diberikan lagi. */
    const kedua = await klaimRelay(permintaan(), konteksRute("relayklaim01"))
    expect(kedua.status).toBe(409)
    expect(await kedua.json()).toEqual({ error: "Estafet ini sudah diambil." })
  })

  it("memberikan giliran tepat sekali saat dua permintaan klaim bersamaan", async () => {
    await sisipRelay({ id: "relayklaim08" })
    await isiSlot("relayklaim08", 0)
    await isiSlot("relayklaim08", 2)

    /* Gerbang atomik `claimRelayOnce`: hanya satu UPDATE yang mengubah baris. */
    const [pertama, kedua] = await Promise.all([
      klaimRelay(permintaan(), konteksRute("relayklaim08")),
      klaimRelay(permintaan(), konteksRute("relayklaim08")),
    ])

    expect([pertama.status, kedua.status].sort()).toEqual([200, 409])
    const menang = pertama.status === 200 ? pertama : kedua
    const kalah = pertama.status === 200 ? kedua : pertama
    const body = (await menang.json()) as { guestToken: string }
    expect(body.guestToken).not.toBe("")
    expect(await kalah.json()).toEqual({ error: "Estafet ini sudah diambil." })

    const row = await bacaRelay("relayklaim08")
    expect(row?.status).toBe("claimed")
    expect(row?.guest_token_hash).toBe(hashToken(body.guestToken))
  })

  it("menjawab 404, 410, dan 409 sesuai keadaan barisnya", async () => {
    const kedaluwarsa = new Date(Date.now() - 60_000).toISOString()
    await sisipRelay({ id: "relayklaim02", status: "claimed" })
    await sisipRelay({ id: "relayklaim03", status: "complete" })
    await sisipRelay({ id: "relayklaim04", expiresAt: kedaluwarsa })
    await sisipRelay({ id: "relayklaim05", status: "cancelled", expiresAt: null })

    const hilang = await klaimRelay(permintaan(), konteksRute("tidakada1234"))
    expect(hilang.status).toBe(404)

    const terisi = await klaimRelay(permintaan(), konteksRute("relayklaim02"))
    expect(terisi.status).toBe(409)
    const selesai = await klaimRelay(permintaan(), konteksRute("relayklaim03"))
    expect(selesai.status).toBe(409)

    const tua = await klaimRelay(permintaan(), konteksRute("relayklaim04"))
    expect(tua.status).toBe(410)
    expect(await tua.json()).toEqual({
      error: "Estafet ini sudah kedaluwarsa.",
    })

    const batal = await klaimRelay(permintaan(), konteksRute("relayklaim05"))
    expect(batal.status).toBe(410)
    expect(await batal.json()).toEqual({
      error: "Estafet ini sudah dibatalkan.",
    })
  })

  it("menolak memberi giliran bila berkas pembuat belum lengkap", async () => {
    await sisipRelay({ id: "relayklaim06" })
    await isiSlot("relayklaim06", 0)
    /* Jenis berkas yang salah = tidak lolos verifikasi bucket. */
    await isiSlot("relayklaim06", 2, "image/png")

    const response = await klaimRelay(permintaan(), konteksRute("relayklaim06"))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error: "Foto pembuat belum selesai diunggah. Coba lagi sebentar.",
    })
    /* Berkas yang gagal diperiksa dibuang, dan barisnya tetap menunggu. */
    expect(await env.bucket.head(relaySlotPath("relayklaim06", 2))).toBeNull()
    expect(
      await env.bucket.head(relaySlotPath("relayklaim06", 0))
    ).not.toBeNull()
    expect((await bacaRelay("relayklaim06"))?.status).toBe("waiting")
  })

  it("menolak permintaan tanpa jenis isi JSON", async () => {
    /* POST sederhana (form atau fetch `no-cors`) bisa dikirim lintas situs;
       tanpa gate ini giliran sekali pakai bisa dibakar pihak ketiga. */
    await sisipRelay({ id: "relayklaim07" })
    const lintasSitus = await klaimRelay(
      permintaan(undefined, { "content-type": "text/plain" }),
      konteksRute("relayklaim07")
    )
    expect(lintasSitus.status).toBe(400)
    expect(await lintasSitus.json()).toEqual({
      error: "Permintaan tidak valid.",
    })
    expect((await bacaRelay("relayklaim07"))?.status).toBe("waiting")
  })
})

describe("POST /api/relays/[id]/complete", () => {
  function lengkapi(id: string, token: string | null = TOKEN_TAMU) {
    return lengkapiRelay(
      new Request(`http://localhost:3000/api/relays/${id}/complete`, {
        method: "POST",
        headers: token === null ? {} : { "x-relay-token": token },
      }),
      konteksRute(id)
    )
  }

  async function isiSemuaSlot(id: string): Promise<void> {
    for (const slot of slotsRelay(id, "strip-4")) {
      await isiSlot(id, slot.index)
    }
  }

  it("menuntaskan estafet dan membuat baris strip ber-relay_id", async () => {
    await sisipRelay({
      id: "relaytuntas1",
      status: "claimed",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await isiSemuaSlot("relaytuntas1")

    const response = await lengkapi("relaytuntas1")
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      stripId: string
      deleteToken: string
      upload: { path: string; url: string }
    }
    expect(body.upload.path).toBe(stripStillPath(body.stripId))
    expect(body.upload.url).toContain("X-Amz-Signature")
    expect(body.upload.url).toContain(body.upload.path)

    expect((await bacaRelay("relaytuntas1"))?.status).toBe("complete")
    const strip = await bacaStrip(body.stripId)
    expect(strip).toMatchObject({
      layout: "strip-4",
      status: "draft",
      still_path: stripStillPath(body.stripId),
      relay_id: "relaytuntas1",
      delete_token_hash: hashToken(body.deleteToken),
    })
    expect(JSON.stringify(strip)).not.toContain(body.deleteToken)
  })

  it("gerbang penuntasan: dua penuntasan bersamaan menghasilkan satu strip", async () => {
    await sisipRelay({
      id: "relaytuntas12",
      status: "claimed",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await isiSemuaSlot("relaytuntas12")

    /* Gerbang atomik `completeRelayOnce`: yang kalah balapan dijawab 409. */
    const [pertama, kedua] = await Promise.all([
      lengkapi("relaytuntas12"),
      lengkapi("relaytuntas12"),
    ])

    expect([pertama.status, kedua.status].sort()).toEqual([200, 409])
    const menang = pertama.status === 200 ? pertama : kedua
    const body = (await menang.json()) as { stripId: string }
    expect((await bacaRelay("relaytuntas12"))?.status).toBe("complete")
    expect(await hitungStrip("relaytuntas12")).toBe(1)
    expect((await bacaStrip(body.stripId))?.status).toBe("draft")
  })

  it("idempoten: penuntasan kedua mengembalikan strip yang sama", async () => {
    await sisipRelay({
      id: "relaytuntas2",
      status: "claimed",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await isiSemuaSlot("relaytuntas2")

    const pertama = await lengkapi("relaytuntas2")
    const body = (await pertama.json()) as { stripId: string }

    /* Setelah PNG-nya terunggah, complete strip menandai barisnya selesai. */
    const selesai = new Date(Date.now() + 86_400_000).toISOString()
    await env.db
      .prepare("UPDATE strips SET status = 'complete', expires_at = ?2 WHERE id = ?1")
      .bind(body.stripId, selesai)
      .run()

    const kedua = await lengkapi("relaytuntas2")
    expect(kedua.status).toBe(200)
    expect(await kedua.json()).toEqual({
      stripId: body.stripId,
      expiresAt: selesai,
    })
    /* Tanpa draf atau permintaan unggah baru. */
    expect(await hitungStrip("relaytuntas2")).toBe(1)
  })

  it("menerbitkan ulang unggahan bila drafnya belum sempat diunggah", async () => {
    await sisipRelay({
      id: "relaytuntas3",
      status: "claimed",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await isiSemuaSlot("relaytuntas3")

    const pertama = await lengkapi("relaytuntas3")
    const body = (await pertama.json()) as {
      stripId: string
      deleteToken: string
    }

    const kedua = await lengkapi("relaytuntas3")
    expect(kedua.status).toBe(200)
    const ulang = (await kedua.json()) as {
      stripId: string
      deleteToken: string
      upload: { path: string; url: string }
    }
    expect(ulang.stripId).toBe(body.stripId)
    expect(ulang.deleteToken).not.toBe(body.deleteToken)
    expect(ulang.upload.path).toBe(stripStillPath(body.stripId))
    expect(ulang.upload.url).toContain("X-Amz-Signature")
    /* Token lama tidak berlaku lagi: hashnya diganti. */
    expect((await bacaStrip(body.stripId))?.delete_token_hash).toBe(
      hashToken(ulang.deleteToken)
    )
    expect(await hitungStrip("relaytuntas3")).toBe(1)
  })

  it("menerbitkan draf baru bila strip estafetnya sudah dihapus", async () => {
    await sisipRelay({
      id: "relaytuntas4",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await sisipStrip({
      id: "striplama123",
      status: "deleted",
      relayId: "relaytuntas4",
    })

    const response = await lengkapi("relaytuntas4")
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      stripId: string
      upload: { url: string }
    }
    expect(body.stripId).not.toBe("striplama123")
    expect(body.upload.url).toContain("X-Amz-Signature")
    expect((await bacaRelay("relaytuntas4"))?.strip_id).toBe(body.stripId)
    expect((await bacaStrip(body.stripId))?.status).toBe("draft")
  })

  it("membuka gerbang strip_id bila strip pemenangnya sudah dihapus", async () => {
    await sisipRelay({
      id: "relaytuntas9",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
      stripId: "striplama456",
    })
    await sisipStrip({
      id: "striplama456",
      status: "deleted",
      relayId: "relaytuntas9",
    })

    const response = await lengkapi("relaytuntas9")
    expect(response.status).toBe(200)
    const body = (await response.json()) as { stripId: string }
    expect(body.stripId).not.toBe("striplama456")
    expect((await bacaRelay("relaytuntas9"))?.strip_id).toBe(body.stripId)
  })

  it("hanya melahirkan satu draf strip saat dua penuntasan pemulihan berbarengan", async () => {
    await sisipRelay({
      id: "relaytuntas10",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })

    const [pertama, kedua] = await Promise.all([
      lengkapi("relaytuntas10"),
      lengkapi("relaytuntas10"),
    ])

    expect(pertama.status).toBe(200)
    expect(kedua.status).toBe(200)
    const a = (await pertama.json()) as { stripId: string }
    const b = (await kedua.json()) as { stripId: string }
    expect(b.stripId).toBe(a.stripId)

    /* Yang kalah balapan benar-benar membuang drafnya: satu baris strip. */
    expect(await hitungStrip("relaytuntas10")).toBe(1)
    expect((await bacaRelay("relaytuntas10"))?.strip_id).toBe(a.stripId)
  })

  it("memakai strip di gerbang, bukan draf sisa yang menunjuk relay yang sama", async () => {
    const selesai = new Date(Date.now() + 86_400_000).toISOString()
    await sisipRelay({
      id: "relaytuntas11",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
      stripId: "pemenang01",
    })
    await sisipStrip({
      id: "pemenang01",
      status: "complete",
      relayId: "relaytuntas11",
      expiresAt: selesai,
    })
    await sisipStrip({
      id: "sisa01",
      status: "draft",
      relayId: "relaytuntas11",
    })

    const response = await lengkapi("relaytuntas11")
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      stripId: "pemenang01",
      expiresAt: selesai,
    })
    /* Tidak ada draf baru yang lahir untuk draf sisa itu. */
    expect(await hitungStrip("relaytuntas11")).toBe(2)
    expect((await bacaStrip("sisa01"))?.status).toBe("draft")
  })

  it("menolak token yang hilang atau salah, dan estafet yang belum diambil", async () => {
    await sisipRelay({
      id: "relaytuntas5",
      status: "claimed",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await sisipRelay({ id: "relaytuntas6", status: "waiting" })

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

    const hilang = await lengkapi("tidakada1234")
    expect(hilang.status).toBe(404)
  })

  it("menjawab 422 beserta unggahan slot tamu yang belum ada", async () => {
    await sisipRelay({
      id: "relaytuntas7",
      status: "claimed",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await isiSlot("relaytuntas7", 0)
    await isiSlot("relaytuntas7", 1)
    await isiSlot("relaytuntas7", 2)
    /* Slot teman terakhir (index 3) belum diunggah. */

    const response = await lengkapi("relaytuntas7")
    expect(response.status).toBe(422)
    const body = (await response.json()) as {
      error: string
      uploads: { index: number; path: string; url: string }[]
    }
    expect(body.error).toBe(
      "Berkas tidak lolos pemeriksaan. Isi ulang foto yang kurang."
    )
    expect(body.uploads).toHaveLength(1)
    expect(body.uploads[0]?.index).toBe(3)
    expect(body.uploads[0]?.path).toBe(relaySlotPath("relaytuntas7", 3))
    expect(body.uploads[0]?.url).toContain("X-Amz-Signature")
    /* Belum menang: estafetnya tetap `claimed` dan tidak ada strip baru. */
    expect((await bacaRelay("relaytuntas7"))?.status).toBe("claimed")
    expect(await hitungStrip("relaytuntas7")).toBe(0)

    /* Setelah foto temannya terunggah, penuntasan kedua berhasil. */
    await isiSlot("relaytuntas7", 3)
    const kedua = await lengkapi("relaytuntas7")
    expect(kedua.status).toBe(200)
  })

  it("menjawab 422 tanpa unggahan bila berkas pembuatnya yang hilang", async () => {
    await sisipRelay({
      id: "relaytuntas8",
      status: "claimed",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await isiSlot("relaytuntas8", 1)
    await isiSlot("relaytuntas8", 2)
    await isiSlot("relaytuntas8", 3)
    /* Slot pembuat index 0 tidak ada di bucket. */

    const response = await lengkapi("relaytuntas8")
    expect(response.status).toBe(422)
    const body = (await response.json()) as Record<string, unknown>
    expect(body.error).toBe(
      "Berkas tidak lolos pemeriksaan. Isi ulang foto yang kurang."
    )
    /* Slot pembuat tidak bisa diperbaiki dari sisi teman: tanpa URL unggah. */
    expect("uploads" in body).toBe(false)
    expect((await bacaRelay("relaytuntas8"))?.status).toBe("claimed")
  })

  it("410 menolak estafet yang kedaluwarsa atau dibatalkan", async () => {
    const kedaluwarsa = new Date(Date.now() - 60_000).toISOString()
    await sisipRelay({
      id: "relaytuntas9b",
      status: "claimed",
      guestTokenHash: hashToken(TOKEN_TAMU),
      expiresAt: kedaluwarsa,
    })
    await sisipRelay({
      id: "relaytunta10",
      status: "cancelled",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })

    const tua = await lengkapi("relaytuntas9b")
    expect(tua.status).toBe(410)
    const batal = await lengkapi("relaytunta10")
    expect(batal.status).toBe(410)
    expect(await hitungStrip("relaytuntas9b")).toBe(0)
    expect((await bacaRelay("relaytuntas9b"))?.status).toBe("claimed")
  })
})

describe("DELETE /api/relays/[id]", () => {
  function hapus(id: string, token: string | null = TOKEN_PEMBUAT) {
    return hapusRelay(
      new Request(`http://localhost:3000/api/relays/${id}`, {
        method: "DELETE",
        headers: token === null ? {} : { "x-relay-token": token },
      }),
      konteksRute(id)
    )
  }

  it("menghapus berkas slot, menomborkan stripnya, dan membatalkan barisnya", async () => {
    await sisipRelay({ id: "relaybatal1", status: "complete" })
    await sisipStrip({
      id: "stripbatal12",
      status: "complete",
      relayId: "relaybatal1",
      livePath: "strips/stripbatal12/live.webm",
    })
    for (const slot of slotsRelay("relaybatal1", "strip-4")) {
      await isiSlot("relaybatal1", slot.index)
    }
    await putObject(env.bucket, stripStillPath("stripbatal12"), STILL_MIME)
    await putObject(
      env.bucket,
      "strips/stripbatal12/live.webm",
      "video/webm"
    )

    const response = await hapus("relaybatal1")
    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")

    for (const path of [
      relaySlotPath("relaybatal1", 0),
      relaySlotPath("relaybatal1", 1),
      relaySlotPath("relaybatal1", 2),
      relaySlotPath("relaybatal1", 3),
      stripStillPath("stripbatal12"),
      "strips/stripbatal12/live.webm",
    ]) {
      expect(await env.bucket.head(path)).toBeNull()
    }

    const relay = await bacaRelay("relaybatal1")
    expect(relay?.status).toBe("cancelled")
    /* Masa tenggang: barisnya masih ada sampai pembersih membuangnya. */
    expect(Date.parse(relay?.expires_at ?? "")).toBeGreaterThan(Date.now())
    const strip = await bacaStrip("stripbatal12")
    expect(strip?.status).toBe("deleted")
    expect(Date.parse(strip?.expires_at ?? "")).toBeGreaterThan(Date.now())

    /* Idempoten: permintaan kedua tidak mengulang penghapusan berkas. */
    await isiSlot("relaybatal1", 0)
    const kedua = await hapus("relaybatal1")
    expect(kedua.status).toBe(204)
    expect(
      await env.bucket.head(relaySlotPath("relaybatal1", 0))
    ).not.toBeNull()
  })

  it("menghapus berkas strip di gerbang, bukan draf sisa ber-relay_id sama", async () => {
    await sisipRelay({
      id: "relaybatal4",
      status: "complete",
      stripId: "stripgate01",
    })
    await sisipStrip({
      id: "stripgate01",
      status: "complete",
      relayId: "relaybatal4",
    })
    await sisipStrip({
      id: "stripsisa02",
      status: "draft",
      relayId: "relaybatal4",
    })
    for (const slot of slotsRelay("relaybatal4", "strip-4")) {
      await isiSlot("relaybatal4", slot.index)
    }
    await putObject(env.bucket, stripStillPath("stripgate01"), STILL_MIME)
    await putObject(env.bucket, stripStillPath("stripsisa02"), STILL_MIME)

    const response = await hapus("relaybatal4")
    expect(response.status).toBe(204)
    /* Hanya berkas strip pemenang yang dibuang; draf sisanya tidak disentuh. */
    expect(await env.bucket.head(stripStillPath("stripgate01"))).toBeNull()
    expect(
      await env.bucket.head(stripStillPath("stripsisa02"))
    ).not.toBeNull()
    expect((await bacaStrip("stripgate01"))?.status).toBe("deleted")
    expect((await bacaStrip("stripsisa02"))?.status).toBe("draft")
    /* Slot tetap dibersihkan walau stripnya ada di gerbang. */
    expect(
      await env.bucket.head(relaySlotPath("relaybatal4", 0))
    ).toBeNull()
  })

  it("menolak token yang hilang, salah, dan estafet yang kedaluwarsa", async () => {
    await sisipRelay({ id: "relaybatal2" })
    await sisipRelay({
      id: "relaybatal3",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
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
      konteksRute(id)
    )
  }

  it("menyerahkan tautan strip dan URL foto slot hanya ke pemegang token", async () => {
    const selesai = new Date(Date.now() + 86_400_000).toISOString()
    await sisipRelay({
      id: "relaystrip01",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await sisipStrip({
      id: "stripestafet",
      status: "complete",
      relayId: "relaystrip01",
      expiresAt: selesai,
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
    /* URL-nya berumur pendek dan bertanda tangan, bukan tautan permanen. */
    for (const slot of body.slots) {
      expect(slot.url).toContain(relaySlotPath("relaystrip01", slot.index))
      expect(slot.url).toContain("X-Amz-Signature")
    }

    const teman = await mintaStrip("relaystrip01", TOKEN_TAMU)
    expect(teman.status).toBe(200)
    const temanBody = (await teman.json()) as { role: string }
    expect(temanBody.role).toBe("guest")
  })

  it("menolak token tamu bila estafetnya tidak pernah diambil", async () => {
    const selesai = new Date(Date.now() + 86_400_000).toISOString()
    await sisipRelay({ id: "relaystrip09", status: "complete" })
    await sisipStrip({
      id: "stripestafet2",
      status: "complete",
      relayId: "relaystrip09",
      expiresAt: selesai,
    })

    /* `guest_token_hash` NULL: token apa pun selain milik pembuat ditolak. */
    const tamuPalsu = await mintaStrip("relaystrip09", TOKEN_TAMU)
    expect(tamuPalsu.status).toBe(401)
    expect(await tamuPalsu.json()).toEqual({
      error: "Token estafet tidak cocok.",
    })

    /* Pembuat tetap bisa membaca stripnya sendiri. */
    const pembuat = await mintaStrip("relaystrip09", TOKEN_PEMBUAT)
    expect(pembuat.status).toBe(200)
    const pembuatBody = (await pembuat.json()) as { role: string }
    expect(pembuatBody.role).toBe("host")
  })

  it("memakai strip di gerbang, bukan draf sisa yang menunjuk relay yang sama", async () => {
    /* M9: draf yang kalah balapan (sisa yang belum sempat dibuang) tidak boleh
       membayangi strip pemenangnya saat tautan atau foto slot diminta. */
    const selesai = new Date(Date.now() + 86_400_000).toISOString()
    await sisipRelay({
      id: "relaystrip05",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
      stripId: "stripgerbang",
    })
    await sisipStrip({
      id: "stripgerbang",
      status: "complete",
      relayId: "relaystrip05",
      expiresAt: selesai,
    })
    await sisipStrip({
      id: "stripsisa",
      status: "draft",
      relayId: "relaystrip05",
    })

    const response = await mintaStrip("relaystrip05", TOKEN_PEMBUAT)
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      stripId: string
      expiresAt: string
    }
    expect(body.stripId).toBe("stripgerbang")
    expect(body.expiresAt).toBe(selesai)
  })

  it("menolak token yang hilang atau salah, dan estafet yang belum selesai", async () => {
    await sisipRelay({
      id: "relaystrip02",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await sisipRelay({ id: "relaystrip03", status: "claimed" })
    await sisipRelay({ id: "relaystrip04", status: "waiting" })

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
    await sisipRelay({
      id: "relaystrip06",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
      expiresAt: kedaluwarsa,
    })
    await sisipRelay({
      id: "relaystrip07",
      status: "cancelled",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await sisipRelay({
      id: "relaystrip08",
      status: "complete",
      guestTokenHash: hashToken(TOKEN_TAMU),
    })
    await sisipStrip({
      id: "striphapus12",
      status: "deleted",
      relayId: "relaystrip08",
    })

    const hilang = await mintaStrip("tidakada1234")
    expect(hilang.status).toBe(404)

    const tua = await mintaStrip("relaystrip06")
    expect(tua.status).toBe(410)
    expect(await tua.json()).toEqual({
      error: "Estafet ini sudah kedaluwarsa.",
    })
    const batal = await mintaStrip("relaystrip07")
    expect(batal.status).toBe(410)
    expect(await batal.json()).toEqual({
      error: "Estafet ini sudah dibatalkan.",
    })

    const dihapus = await mintaStrip("relaystrip08")
    expect(dihapus.status).toBe(200)
    const body = (await dihapus.json()) as {
      stripId: string | null
      expiresAt: string | null
      slots: unknown[]
    }
    expect(body.stripId).toBeNull()
    expect(body.expiresAt).toBeNull()
    expect(body.slots).toEqual([])
  })
})

describe("GET /api/cron/purge untuk estafet", () => {
  it("membuang estafet kedaluwarsa beserta berkas slotnya", async () => {
    const kedaluwarsa = new Date(Date.now() - 60_000).toISOString()
    await sisipRelay({
      id: "relaypurge12",
      status: "claimed",
      expiresAt: kedaluwarsa,
    })
    await sisipRelay({ id: "relaypurge13", status: "waiting" })
    for (const slot of slotsRelay("relaypurge12", "strip-4")) {
      await isiSlot("relaypurge12", slot.index)
    }

    const response = await pembersih(
      permintaanBearer("/api/cron/purge", "rahasia-pembersih")
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ purged: 1 })
    expect(await bacaRelay("relaypurge12")).toBeNull()
    expect(await bacaRelay("relaypurge13")).not.toBeNull()
    expect(
      await env.bucket.head(relaySlotPath("relaypurge12", 0))
    ).toBeNull()
  })
})
