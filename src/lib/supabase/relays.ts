/* Bentuk baris tabel `relays` (ARCHITECTURE §7) dan daftar kolom yang diambil
   rute. Dikumpulkan di satu tempat supaya tiap rute tidak menulis daftar
   kolomnya sendiri. */

export type RelayStatus = "waiting" | "claimed" | "complete" | "cancelled"

/** Satu slot estafet: indeks 0-based, pemiliknya, dan path berkasnya di
 *  Storage. Disimpan sebagai jsonb di baris `relays`. */
export interface RelaySlot {
  index: number
  owner: "host" | "guest"
  path: string
}

export interface RelayRow {
  id: string
  layout: string
  slots: RelaySlot[]
  host_token_hash: string
  guest_token_hash: string | null
  status: RelayStatus
  rate_key: string
  created_at: string
  expires_at: string | null
}

export const RELAY_COLUMNS =
  "id, layout, slots, host_token_hash, guest_token_hash, status, rate_key, created_at, expires_at"

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
 *  tidak menjatuhkan halaman atau menyandera pembersih. */
export function relaySlotsOf(row: RelayRow): RelaySlot[] {
  return Array.isArray(row.slots)
    ? (row.slots as unknown[]).filter(isRelaySlot)
    : []
}
