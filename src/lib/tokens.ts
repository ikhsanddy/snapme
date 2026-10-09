import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { nanoid } from "nanoid"

/* ARCHITECTURE §8: token dibuat acak, disimpan di perangkat pengguna, dan
   hanya hash-nya yang masuk basis data. Berkas ini memakai `node:crypto`, jadi
   hanya boleh diimpor dari kode server. */

export const STRIP_ID_LENGTH = 12
/* 32 bita acak sebagai base64url: 43 karakter, jauh di atas tebakan. */
const TOKEN_BYTES = 32

/** ID link strip (ARCHITECTURE §8: nanoid 12 karakter atau lebih). */
export function newStripId(): string {
  return nanoid(STRIP_ID_LENGTH)
}

/** M8: ID link estafet. Panjangnya sama dengan ID strip (ARCHITECTURE §8:
 *  nanoid 12 karakter atau lebih), tapi konsepnya berbeda: relay adalah baris
 *  sendiri, bukan strip. */
export function newRelayId(): string {
  return nanoid(STRIP_ID_LENGTH)
}

export function newDeleteToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Perbandingan waktu tetap; panjang diperiksa lebih dulu karena
 *  `timingSafeEqual` melempar galat bila panjangnya berbeda. */
export function verifyToken(token: string, hash: string): boolean {
  const candidate = Buffer.from(hashToken(token), "hex")
  const expected = Buffer.from(hash, "hex")
  if (candidate.length !== expected.length) {
    return false
  }
  return timingSafeEqual(candidate, expected)
}
