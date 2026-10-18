/* M8: token estafet disimpan di perangkat pemiliknya, bukan di state sesi dan
   bukan di server (hanya hash-nya yang ada di basis data). Kuncinya per id
   estafet, dan nilainya memuat peran sekaligus, supaya satu perangkat bisa
   mengenali dirinya sebagai pembuat atau teman pada link yang sama.

   Pola dan pemakaian localStorage mengikuti features/share/stripToken.ts. */

const KEY_PREFIX = "snapme:relay-token:"

interface StoredRelayToken {
  role: "host" | "guest"
  token: string
}

export function saveRelayToken(
  id: string,
  role: StoredRelayToken["role"],
  token: string
): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(
      KEY_PREFIX + id,
      JSON.stringify({ role, token } satisfies StoredRelayToken)
    )
  } catch {
    /* Mode privat: estafet tetap jalan, hanya tidak bisa dilanjutkan dari
       perangkat ini setelah halaman ditutup. */
  }
}

export function readRelayToken(id: string): StoredRelayToken | null {
  return parseRelayToken(rawRelayToken(id))
}

/** Nilai mentah dari localStorage. Dipakai sebagai snapshot
 *  `useSyncExternalStore`: identitasnya stabil selama isinya tidak berubah,
 *  sedangkan objek hasil parse selalu baru dan akan memicu render tanpa henti. */
export function rawRelayToken(id: string): string | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    return window.localStorage.getItem(KEY_PREFIX + id)
  } catch {
    return null
  }
}

export function parseRelayToken(raw: string | null): StoredRelayToken | null {
  if (raw === null) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) {
      return null
    }
    const value = parsed as Record<string, unknown>
    if (
      (value.role !== "host" && value.role !== "guest") ||
      typeof value.token !== "string" ||
      value.token === ""
    ) {
      return null
    }
    return { role: value.role, token: value.token }
  } catch {
    return null
  }
}

export function clearRelayToken(id: string): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.removeItem(KEY_PREFIX + id)
  } catch {
    /* Tidak ada yang bisa dihapus. */
  }
}
