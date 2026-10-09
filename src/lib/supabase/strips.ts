/* Bentuk baris tabel `strips` (ARCHITECTURE §7) dan daftar kolom yang
   diambil rute. Dikumpulkan di satu tempat supaya tiap rute tidak menulis
   daftar kolomnya sendiri. */

export interface StripRow {
  id: string
  layout: string
  still_path: string | null
  live_path: string | null
  /** `deleted` adalah batu nisan penghapusan: berkasnya sudah dibuang, barisnya
   *  menunggu masa tenggang supaya pembersih tetap tahu path berkas yang
   *  mungkin diunggah setelah penghapusan. */
  status: "draft" | "complete" | "deleted"
  delete_token_hash: string
  created_at: string
  expires_at: string | null
}

export const STRIP_COLUMNS =
  "id, layout, still_path, live_path, status, delete_token_hash, created_at, expires_at"
