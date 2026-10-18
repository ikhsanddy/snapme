import { describe, expect, it } from "vitest"

import {
  deletedGraceExpiry,
  DELETED_GRACE_HOURS,
  isExpired,
  isStaleDraft,
  STALE_DRAFT_HOURS,
  STRIP_TTL_DAYS,
  stripExpiry,
} from "@/server/expiry"

/* PRD §7.4 (SH-06) dan MILESTONES M6: umur strip 7 hari, dan kedaluwarsa
   diperiksa saat baca, bukan hanya oleh pembersih harian. */

const NOW = new Date("2026-10-12T09:00:00.000Z")

describe("kedaluwarsa strip", () => {
  it("memasang tanggal tepat 7 hari setelah pembuatan", () => {
    const expiry = stripExpiry(NOW)
    expect(expiry.toISOString()).toBe("2026-10-19T09:00:00.000Z")
    expect(expiry.getTime() - NOW.getTime()).toBe(STRIP_TTL_DAYS * 86_400_000)
  })

  it("menganggap batas sebagai kedaluwarsa, sesaat sebelumnya tidak", () => {
    expect(isExpired("2026-10-12T08:59:59.999Z", NOW)).toBe(true)
    expect(isExpired(NOW.toISOString(), NOW)).toBe(true)
    expect(isExpired("2026-10-12T09:00:00.001Z", NOW)).toBe(false)
  })

  it("tanpa tanggal atau dengan tanggal rusak tidak dianggap kedaluwarsa", () => {
    expect(isExpired(null, NOW)).toBe(false)
    expect(isExpired("bukan-tanggal", NOW)).toBe(false)
  })

  it("draf basi dihitung dari created_at, bukan dari expires_at", () => {
    const stale = new Date(
      NOW.getTime() - (STALE_DRAFT_HOURS + 1) * 3_600_000
    ).toISOString()
    const fresh = new Date(NOW.getTime() - 3_600_000).toISOString()
    expect(isStaleDraft(stale, "draft", NOW)).toBe(true)
    expect(isStaleDraft(fresh, "draft", NOW)).toBe(false)
    /* Batasnya inklusif: tepat 24 jam sudah basi. */
    expect(
      isStaleDraft(
        new Date(NOW.getTime() - STALE_DRAFT_HOURS * 3_600_000).toISOString(),
        "draft",
        NOW
      )
    ).toBe(true)
  })

  it("baris complete yang lewat umurnya bukan draf basi", () => {
    const long = new Date(NOW.getTime() - 100 * 3_600_000).toISOString()
    expect(isStaleDraft(long, "complete", NOW)).toBe(false)
    expect(isStaleDraft("bukan-tanggal", "draft", NOW)).toBe(false)
  })

  /* Batu nisan penghapusan harus hidup lebih lama dari token unggah bertanda
     tangan (sekitar 2 jam), kalau tidak berkas yang diunggah setelah
     penghapusan kehilangan jejaknya. */
  it("masa tenggang batu nisan lebih panjang dari umur token unggah", () => {
    expect(DELETED_GRACE_HOURS).toBeGreaterThan(2)
    expect(deletedGraceExpiry(NOW).getTime() - NOW.getTime()).toBe(
      DELETED_GRACE_HOURS * 3_600_000
    )
    expect(isExpired(deletedGraceExpiry(NOW).toISOString(), NOW)).toBe(false)
  })
})
