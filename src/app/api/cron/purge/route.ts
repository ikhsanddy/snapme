import { getBindings } from "@/server/cloudflare"
import { purgeExpired } from "@/server/purge"

/* ARCHITECTURE §7: GET /api/cron/purge adalah pemicu manual pembersih, dengan
   `Authorization: Bearer $CRON_SECRET`. Pembersih harian yang sesungguhnya
   dipanggil Cron Trigger Workers lewat `scheduled` di worker.ts (tanpa HTTP
   dan tanpa rahasia bersama); rute ini tinggal membungkus badan yang sama
   (server/purge.ts), jadi kedua jalur membersihkan dengan aturan yang identik. */

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret === undefined || secret === "") {
    return Response.json(
      { error: "Pembersih belum diatur di server." },
      { status: 500 }
    )
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Tidak diizinkan." }, { status: 401 })
  }

  const bindings = getBindings()
  if (bindings === null) {
    return Response.json(
      { error: "Pembersih belum tersedia." },
      { status: 503 }
    )
  }

  try {
    const result = await purgeExpired(bindings.db, bindings.bucket, new Date())
    return Response.json({
      purged: result.strips + result.relays + result.events,
    })
  } catch (error) {
    console.error("GET /api/cron/purge gagal:", error)
    return Response.json(
      { error: "Pembersih gagal berjalan." },
      { status: 500 }
    )
  }
}
