import {
  eventRetentionCutoff,
  isExpired,
  isStaleDraft,
  STALE_DRAFT_HOURS,
} from "@/lib/expiry"
import { STORAGE_BUCKET } from "@/lib/schemas"
import { RELAY_COLUMNS, relaySlotsOf, type RelayRow } from "@/lib/supabase/relays"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { STRIP_COLUMNS, type StripRow } from "@/lib/supabase/strips"

/* ARCHITECTURE §7: GET /api/cron/purge dijalankan Vercel Cron harian dengan
   `Authorization: Bearer $CRON_SECRET` (header itu dikirim otomatis oleh
   Vercel Cron). Dua kelompok dibersihkan: baris yang sudah lewat
   `expires_at`, dan draf yang tidak pernah diselesaikan kliennya (pengguna
   menutup halaman sebelum mengunggah), supaya baris yatim tidak menumpuk.
   M8 menambahkan kelompok yang sama untuk `relays`: link estafet 48 jam dan
   baris yang dibatalkan (masa tenggang batu nisannya sendiri) dibuang beserta
   berkas slotnya.
   M9 menambahkan kelompok `events`: peristiwa analitik yang lebih tua dari 90
   hari dibuang (PRD §4), tanpa berkas Storage karena tabelnya hanya berisi
   hitungan.
   Kedaluwarsa tetap juga diperiksa saat baca (complete/DELETE dan halaman
   /s/[id] serta /r/[id]), jadi pembersih ini menjaga penyimpanan, bukan
   kebenaran status. */

const HOUR_MS = 3_600_000

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

  const admin = getSupabaseAdmin()
  if (admin === null) {
    return Response.json(
      { error: "Pembersih belum tersedia." },
      { status: 503 }
    )
  }

  const now = new Date()
  try {
    const { data: expiredRows, error: expiredError } = await admin
      .from("strips")
      .select(STRIP_COLUMNS)
      .not("expires_at", "is", null)
      .lte("expires_at", now.toISOString())
    if (expiredError !== null) {
      throw new Error(expiredError.message)
    }

    const staleBefore = new Date(
      now.getTime() - STALE_DRAFT_HOURS * HOUR_MS
    ).toISOString()
    const { data: draftRows, error: draftError } = await admin
      .from("strips")
      .select(STRIP_COLUMNS)
      .eq("status", "draft")
      .lte("created_at", staleBefore)
    if (draftError !== null) {
      throw new Error(draftError.message)
    }

    /* Penyaringan dilakukan lewat fungsi murni lib/expiry.ts, bukan hanya
       filter kueri, supaya aturannya satu sumber dengan rute lain. */
    const rows = [
      ...((expiredRows ?? []) as StripRow[]),
      ...((draftRows ?? []) as StripRow[]),
    ].filter(
      (row) =>
        isExpired(row.expires_at, now) ||
        isStaleDraft(row.created_at, row.status, now)
    )
    const ids = [...new Set(rows.map((row) => row.id))]
    let purged = 0
    if (ids.length > 0) {
      const paths = rows
        .flatMap((row) => [row.still_path, row.live_path])
        .filter((path): path is string => path !== null)
      if (paths.length > 0) {
        const { error: removeError } = await admin.storage
          .from(STORAGE_BUCKET)
          .remove(paths)
        if (removeError !== null) {
          throw new Error(removeError.message)
        }
      }

      const { error: deleteError } = await admin
        .from("strips")
        .delete()
        .in("id", ids)
      if (deleteError !== null) {
        throw new Error(deleteError.message)
      }
      purged += ids.length
    }

    /* M8: link estafet yang lewat 48 jam, dan baris yang dibatalkan setelah
       masa tenggangnya habis. Strip hasil estafet tidak disentuh di sini: ia
       punya umur 7 hari sendiri (SE-08). */
    const { data: relayRows, error: relayError } = await admin
      .from("relays")
      .select(RELAY_COLUMNS)
      .not("expires_at", "is", null)
      .lte("expires_at", now.toISOString())
    if (relayError !== null) {
      throw new Error(relayError.message)
    }
    const relays = ((relayRows ?? []) as RelayRow[]).filter((row) =>
      isExpired(row.expires_at, now)
    )
    const relayIds = [...new Set(relays.map((row) => row.id))]
    if (relayIds.length > 0) {
      const relayPaths = relays.flatMap((row) =>
        relaySlotsOf(row).map((slot) => slot.path)
      )
      if (relayPaths.length > 0) {
        const { error: relayRemoveError } = await admin.storage
          .from(STORAGE_BUCKET)
          .remove(relayPaths)
        if (relayRemoveError !== null) {
          throw new Error(relayRemoveError.message)
        }
      }
      const { error: relayDeleteError } = await admin
        .from("relays")
        .delete()
        .in("id", relayIds)
      if (relayDeleteError !== null) {
        throw new Error(relayDeleteError.message)
      }
      purged += relayIds.length
    }

    /* M9 (PRD §4): peristiwa analitik disimpan 90 hari. Tabelnya hanya berisi
       hitungan, jadi tidak ada berkas Storage yang perlu dibersihkan. */
    const { data: eventRows, error: eventError } = await admin
      .from("events")
      .select("id")
      .lte("created_at", eventRetentionCutoff(now).toISOString())
    if (eventError !== null) {
      throw new Error(eventError.message)
    }
    const eventIds = ((eventRows ?? []) as { id: number }[]).map((row) => row.id)
    if (eventIds.length > 0) {
      const { error: eventDeleteError } = await admin
        .from("events")
        .delete()
        .in("id", eventIds)
      if (eventDeleteError !== null) {
        throw new Error(eventDeleteError.message)
      }
      purged += eventIds.length
    }

    return Response.json({ purged })
  } catch (error) {
    console.error("GET /api/cron/purge gagal:", error)
    return Response.json(
      { error: "Pembersih gagal berjalan." },
      { status: 500 }
    )
  }
}
