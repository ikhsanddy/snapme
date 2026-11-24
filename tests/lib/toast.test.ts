import { describe, expect, it, vi } from "vitest"

import { loadToast } from "@/lib/toast"

vi.mock("sonner", () => {
  throw new Error("Sonner chunk unavailable")
})

describe("loadToast", () => {
  it("returns null when the lazy Sonner chunk fails to load", async () => {
    expect(await loadToast()).toBeNull()
  })
})
