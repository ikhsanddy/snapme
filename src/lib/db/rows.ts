/* Bentuk baris tabel `strips` dan `relays` (ARCHITECTURE §7) dan daftar kolom
   yang diambil rute. Dikumpulkan di satu tempat supaya tiap rute tidak menulis
   daftar kolomnya sendiri. Nama kolom snake_case dipertahankan sama seperti
   skema Postgres sebelumnya, jadi bentuk barisnya tidak berubah. */

export type StripStatus = "draft" | "complete" | "deleted"

export interface StripRow {
  id: string
  layout: string
  still_path: string | null
  live_path: string | null
  /** `deleted` adalah batu nisan penghapusan: berkasnya sudah dibuang, barisnya
   *  menunggu masa tenggang supaya pembersih tetap tahu path berkas yang
   *  mungkin diunggah setelah penghapusan. */
  status: StripStatus
  delete_token_hash: string
  created_at: string
  expires_at: string | null
}

export const STRIP_COLUMNS =
  "id, layout, still_path, live_path, status, delete_token_hash, created_at, expires_at"

export type RelayStatus = "waiting" | "claimed" | "complete" | "cancelled"

/** Satu slot estafet: indeks 0-based, pemiliknya, dan path berkasnya di
 *  bucket. Disimpan sebagai teks JSON di baris `relays`. */
export interface RelaySlot {
  index: number
  owner: "host" | "guest"
  path: string
}

export interface RelayRow {
  id: string
  layout: string
  /** Teks JSON (dialek SQLite tidak punya jsonb); pakai relaySlotsOf untuk
   *  membacanya. */
  slots: string
  host_token_hash: string
  guest_token_hash: string | null
  status: RelayStatus
  /** Strip hasil estafet. Diisi lewat UPDATE bersyarat `strip_id is null`
   *  sebagai gerbang pemenang tunggal jalur pemulihan (M9), jadi satu estafet
   *  tidak pernah punya dua draf strip. */
  strip_id: string | null
  rate_key: string
  created_at: string
  expires_at: string | null
}

export const RELAY_COLUMNS =
  "id, layout, slots, host_token_hash, guest_token_hash, status, strip_id, rate_key, created_at, expires_at"

function isRelaySlot(value: unknown): value is RelaySlot {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const slot = value as Record<string, unknown>
  return (
    typeof slot.index === "number" &&
    Number.isInteger(slot.index) &&
    (slot.owner === "host" || slot.owner === "guest") &&
    typeof slot.path === "string"
  )
}

/** Isi `slots` yang sudah diperiksa bentuknya. Semua pemakaian (halaman /r,
 *  rute claim/complete/strip, pembersih) lewat sini supaya satu baris cacat
 *  tidak menjatuhkan halaman atau menyandera pembersih. Isi yang bukan JSON
 *  sah diperlakukan sebagai daftar kosong, sama seperti array Postgres yang
 *  tidak berbentuk. */
export function relaySlotsOf(row: RelayRow): RelaySlot[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(row.slots)
  } catch {
    return []
  }
  return Array.isArray(parsed) ? parsed.filter(isRelaySlot) : []
}

/** Menghapus baris berdasarkan id dalam potongan kecil: D1 membatasi jumlah
 *  pernyataan per batch, sedangkan jumlah baris pembersihan tidak dibatasi. */
export const DELETE_BATCH_SIZE = 50
