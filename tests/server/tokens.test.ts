import { describe, expect, it } from "vitest"

import {
  hashToken,
  newDeleteToken,
  newStripId,
  STRIP_ID_LENGTH,
  verifyToken,
} from "@/server/tokens"

/* ARCHITECTURE §8: token hapus dibuat acak, disimpan di perangkat pengguna,
   dan hanya hash-nya yang masuk basis data. */

describe("token hapus", () => {
  it("membuat token acak yang berbeda tiap panggilan", () => {
    const first = newDeleteToken()
    const second = newDeleteToken()
    expect(first).not.toBe(second)
    expect(first).toMatch(/^[A-Za-z0-9_-]{40,}$/)
  })

  it("hash deterministik dan bisa diverifikasi", () => {
    const token = newDeleteToken()
    const hash = hashToken(token)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(token)).toBe(hash)
    expect(verifyToken(token, hash)).toBe(true)
  })

  it("menolak token lain, hash cacat, dan hash kosong", () => {
    const hash = hashToken("token-benar")
    expect(verifyToken("token-salah", hash)).toBe(false)
    expect(verifyToken("token-benar", "bukan-hex")).toBe(false)
    expect(verifyToken("token-benar", "")).toBe(false)
    expect(verifyToken("", hash)).toBe(false)
  })

  it("ID strip sepanjang STRIP_ID_LENGTH dan tidak berulang", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newStripId()))
    expect(ids.size).toBe(50)
    for (const id of ids) {
      expect(id).toHaveLength(STRIP_ID_LENGTH)
    }
  })
})
