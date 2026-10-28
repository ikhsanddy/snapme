/* PRD §4: analitik first-party lewat sendBeacon. Backend Cloudflare (D1/KV)
   sudah dibongkar, jadi rute ini tinggal menjaga kontrak lama: klien tidak
   pernah menunggu jawabannya, dan 503 "belum tersedia" membuat antrean di
   sisi klien membuang batch-nya dengan tenang. */

const UNAVAILABLE = { error: "Pencatatan peristiwa belum tersedia." }

export async function POST() {
  return Response.json(UNAVAILABLE, { status: 503 })
}
