/* M6 (SH-06): token hapus disimpan di perangkat pembuat, bukan di state sesi
   dan bukan di server (hanya hash-nya yang ada di basis data). Kuncinya per id
   strip supaya beberapa link bisa hidup berdampingan. Pola dan pemakaian
   localStorage mengikuti GESTURE_PREF_KEY di stores/booth.ts. */

const KEY_PREFIX = "snapme:strip-token:"

export function saveStripToken(id: string, token: string): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(KEY_PREFIX + id, token)
  } catch {
    /* Mode privat: strip tetap bisa dibagikan, hanya tidak bisa dihapus dari
       perangkat ini. */
  }
}

export function readStripToken(id: string): string | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    return window.localStorage.getItem(KEY_PREFIX + id)
  } catch {
    return null
  }
}

export function clearStripToken(id: string): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.removeItem(KEY_PREFIX + id)
  } catch {
    /* Tidak ada yang bisa dihapus. */
  }
}
