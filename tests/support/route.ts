import { rateKeyFor } from "@/server/rateLimit"

/* Bantuan bersama untuk uji rute (tests/app/api/*). Bentuk permintaan, konteks
   rute dinamis, sidang pembatasan laju, dan pengosongan bucket sebelumnya
   disalin ke tiap berkas uji; salinannya sempat menyimpang (daftar bucket
   berhalaman di satu berkas, tidak di berkas lain), jadi sekarang tinggal di
   sini. */

const ASAL_RUTE = "http://localhost:3000"

/** Alamat uji bawaan; tiap berkas memakai satu nilai tetap supaya sidangnya
 *  tidak tercampur antar-uji. */
const ASAL_UJI = "1.2.3.4"

/** Permintaan berbadan JSON. `x-forwarded-for` ikut dikirim karena server
 *  pengembangan tidak mengenal `cf-connecting-ip`; tanpa itu seluruh uji
 *  berbagi satu kuota pembatasan laju.
 *
 *  Berbentuk pabrik supaya tiap berkas uji bisa memasang rutenya sekali
 *  (`const permintaan = permintaanKe("/api/strips", ASAL)`) tanpa menyalin
 *  bentuk permintaannya. */
export function permintaanKe(path: string, from: string = ASAL_UJI) {
  return (
    body?: unknown,
    headers: Record<string, string> = {}
  ): Request =>
    new Request(`${ASAL_RUTE}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": from,
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

/** Permintaan GET tanpa badan; `bearer` dipakai rute pembersih manual. */
export function permintaanBearer(path: string, bearer: string | null): Request {
  return new Request(`${ASAL_RUTE}${path}`, {
    headers: bearer === null ? {} : { authorization: `Bearer ${bearer}` },
  })
}

/** Konteks rute dinamis App Router (`{ params }`) berbentuk promise. */
export function konteksRute(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

/** Sidang pembatasan laju untuk satu alamat. `scope` memisahkan ruang kuota
 *  (M9: analitik punya ruangnya sendiri, jadi hashnya berbeda dari strips dan
 *  relays untuk alamat yang sama). `null` berarti garam belum dipasang: tanpa
 *  garam sidangnya bisa dibalik, jadi uji gagal keras di sini. */
export function sidangLaju(alamat: string, scope = ""): string {
  const key = rateKeyFor(alamat, scope)
  if (key === null) {
    throw new Error("garam pembatasan laju belum dipasang")
  }
  return key
}

/** Bucket miniflare tidak ikut dikosongkan `truncateAll`, dan objek dari kasus
 *  sebelumnya bisa membuat uji "berkas hilang" lulus palsu. Daftarnya
 *  dipaginasi: satu `list()` hanya mengembalikan satu halaman. */
export async function kosongkanBucket(bucket: R2Bucket): Promise<void> {
  let cursor: string | undefined
  do {
    const page = await bucket.list({ cursor })
    if (page.objects.length > 0) {
      await bucket.delete(page.objects.map((object) => object.key))
    }
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor !== undefined)
}
