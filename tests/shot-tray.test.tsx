import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ShotTray } from "@/components/booth/ShotTray"
import type { Shot } from "@/stores/booth"

const SLOT_RATIO = 528 / 372

function shot(still: string): Shot {
  return { still, capturedAt: 1 }
}

describe("ShotTray", () => {
  it("menampilkan nomor slot untuk tiap slot kosong", () => {
    render(
      <ShotTray
        shots={[null, null, null, null]}
        slotRatio={SLOT_RATIO}
        busy={false}
        onRetake={() => undefined}
      />
    )

    for (const nomor of ["1", "2", "3", "4"]) {
      expect(screen.getByText(nomor)).toBeTruthy()
    }
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("slot terisi jadi tombol ulang foto yang menunjuk indeksnya sendiri", () => {
    const onRetake = vi.fn()
    render(
      <ShotTray
        shots={[shot("data:image/jpeg;base64,a"), null, shot("data:image/jpeg;base64,b"), null]}
        slotRatio={SLOT_RATIO}
        busy={false}
        onRetake={onRetake}
      />
    )

    /* Slot 3 tetap menyediakan tombol ulangnya sendiri meski slot 2 kosong. */
    fireEvent.click(screen.getByRole("button", { name: "Ulang foto 3" }))
    expect(onRetake).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole("button", { name: "Ulang foto 1" }))
    expect(onRetake).toHaveBeenLastCalledWith(0)

    /* Slot kosong tidak bisa ditekan. */
    expect(screen.queryByRole("button", { name: "Ulang foto 2" })).toBeNull()
  })

  it("mengunci tombol selama pengambilan berlangsung", () => {
    render(
      <ShotTray
        shots={[shot("data:image/jpeg;base64,a"), null]}
        slotRatio={SLOT_RATIO}
        busy
        onRetake={() => undefined}
      />
    )

    const tombol = screen.getByRole("button", { name: "Ulang foto 1" })
    expect((tombol as HTMLButtonElement).disabled).toBe(true)
  })
})
