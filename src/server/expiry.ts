/* ARCHITECTURE §5 dan PRD §7.3: aturan umur data. Fungsi murni supaya bisa
   diuji tanpa basis data, dan dipakai dua kali: saat membuat (memasang
   `expires_at`) dan saat membaca (menjawab 410 walau pembersih belum jalan). */

export const STRIP_TTL_DAYS = 7
/* M8 (SE-08): link estafet aktif 48 jam sejak dibuat dan tidak diperpanjang
   saat temannya mengambil giliran atau menuntaskan strip. */
export const RELAY_TTL_HOURS = 48
/* Draf yang tidak pernah diselesaikan (pengguna menutup halaman sebelum
   mengunggah) tidak punya `expires_at`; pembersih membuangnya setelah ini. */
export const STALE_DRAFT_HOURS = 24
/* Baris `deleted` (batu nisan) disimpan selama ini setelah penghapusan.
   URL unggah bertanda tangan berlaku sekitar 2 jam dan Storage tidak melihat
   tabel `strips`, jadi berkas bisa diunggah setelah barisnya dihapus; batu
   nisan menjaga path-nya tetap diketahui pembersih, dan sekaligus menjaga
   kuota pembatasan laju tidak bisa dikembalikan dengan menghapus baris. */
export const DELETED_GRACE_HOURS = 3
/* M9 (PRD §4): peristiwa analitik disimpan 90 hari supaya rasio antar kuartal
   masih bisa dihitung tanpa menyimpan hitungannya selamanya. */
export const EVENT_RETENTION_DAYS = 90

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

export function stripExpiry(from: Date): Date {
  return new Date(from.getTime() + STRIP_TTL_DAYS * DAY_MS)
}

/** M8 (SE-08): link estafet kedaluwarsa 48 jam sejak dibuat. */
export function relayExpiry(from: Date): Date {
  return new Date(from.getTime() + RELAY_TTL_HOURS * HOUR_MS)
}

export function deletedGraceExpiry(from: Date): Date {
  return new Date(from.getTime() + DELETED_GRACE_HOURS * HOUR_MS)
}

export function isExpired(expiresAt: string | null, now: Date): boolean {
  if (expiresAt === null) {
    return false
  }
  const at = Date.parse(expiresAt)
  if (Number.isNaN(at)) {
    return false
  }
  return at <= now.getTime()
}

export function isStaleDraft(
  createdAt: string,
  status: string,
  now: Date
): boolean {
  if (status !== "draft") {
    return false
  }
  const at = Date.parse(createdAt)
  if (Number.isNaN(at)) {
    return false
  }
  return at <= now.getTime() - STALE_DRAFT_HOURS * HOUR_MS
}

/** M9: batas umur peristiwa analitik; pembersih membuang yang lebih tua. */
export function eventRetentionCutoff(from: Date): Date {
  return new Date(from.getTime() - EVENT_RETENTION_DAYS * DAY_MS)
}
