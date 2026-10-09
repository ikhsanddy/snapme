import { describe, expect, it } from "vitest"

import {
  isExpired,
  RELAY_TTL_HOURS,
  relayExpiry,
} from "@/lib/expiry"
import { LAYOUTS, type LayoutId } from "@/lib/layouts"
import {
  ghostSlotFor,
  hostSlotIndices,
  relaySlotsFor,
} from "@/lib/relaySlots"

/* PRD §7.3 (SE-01, SE-04, SE-05, SE-08) dan MILESTONES M8: pembagian slot
   estafet dan umur linknya. Fungsi murni, jadi diuji tanpa kamera maupun
   basis data. */

const NOW = new Date("2026-10-14T09:00:00.000Z")

describe("pembagian slot estafet", () => {
  it("pembuat mengisi indeks genap, teman indeks ganjil, di semua layout", () => {
    function indeks(owner: "host" | "guest", layoutId: LayoutId): number[] {
      return relaySlotsFor(layoutId)
        .filter((slot) => slot.owner === owner)
        .map((slot) => slot.index)
    }

    expect(hostSlotIndices("strip-4")).toEqual([0, 2])
    expect(indeks("guest", "strip-4")).toEqual([1, 3])

    expect(hostSlotIndices("strip-3")).toEqual([0, 2])
    expect(indeks("guest", "strip-3")).toEqual([1])

    expect(hostSlotIndices("grid-2x2")).toEqual([0, 2])
    expect(indeks("guest", "grid-2x2")).toEqual([1, 3])
  })

  it("setiap layout terbagi habis tanpa slot yang hilang atau dobel", () => {
    for (const [id, layout] of Object.entries(LAYOUTS)) {
      const slots = relaySlotsFor(id as keyof typeof LAYOUTS)
      expect(slots).toHaveLength(layout.shotCount)
      expect(slots.map((slot) => slot.index)).toEqual(
        Array.from({ length: layout.shotCount }, (_, index) => index)
      )
      const host = slots.filter((slot) => slot.owner === "host")
      const guest = slots.filter((slot) => slot.owner === "guest")
      expect(host.length + guest.length).toBe(layout.shotCount)
      /* SE-01: tombol estafet baru muncul setelah minimal setengah slot
         terisi, dan pembuat selalu mengisi tepat setengahnya. */
      expect(host.length).toBeGreaterThanOrEqual(layout.shotCount / 2)
    }
  })

  it("bayangan pose teman selalu slot pembuat tepat sebelumnya", () => {
    expect(ghostSlotFor(0)).toBeNull()
    expect(ghostSlotFor(1)).toBe(0)
    expect(ghostSlotFor(2)).toBe(1)
    expect(ghostSlotFor(3)).toBe(2)
  })
})

describe("kedaluwarsa estafet", () => {
  it("tepat 48 jam sejak dibuat", () => {
    const expiry = relayExpiry(NOW)
    expect(expiry.toISOString()).toBe("2026-10-16T09:00:00.000Z")
    expect(expiry.getTime() - NOW.getTime()).toBe(RELAY_TTL_HOURS * 3_600_000)
  })

  it("batas inklusif dan tanggal rusak tidak dianggap kedaluwarsa", () => {
    expect(isExpired(relayExpiry(NOW).toISOString(), NOW)).toBe(false)
    expect(
      isExpired(new Date(relayExpiry(NOW).getTime() - 1).toISOString(), NOW)
    ).toBe(false)
    expect(isExpired(relayExpiry(NOW).toISOString(), relayExpiry(NOW))).toBe(true)
    expect(isExpired("bukan-tanggal", NOW)).toBe(false)
  })
})
