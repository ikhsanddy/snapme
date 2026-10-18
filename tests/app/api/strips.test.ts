// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { insertEvents } from "@/server/db/events"
import { insertRelay } from "@/server/db/relays"
import { STRIP_COLUMNS, type StripRow } from "@/server/db/rows"
import type * as rateLimit from "@/server/rateLimit"
import {
  LIVE_BYTE_LIMIT,
  LIVE_MIME_TYPES,
  relaySlotPath,
  STILL_BYTE_LIMIT,
  stripLivePath,
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

/* M10: rute strip diuji sebagai fungsi terhadap binding Cloudflare SUNGGUHAN
   dari harness (D1, R2, KV miniflare), bukan klien Supabase palsu: SQL, gerbang
   kuota, `bucket.head`, dan penghapusan objek dijalankan oleh mesin yang sama
   seperti di produksi. */

const hoisted = vi.hoisted(() => ({ bindings: null as unknown }))

/* Dipakai hanya oleh kasus rollback batas laju: baris ke-11 yang menyusup di
   antara pra-cek dan pasca-cek tidak bisa dijadwalkan dengan permintaan
   sungguhan tanpa balapan. Panggilan pertama (pra-cek) dikembalikan di bawah
   batas, panggilan kedua (pasca-sisip) di atasnya. */
const gerbang = vi.hoisted(() => ({ palsu: false, panggilan: 0 }))

vi.mock("@/server/cloudflare", () => ({
  getBindings: () => hoisted.bindings,
}))

vi.mock("@/server/rateLimit", async () => {
  const asli = await vi.importActual<typeof rateLimit>("@/server/rateLimit")
  return {
    ...asli,
    countRecentCreations: async (
      ...args: Parameters<typeof asli.countRecentCreations>
    ): Promise<number> => {
      if (!gerbang.palsu) {
        return await asli.countRecentCreations(...args)
      }
      gerbang.panggilan += 1
      return gerbang.panggilan === 1
        ? asli.CREATE_LIMIT - 1
        : asli.CREATE_LIMIT + 1
    },
  }
})

import { GET as pembersih } from "@/app/api/cron/purge/route"
import { DELETE as hapusStrip } from "@/app/api/strips/[id]/route"
import { POST as lengkapiStrip } from "@/app/api/strips/[id]/complete/route"
import { POST as buatStrip } from "@/app/api/strips/route"

const TOKEN = "token-hapus-uji"
const ASAL = "1.2.3.4"

const UNAVAILABLE = { error: "Pembuatan link belum tersedia." }
const INVALID = { error: "Permintaan tidak valid." }
const TOO_MANY = {
  error: "Terlalu banyak link dibuat. Tunggu sebentar, lalu coba lagi.",
}
const NOT_FOUND = { error: "Strip tidak ditemukan." }
const EXPIRED = { error: "Strip ini sudah kedaluwarsa." }
const FILE_REJECTED = {
  error: "Berkas tidak lolos pemeriksaan. Buat ulang linknya.",
}
const MISSING_TOKEN = { error: "Token hapus tidak ada." }
const WRONG_TOKEN = { error: "Token hapus tidak cocok." }

const JAM_MS = 3_600_000
const HARI_MS = 24 * JAM_MS

let env: DbEnv

beforeAll(async () => {
  env = await createDbEnv()
})

afterAll(async () => {
  await env.dispose()
})

beforeEach(async () => {
  await truncateAll(env.db)
  await kosongkanBucket(env.bucket)
  /* Binding dipasang ulang tiap kasus: uji "tanpa binding" mengosongkannya. */
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
  /* Garam wajib ada: tanpa itu sidang alamat IP bisa dibalik dengan menebak
     seluruh ruang IPv4, dan rute menolak melayani. */
  process.env.RATE_LIMIT_SALT = "garam-uji"
  process.env.CRON_SECRET = "rahasia-uji"
})

interface SeedStrip {
  id: string
  layout?: string
  stillPath?: string | null
  livePath?: string | null
  status?: StripRow["status"]
  deleteTokenHash?: string
  rateKey?: string
  createdAt?: string
  expiresAt?: string | null
}

/** Menyisipkan baris dengan keadaan awal yang ditentukan uji (mis. kedaluwarsa,
 *  batu nisan, atau kuota penuh); rutenya sendiri hanya menulis lewat
 *  insertStrip, jadi SQL langsung dipakai untuk menyiapkan panggung. */
async function seedStrip(overrides: SeedStrip): Promise<void> {
  await env.db
    .prepare(
      `INSERT INTO strips (
         id, layout, still_path, live_path, status, delete_token_hash,
         rate_key, created_at, expires_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
    )
    .bind(
      overrides.id,
      overrides.layout ?? "strip-4",
      overrides.stillPath === undefined
        ? stripStillPath(overrides.id)
        : overrides.stillPath,
      overrides.livePath ?? null,
      overrides.status ?? "draft",
      overrides.deleteTokenHash ?? hashToken(TOKEN),
      overrides.rateKey ?? "",
      overrides.createdAt ?? new Date().toISOString(),
      overrides.expiresAt ?? null
    )
    .run()
}

type StripRowUji = StripRow & { rate_key: string }

/** Baca ulang baris untuk diperiksa; `rate_key` ikut dibaca karena rute
 *  menulisnya dan uji kuota bergantung padanya. */
async function bacaStrip(id: string): Promise<StripRowUji | null> {
  return await env.db
    .prepare(`SELECT ${STRIP_COLUMNS}, rate_key FROM strips WHERE id = ?1`)
    .bind(id)
    .first<StripRowUji>()
}

async function jumlahStrip(): Promise<number> {
  const row = await env.db
    .prepare("SELECT COUNT(*) AS n FROM strips")
    .first<{ n: number }>()
  return row?.n ?? 0
}

/** POST /api/strips dari alamat uji tetap. */
const permintaan = permintaanKe("/api/strips", ASAL)

describe("POST /api/strips", () => {
  it("membuat baris draf dan URL unggah presigned", async () => {
    const response = await buatStrip(permintaan({ layout: "strip-3" }))

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      id: string
      deleteToken: string
      upload: { path: string; url: string }
    }
    expect(body.id).toHaveLength(12)
    expect(body.upload.path).toBe(stripStillPath(body.id))
    /* M10: klien mengunggah langsung ke R2 lewat URL presigned; tanda
       tangannya ada di query string, bukan token unggah Supabase. */
    expect(body.upload.url).toContain("r2.cloudflarestorage.com")
    expect(body.upload.url).toContain(stripStillPath(body.id))
    expect(body.upload.url).toContain("X-Amz-Signature")

    const row = await bacaStrip(body.id)
    expect(row).toMatchObject({
      id: body.id,
      layout: "strip-3",
      status: "draft",
      /* Path berkas ditulis sejak pembuatan: pembersih dan penghapusan harus
         tahu berkas mana yang jadi milik baris ini. */
      still_path: stripStillPath(body.id),
      live_path: null,
      delete_token_hash: hashToken(body.deleteToken),
      rate_key: sidangLaju(ASAL),
      expires_at: null,
    })
    /* Token mentah tidak pernah masuk basis data. */
    expect(JSON.stringify(row)).not.toContain(body.deleteToken)
  })

  it("menolak badan yang bukan JSON, layout tak dikenal, dan jenis isi lain", async () => {
    const bukanJson = await buatStrip(permintaan("bukan-json"))
    expect(bukanJson.status).toBe(400)
    expect(await bukanJson.json()).toEqual(INVALID)

    const layoutSalah = await buatStrip(permintaan({ layout: "strip-9" }))
    expect(layoutSalah.status).toBe(400)

    /* Permintaan lintas situs tanpa preflight mengirim text/plain. */
    const lintasSitus = await buatStrip(
      permintaan('{"layout":"strip-4"}', { "content-type": "text/plain" })
    )
    expect(lintasSitus.status).toBe(400)

    /* M9: gate Origin/Sec-Fetch-Site, tidak bergantung perilaku peramban. */
    const originLain = await buatStrip(
      permintaan({ layout: "strip-4" }, { origin: "https://jahat.example" })
    )
    expect(originLain.status).toBe(400)

    const fetchLintasSitus = await buatStrip(
      permintaan({ layout: "strip-4" }, { "sec-fetch-site": "cross-site" })
    )
    expect(fetchLintasSitus.status).toBe(400)
  })

  it("menyertakan URL unggah klip bila klipnya diminta", async () => {
    const response = await buatStrip(
      permintaan({ layout: "strip-4", live: "webm" })
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      id: string
      upload: { path: string; url: string }
      liveUpload?: { path: string; url: string }
    }
    expect(body.liveUpload?.path).toBe(stripLivePath(body.id, "webm"))
    expect(body.liveUpload?.url).toContain("r2.cloudflarestorage.com")
    expect(body.liveUpload?.url).toContain(stripLivePath(body.id, "webm"))
    expect(body.liveUpload?.url).toContain("X-Amz-Signature")
    expect(body.upload.url).toContain(stripStillPath(body.id))
    expect((await bacaStrip(body.id))?.live_path).toBe(
      stripLivePath(body.id, "webm")
    )

    /* MP4 juga diterima: Safari merekamnya. */
    const mp4 = await buatStrip(
      permintaan({ layout: "strip-4", live: "mp4" })
    )
    expect(mp4.status).toBe(201)
    const mp4Body = (await mp4.json()) as { id: string }
    expect((await bacaStrip(mp4Body.id))?.live_path).toBe(
      stripLivePath(mp4Body.id, "mp4")
    )
  })

  it("tidak menawarkan unggah klip bila tidak diminta", async () => {
    const response = await buatStrip(permintaan({ layout: "strip-4" }))

    expect(response.status).toBe(201)
    const body = (await response.json()) as Record<string, unknown>
    expect("liveUpload" in body).toBe(false)
    expect((await bacaStrip(String(body.id)))?.live_path).toBeNull()

    /* Jenis klip di luar dua yang dikenal ditolak sebelum baris dibuat. */
    const avi = await buatStrip(permintaan({ layout: "strip-4", live: "avi" }))
    expect(avi.status).toBe(400)
  })

  it("menolak melayani tanpa garam pembatasan laju", async () => {
    process.env.RATE_LIMIT_SALT = ""
    const response = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual(UNAVAILABLE)
  })

  it("membatasi 10 pembuatan per jam untuk sidang yang sama; batu nisan ikut dihitung", async () => {
    const baru = new Date().toISOString()
    for (let index = 0; index < 9; index += 1) {
      await seedStrip({
        id: `lama${index}`,
        rateKey: sidangLaju(ASAL),
        createdAt: baru,
      })
    }
    /* Batu nisan penghapusan tetap menghuni jendela kuota: menghapus baris
       tidak boleh mengembalikan jatah pembuatan. */
    await seedStrip({
      id: "nisanlama00",
      status: "deleted",
      rateKey: sidangLaju(ASAL),
      createdAt: baru,
      expiresAt: new Date(Date.now() + JAM_MS).toISOString(),
    })

    const ditolak = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(ditolak.status).toBe(429)
    expect(await ditolak.json()).toEqual(TOO_MANY)
    /* Pra-cek menolak tanpa menyisipkan baris baru sama sekali. */
    expect(await jumlahStrip()).toBe(10)

    /* Baris yang lebih tua dari satu jam tidak dihitung, dan sidang lain tidak
       terpengaruh. */
    await seedStrip({
      id: "basi00000000",
      rateKey: sidangLaju(ASAL),
      createdAt: new Date(Date.now() - 7_200_000).toISOString(),
    })
    await seedStrip({ id: "tetangga0000", rateKey: sidangLaju("5.6.7.8") })

    const masihPenuh = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(masihPenuh.status).toBe(429)
    expect(await jumlahStrip()).toBe(12)

    const lain = await buatStrip(
      permintaan({ layout: "strip-4" }, { "x-forwarded-for": "9.9.9.9" })
    )
    expect(lain.status).toBe(201)
    expect(await jumlahStrip()).toBe(13)
  })

  it("menerima pembuatan kesepuluh dan tidak bisa dipalsukan lewat x-forwarded-for", async () => {
    for (let index = 0; index < 9; index += 1) {
      await seedStrip({ id: `lama${index}`, rateKey: sidangLaju(ASAL) })
    }

    const kesepuluh = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(kesepuluh.status).toBe(201)
    expect(await jumlahStrip()).toBe(10)

    /* `x-real-ip` diisi platform hosting; header yang bisa dipalsukan klien
       tidak boleh memindahkan keranjangnya. */
    const dipalsukan = await buatStrip(
      permintaan(
        { layout: "strip-4" },
        { "x-forwarded-for": "9.9.9.9", "x-real-ip": ASAL }
      )
    )
    expect(dipalsukan.status).toBe(429)
    expect(await jumlahStrip()).toBe(10)
  })

  it("memakai cf-connecting-ip sebagai sidang alamat, bukan header yang bisa dipalsukan", async () => {
    for (let index = 0; index < 10; index += 1) {
      await seedStrip({ id: `penuh${index}`, rateKey: sidangLaju("1.1.1.1") })
    }

    /* Header platform (Cloudflare) penuh: ditolak walau header yang bisa
       dipalsukan klien menunjuk alamat lain. */
    const ditolak = await buatStrip(
      permintaan(
        { layout: "strip-4" },
        { "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }
      )
    )
    expect(ditolak.status).toBe(429)

    /* Tanpa header platform, jalur cadangan tetap bekerja seperti sebelumnya. */
    const cadangan = await buatStrip(
      permintaan({ layout: "strip-4" }, { "x-forwarded-for": "9.9.9.9" })
    )
    expect(cadangan.status).toBe(201)
  })

  it("membatalkan baris ke-11 yang menyusup di antara pra-cek dan pasca-cek", async () => {
    gerbang.palsu = true
    gerbang.panggilan = 0
    try {
      const response = await buatStrip(permintaan({ layout: "strip-4" }))
      expect(response.status).toBe(429)
      expect(await response.json()).toEqual(TOO_MANY)
      /* Rollback: baris yang baru saja disisipkan dibuang lagi, jadi kuota
         tidak bisa dikembalikan percobaan yang ditolak. */
      expect(await jumlahStrip()).toBe(0)
    } finally {
      gerbang.palsu = false
    }
  })

  it("pembuatan belum tersedia tanpa binding Cloudflare", async () => {
    hoisted.bindings = null
    const response = await buatStrip(permintaan({ layout: "strip-4" }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual(UNAVAILABLE)
    expect(await jumlahStrip()).toBe(0)
  })
})

describe("POST /api/strips/[id]/complete", () => {
  it("menjawab 404 untuk strip yang tidak ada", async () => {
    const response = await lengkapiStrip(permintaan(), konteksRute("tidakada1234"))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual(NOT_FOUND)
  })

  it("menjawab 410 untuk strip yang sudah lewat 7 hari, walau pembersih belum jalan", async () => {
    const id = "kedalwarsa1"
    const lalu = new Date(Date.now() - 8 * HARI_MS).toISOString()
    await seedStrip({ id, expiresAt: lalu })

    const response = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(response.status).toBe(410)
    expect(await response.json()).toEqual(EXPIRED)
    /* Kedaluwarsa juga diperiksa saat baca: barisnya tidak berubah status. */
    const row = await bacaStrip(id)
    expect(row?.status).toBe("draft")
    expect(row?.expires_at).toBe(lalu)
  })

  it("menolak berkas yang terlalu besar, jenis lain, atau kosong; berkasnya dibuang", async () => {
    const id = "berkas123456"
    const path = stripStillPath(id)
    await seedStrip({ id })

    await putObject(env.bucket, path, "image/png", STILL_BYTE_LIMIT + 1)
    const besar = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(besar.status).toBe(422)
    expect(await besar.json()).toEqual(FILE_REJECTED)
    expect(await env.bucket.head(path)).toBeNull()

    await putObject(env.bucket, path, "image/jpeg", 1024)
    const jenis = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(jenis.status).toBe(422)
    expect(await env.bucket.head(path)).toBeNull()

    /* Awalan yang sama bukan jenis yang sama. */
    await putObject(env.bucket, path, "image/pngx", 1024)
    const mirip = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(mirip.status).toBe(422)
    expect(await env.bucket.head(path)).toBeNull()

    /* Berkasnya tidak pernah terunggah. */
    const hilang = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(hilang.status).toBe(422)

    /* Objek nol bita juga tidak lolos. */
    await putObject(env.bucket, path, "image/png", 0)
    const kosong = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(kosong.status).toBe(422)
    expect(await env.bucket.head(path)).toBeNull()

    const row = await bacaStrip(id)
    expect(row?.status).toBe("draft")
    expect(row?.expires_at).toBeNull()
  })

  it("memasang kedaluwarsa 7 hari sekali saja, panggilan berikutnya idempoten", async () => {
    const id = "selesai12345"
    await seedStrip({ id })
    await putObject(env.bucket, stripStillPath(id), "image/png", 1024)

    const pertama = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(pertama.status).toBe(200)
    const satu = (await pertama.json()) as { id: string; expiresAt: string }
    expect(satu.id).toBe(id)
    expect(
      Math.abs(Date.parse(satu.expiresAt) - (Date.now() + 7 * HARI_MS))
    ).toBeLessThan(5_000)
    expect((await bacaStrip(id))?.status).toBe("complete")

    const kedua = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(kedua.status).toBe(200)
    expect(await kedua.json()).toEqual(satu)
    /* Berkas yang lolos tidak ikut dibuang panggilan kedua. */
    expect(await env.bucket.head(stripStillPath(id))).not.toBeNull()
  })

  it("menyimpan klip yang lolos pemeriksaan", async () => {
    const id = "berklip12345"
    const livePath = stripLivePath(id, "webm")
    await seedStrip({ id, livePath })
    await putObject(env.bucket, stripStillPath(id), "image/png", 1024)
    await putObject(env.bucket, livePath, LIVE_MIME_TYPES.webm, 1_048_576)

    const response = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(response.status).toBe(200)
    const row = await bacaStrip(id)
    expect(row?.status).toBe("complete")
    expect(row?.live_path).toBe(livePath)
    expect(await env.bucket.head(livePath)).not.toBeNull()
  })

  it("mengosongkan klip yang tidak lolos tanpa menggagalkan strip", async () => {
    const id = "berklip67890"
    const stillPath = stripStillPath(id)
    const livePath = stripLivePath(id, "mp4")

    async function ulangiDraf(): Promise<void> {
      await env.db.prepare("DELETE FROM strips WHERE id = ?1").bind(id).run()
      await seedStrip({ id, livePath })
      await putObject(env.bucket, stillPath, "image/png", 1024)
    }

    /* Klipnya tidak pernah terunggah (mis. rekaman gagal di peramban). */
    await seedStrip({ id, livePath })
    await putObject(env.bucket, stillPath, "image/png", 1024)
    const hilang = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(hilang.status).toBe(200)
    expect((await bacaStrip(id))?.status).toBe("complete")
    expect((await bacaStrip(id))?.live_path).toBeNull()

    /* Jenis klip yang tidak dikenal, lalu ukuran di atas 5 MB. */
    await ulangiDraf()
    await putObject(env.bucket, livePath, "video/quicktime", 2048)
    const jenis = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(jenis.status).toBe(200)
    expect((await bacaStrip(id))?.live_path).toBeNull()
    expect(await env.bucket.head(livePath)).toBeNull()

    await ulangiDraf()
    await putObject(env.bucket, livePath, LIVE_MIME_TYPES.mp4, LIVE_BYTE_LIMIT + 1)
    const besar = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(besar.status).toBe(200)
    expect((await bacaStrip(id))?.live_path).toBeNull()
    expect(await env.bucket.head(livePath)).toBeNull()

    /* Strip diamnya tidak tersentuh. */
    expect(await env.bucket.head(stillPath)).not.toBeNull()
    expect((await bacaStrip(id))?.status).toBe("complete")
  })

  it("tidak memeriksa klip untuk baris tanpa live_path", async () => {
    const id = "tanpaklip123"
    await seedStrip({ id })
    await putObject(env.bucket, stripStillPath(id), "image/png", 1024)

    const response = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(response.status).toBe(200)
    const row = await bacaStrip(id)
    expect(row?.status).toBe("complete")
    expect(row?.live_path).toBeNull()
  })
})

describe("DELETE /api/strips/[id]", () => {
  function hapus(alamat: string, token: string | null) {
    return new Request(alamat, {
      method: "DELETE",
      headers: token === null ? {} : { "x-delete-token": token },
    })
  }

  it("butuh token hapus yang cocok", async () => {
    const id = "hapus1234567"
    const path = stripStillPath(id)
    await seedStrip({ id })
    await putObject(env.bucket, path, "image/png", 1024)

    const tanpa = await hapusStrip(
      hapus(`http://localhost:3000/api/strips/${id}`, null),
      konteksRute(id)
    )
    expect(tanpa.status).toBe(401)
    expect(await tanpa.json()).toEqual(MISSING_TOKEN)

    const salah = await hapusStrip(
      hapus(`http://localhost:3000/api/strips/${id}`, "token-palsu"),
      konteksRute(id)
    )
    expect(salah.status).toBe(401)
    expect(await salah.json()).toEqual(WRONG_TOKEN)
    expect((await bacaStrip(id))?.status).toBe("draft")
    expect(await env.bucket.head(path)).not.toBeNull()
  })

  it("menjawab 404 dan 410 seperti rute complete", async () => {
    const id = "tua123456789"
    await seedStrip({
      id,
      expiresAt: new Date(Date.now() - HARI_MS).toISOString(),
    })

    const hilang = await hapusStrip(
      hapus("http://localhost:3000/api/strips/tidakada1234", TOKEN),
      konteksRute("tidakada1234")
    )
    expect(hilang.status).toBe(404)

    const kedaluwarsa = await hapusStrip(
      hapus(`http://localhost:3000/api/strips/${id}`, TOKEN),
      konteksRute(id)
    )
    expect(kedaluwarsa.status).toBe(410)
  })

  it("menghapus berkas lalu menyisakan batu nisan saat token cocok", async () => {
    const id = "punyaku12345"
    const stillPath = stripStillPath(id)
    const livePath = stripLivePath(id, "webm")
    await seedStrip({
      id,
      status: "complete",
      livePath,
      expiresAt: new Date(Date.now() + HARI_MS).toISOString(),
    })
    await putObject(env.bucket, stillPath, "image/png", 1024)
    await putObject(env.bucket, livePath, LIVE_MIME_TYPES.webm, 1024)

    const response = await hapusStrip(
      hapus(`http://localhost:3000/api/strips/${id}`, TOKEN),
      konteksRute(id)
    )
    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
    expect(await env.bucket.head(stillPath)).toBeNull()
    expect(await env.bucket.head(livePath)).toBeNull()

    /* Barisnya tinggal sebagai batu nisan sampai masa tenggangnya lewat:
       berkas yang diunggah setelah penghapusan tetap punya path yang diketahui
       pembersih, dan kuota pembatasan laju tidak kembali. */
    const sisa = await bacaStrip(id)
    expect(sisa?.status).toBe("deleted")
    expect(sisa?.still_path).toBe(stillPath)
    expect(sisa?.expires_at).not.toBeNull()
    expect(
      Math.abs(
        Date.parse(String(sisa?.expires_at)) - (Date.now() + 3 * JAM_MS)
      )
    ).toBeLessThan(5_000)

    /* Penghapusan kedua tidak menghapus batu nisannya. */
    const kedua = await hapusStrip(
      hapus(`http://localhost:3000/api/strips/${id}`, TOKEN),
      konteksRute(id)
    )
    expect(kedua.status).toBe(404)
    expect((await bacaStrip(id))?.status).toBe("deleted")

    /* Rute complete atas batu nisan itu: berkasnya sudah dibuang, jadi langsung
       ditolak sebagai berkas; setelah masa tenggangnya lewat, jawabannya 410
       karena barisnya kedaluwarsa. */
    const dalamTenggang = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(dalamTenggang.status).toBe(422)

    await env.db
      .prepare("UPDATE strips SET expires_at = ?2 WHERE id = ?1")
      .bind(id, new Date(Date.now() - JAM_MS).toISOString())
      .run()
    const lewatTenggang = await lengkapiStrip(permintaan(), konteksRute(id))
    expect(lewatTenggang.status).toBe(410)
    expect(await lewatTenggang.json()).toEqual(EXPIRED)
  })
})

describe("GET /api/cron/purge", () => {
  it("butuh rahasia pembersih dan binding", async () => {
    process.env.CRON_SECRET = ""
    const belumDiatur = await pembersih(permintaanBearer("/api/cron/purge", "apa-saja"))
    expect(belumDiatur.status).toBe(500)
    expect(await belumDiatur.json()).toEqual({
      error: "Pembersih belum diatur di server.",
    })

    process.env.CRON_SECRET = "rahasia-uji"
    const tanpaHeader = await pembersih(permintaanBearer("/api/cron/purge", null))
    expect(tanpaHeader.status).toBe(401)

    const salah = await pembersih(permintaanBearer("/api/cron/purge", "bukan-rahasia"))
    expect(salah.status).toBe(401)
    expect(await salah.json()).toEqual({ error: "Tidak diizinkan." })

    hoisted.bindings = null
    const tanpaBinding = await pembersih(permintaanBearer("/api/cron/purge", "rahasia-uji"))
    expect(tanpaBinding.status).toBe(503)
    expect(await tanpaBinding.json()).toEqual({
      error: "Pembersih belum tersedia.",
    })
  })

  it("membuang baris kedaluwarsa, draf basi, estafet kedaluwarsa, dan peristiwa lama", async () => {
    const sekarang = Date.now()
    const lampau = (ms: number) => new Date(sekarang - ms).toISOString()
    const depan = (ms: number) => new Date(sekarang + ms).toISOString()

    /* Tiga strip yang harus disapu: complete kedaluwarsa, draf basi, dan batu
       nisan yang masa tenggangnya habis; berkasnya ikut dibuang. */
    await seedStrip({ id: "kedalwarsa2", status: "complete", expiresAt: lampau(HARI_MS) })
    await putObject(env.bucket, stripStillPath("kedalwarsa2"), "image/png", 1024)
    await seedStrip({ id: "drafbasi123", createdAt: lampau(30 * JAM_MS) })
    await putObject(env.bucket, stripStillPath("drafbasi123"), "image/png", 1024)
    await seedStrip({ id: "batunisan123", status: "deleted", expiresAt: lampau(JAM_MS) })
    await putObject(env.bucket, stripStillPath("batunisan123"), "image/png", 1024)
    /* Yang bertahan: draf segar dan strip yang masih hidup. */
    await seedStrip({ id: "draffresh12" })
    await putObject(env.bucket, stripStillPath("draffresh12"), "image/png", 1024)
    await seedStrip({ id: "masihidup12", status: "complete", expiresAt: depan(HARI_MS) })
    await putObject(env.bucket, stripStillPath("masihidup12"), "image/png", 1024)

    /* Estafet kedaluwarsa: barisnya dan kedua slot R2-nya ikut disapu. */
    await insertRelay(env.db, {
      id: "estafetlama1",
      layout: "strip-4",
      slots: [
        { index: 0, owner: "host", path: relaySlotPath("estafetlama1", 0) },
        { index: 1, owner: "guest", path: relaySlotPath("estafetlama1", 1) },
      ],
      hostTokenHash: hashToken("token-host-ui"),
      rateKey: "",
      createdAt: lampau(50 * JAM_MS),
      expiresAt: lampau(2 * JAM_MS),
    })
    await putObject(env.bucket, relaySlotPath("estafetlama1", 0), "image/jpeg", 1024)
    await putObject(env.bucket, relaySlotPath("estafetlama1", 1), "image/jpeg", 1024)
    await insertRelay(env.db, {
      id: "estafetbaru1",
      layout: "strip-4",
      slots: [{ index: 0, owner: "host", path: relaySlotPath("estafetbaru1", 0) }],
      hostTokenHash: hashToken("token-host-ui"),
      rateKey: "",
      createdAt: sekarang.toString(),
      expiresAt: depan(2 * JAM_MS),
    })
    await putObject(env.bucket, relaySlotPath("estafetbaru1", 0), "image/jpeg", 1024)

    /* Peristiwa analitik: dua yang lewat 90 hari dibuang, yang segar disimpan. */
    await insertEvents(
      env.db,
      ["lihat", "unduh"],
      "kunci-uji",
      lampau(91 * HARI_MS)
    )
    await insertEvents(env.db, ["lihat"], "kunci-uji", new Date(sekarang).toISOString())

    const response = await pembersih(permintaanBearer("/api/cron/purge", "rahasia-uji"))
    expect(response.status).toBe(200)
    /* Tiga strip + satu estafet + dua peristiwa. */
    expect(await response.json()).toEqual({ purged: 6 })

    const sisaStrip = await env.db
      .prepare("SELECT id FROM strips ORDER BY id")
      .all<{ id: string }>()
    expect(sisaStrip.results.map((row) => row.id)).toEqual([
      "draffresh12",
      "masihidup12",
    ])
    const sisaRelay = await env.db
      .prepare("SELECT id FROM relays ORDER BY id")
      .all<{ id: string }>()
    expect(sisaRelay.results.map((row) => row.id)).toEqual(["estafetbaru1"])
    const sisaEvents = await env.db
      .prepare("SELECT COUNT(*) AS n FROM events")
      .first<{ n: number }>()
    expect(sisaEvents?.n).toBe(1)

    /* Objek yang disapu hilang; objek milik baris yang bertahan tetap ada. */
    expect(await env.bucket.head(stripStillPath("kedalwarsa2"))).toBeNull()
    expect(await env.bucket.head(stripStillPath("drafbasi123"))).toBeNull()
    expect(await env.bucket.head(stripStillPath("batunisan123"))).toBeNull()
    expect(await env.bucket.head(relaySlotPath("estafetlama1", 0))).toBeNull()
    expect(await env.bucket.head(relaySlotPath("estafetlama1", 1))).toBeNull()
    expect(await env.bucket.head(stripStillPath("draffresh12"))).not.toBeNull()
    expect(await env.bucket.head(stripStillPath("masihidup12"))).not.toBeNull()
    expect(await env.bucket.head(relaySlotPath("estafetbaru1", 0))).not.toBeNull()

    const lagi = await pembersih(permintaanBearer("/api/cron/purge", "rahasia-uji"))
    expect(await lagi.json()).toEqual({ purged: 0 })

    /* Baris batu nisan yang sudah disapu benar-benar hilang: 404, bukan 410. */
    const setelahSapu = await lengkapiStrip(permintaan(), konteksRute("batunisan123"))
    expect(setelahSapu.status).toBe(404)
    expect(await setelahSapu.json()).toEqual(NOT_FOUND)
  })
})
