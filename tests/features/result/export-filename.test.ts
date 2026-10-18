import { describe, expect, it } from "vitest"

import { formatStripFilename } from "@/features/result/exportStrip"

/* FR-11: nama berkas `snapme-YYYYMMDD-HHmm.png` memakai waktu lokal perangkat,
   dengan setiap bagian berlebar tetap. */

describe("formatStripFilename", () => {
  it("memakai tahun empat digit dan bulan, tanggal, jam, menit dua digit", () => {
    expect(formatStripFilename(new Date(2026, 9, 9, 14, 32))).toBe(
      "snapme-20261009-1432.png"
    )
    expect(formatStripFilename(new Date(2026, 0, 5, 9, 7))).toBe(
      "snapme-20260105-0907.png"
    )
    expect(formatStripFilename(new Date(2027, 11, 31, 23, 59))).toBe(
      "snapme-20271231-2359.png"
    )
  })

  it("memakai waktu lokal, bukan UTC", () => {
    /* Tengah malam tanggal 1 Maret waktu lokal tetap menjadi 1 Maret, apa pun
       zona waktu mesin yang menjalankan uji ini. */
    const lokal = new Date(2026, 2, 1, 0, 0)
    expect(formatStripFilename(lokal)).toBe("snapme-20260301-0000.png")
  })
})
