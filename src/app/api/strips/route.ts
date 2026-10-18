import { getBindings } from "@/server/cloudflare"
import { insertStrip } from "@/server/db/strips"
import {
  clientKeyFromRequest,
  countRecentCreations,
  CREATE_LIMIT,
  CREATE_WINDOW_MS,
  isCrossSite,
  rateKeyFor,
} from "@/server/rateLimit"
import { presignPut } from "@/server/r2/presign"
import {
  CREATE_STRIP_SCHEMA,
  LIVE_MIME_TYPES,
  STILL_MIME,
  stripLivePath,
  stripStillPath,
} from "@/lib/schemas"
import { hashToken, newDeleteToken, newStripId } from "@/server/tokens"

/* ARCHITECTURE §7: POST /api/strips membuat baris `draft` dan satu URL unggah
   bertanda tangan (M10: presigned PUT ke R2). Berkasnya tidak melewati rute
   server: batas ukuran isi permintaan fungsi serverless tidak bisa menampung
   PNG 2 MB, jadi klien mengunggah langsung ke bucket dan rute complete yang
   memeriksa hasilnya.

   `still_path` ditulis sejak awal, bukan saat complete: kalau klien menutup
   halaman sebelum mengunggah, pembersih tetap tahu berkas mana yang harus
   dibuang, dan permintaan hapus tetap punya sesuatu untuk dihapus.

   Kuota dihitung setelah baris disisipkan; bila lewat batas, baris itu dibuang
   lagi sebelum menjawab 429. Periksa-dulu-lalu-sisip bisa dilewati permintaan
   serentak. */

const UNAVAILABLE = { error: "Pembuatan link belum tersedia." }
const INVALID = { error: "Permintaan tidak valid." }
const TOO_MANY = {
  error: "Terlalu banyak link dibuat. Tunggu sebentar, lalu coba lagi.",
}

export async function POST(request: Request) {
  const bindings = getBindings()
  if (bindings === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }
  /* Tanpa jenis isi JSON, permintaan lintas situs tanpa preflight (form atau
     fetch `no-cors`) bisa ikut membuat baris. complete dan DELETE tidak
     terjangkau begitu karena butuh header khusus dan id yang tidak bisa
     ditebak. */
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return Response.json(INVALID, { status: 400 })
  }
  /* M9: gate jenis isi tidak bergantung perilaku peramban, jadi permintaan
     yang jelas datang dari situs lain ditolak langsung. */
  if (isCrossSite(request)) {
    return Response.json(INVALID, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json(INVALID, { status: 400 })
  }
  const parsed = CREATE_STRIP_SCHEMA.safeParse(payload)
  if (!parsed.success) {
    return Response.json(INVALID, { status: 400 })
  }

  const now = new Date()
  const rateKey = rateKeyFor(clientKeyFromRequest(request))
  /* Tanpa garam, sidang alamat IP bisa dibalik dengan menebak seluruh ruang
     IPv4, jadi rutenya menolak melayani daripada memakai garam bawaan. */
  if (rateKey === null) {
    return Response.json(UNAVAILABLE, { status: 503 })
  }

  const id = newStripId()
  const deleteToken = newDeleteToken()
  const stillPath = stripStillPath(id)
  /* M7: klip Strip Hidup best-effort. Path-nya ditulis sejak awal supaya
     pembersih dan penghapusan tahu berkas mana yang jadi milik baris ini,
     sama seperti still; rute complete yang memutuskan nasibnya. */
  const liveKind = parsed.data.live
  const livePath = liveKind === undefined ? null : stripLivePath(id, liveKind)
  const sinceIso = new Date(now.getTime() - CREATE_WINDOW_MS).toISOString()

  try {
    /* Gerbang murah sebelum menulis (temuan security-reviewer M9): kalau
       jendela kuotanya sudah penuh, permintaan ditolak tanpa INSERT sama
       sekali. Pemeriksaan setelah sisip tetap jadi gerbang resmi untuk
       permintaan serentak. */
    if (
      (await countRecentCreations(bindings.db, "strips", rateKey, sinceIso)) >=
      CREATE_LIMIT
    ) {
      return Response.json(TOO_MANY, { status: 429 })
    }

    await insertStrip(bindings.db, {
      id,
      layout: parsed.data.layout,
      stillPath,
      livePath,
      deleteTokenHash: hashToken(deleteToken),
      rateKey,
      createdAt: now.toISOString(),
    })

    if (
      (await countRecentCreations(bindings.db, "strips", rateKey, sinceIso)) >
      CREATE_LIMIT
    ) {
      /* Batalkan baris yang baru saja dibuat: kuota tidak boleh dikembalikan
         oleh percobaan yang ditolak. */
      await bindings.db
        .prepare("DELETE FROM strips WHERE id = ?1")
        .bind(id)
        .run()
      return Response.json(TOO_MANY, { status: 429 })
    }

    const stillUrl = await presignPut(bindings.s3, stillPath, STILL_MIME)
    const liveUpload =
      livePath === null
        ? undefined
        : {
            path: livePath,
            url: await presignPut(
              bindings.s3,
              livePath,
              LIVE_MIME_TYPES[liveKind as keyof typeof LIVE_MIME_TYPES]
            ),
          }

    return Response.json(
      {
        id,
        deleteToken,
        upload: { path: stillPath, url: stillUrl },
        ...(liveUpload === undefined ? {} : { liveUpload }),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/strips gagal:", error)
    return Response.json(
      { error: "Link belum bisa dibuat. Coba lagi sebentar lagi." },
      { status: 500 }
    )
  }
}
