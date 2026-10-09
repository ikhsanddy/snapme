import { describe, expect, it } from "vitest"

import { LAYOUTS, getLayout, type LayoutId } from "@/lib/layouts"

const IDS: LayoutId[] = ["strip-4", "strip-3"]

describe("geometri ekspor strip", () => {
  it("kanvas kedua layout pas 600 x 1800 px", () => {
    for (const id of IDS) {
      expect(getLayout(id).canvas).toEqual({ width: 600, height: 1800 })
    }
  })

  it("lebar pas: dua margin ditambah lebar slot sama dengan lebar kanvas", () => {
    for (const id of IDS) {
      const layout = getLayout(id)
      expect(layout.margin * 2 + layout.slot.width).toBe(layout.canvas.width)
      expect(layout.footerRect.width).toBe(layout.slot.width)
      expect(layout.footerRect.x).toBe(layout.margin)
    }
  })

  it("tinggi pas: margin, seluruh slot, jarak, dan kaki sama dengan tinggi kanvas", () => {
    for (const id of IDS) {
      const { margin, shotCount, slot, gap, footer, canvas } = getLayout(id)
      const used = margin + shotCount * slot.height + (shotCount - 1) * gap + footer.height
      expect(used).toBe(canvas.height)
    }
  })

  it("kaki strip menyentuh tepi bawah kanvas", () => {
    for (const id of IDS) {
      const { footerRect, canvas } = getLayout(id)
      expect(footerRect.y + footerRect.height).toBe(canvas.height)
    }
  })

  it("slot berurutan dari atas tanpa tumpang tindih, berjarak tepat satu gap", () => {
    for (const id of IDS) {
      const { slotRects, gap, margin, slot } = getLayout(id)
      slotRects.forEach((rect, index) => {
        expect(rect.x).toBe(margin)
        expect(rect.width).toBe(slot.width)
        expect(rect.height).toBe(slot.height)
        expect(rect.y).toBe(margin + index * (slot.height + gap))
        if (index > 0) {
          expect(rect.y - (slotRects[index - 1].y + slot.height)).toBe(gap)
        }
      })
    }
  })

  it("jumlah slot mengikuti layout dan berhenti sebelum kaki strip", () => {
    expect(getLayout("strip-4").shotCount).toBe(4)
    expect(getLayout("strip-4").slotRects).toHaveLength(4)
    expect(getLayout("strip-4").slot.height).toBe(372)

    expect(getLayout("strip-3").shotCount).toBe(3)
    expect(getLayout("strip-3").slotRects).toHaveLength(3)
    expect(getLayout("strip-3").slot.height).toBe(504)

    const lastSlot = getLayout("strip-4").slotRects.at(-1)
    expect(lastSlot?.y).toBeDefined()
    expect((lastSlot?.y ?? 0) + (lastSlot?.height ?? 0)).toBeLessThanOrEqual(
      getLayout("strip-4").footerRect.y
    )
  })

  it("label mengikuti DESIGN-SYSTEM §12", () => {
    expect(LAYOUTS["strip-4"].label).toBe("Strip 4 foto")
    expect(LAYOUTS["strip-3"].label).toBe("Strip 3 foto")
  })
})
