import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GestureHUD, resolveHudState } from "@/components/booth/GestureHUD"

/* DESIGN-SYSTEM §11: HUD gesture memakai `role="status"`. Keadaan `holding`
   tidak bisa dipicu kamera palsu, jadi dibuktikan di sini. */

const BASE = {
  cameraActive: true,
  enabled: true,
  status: "ready" as const,
  phase: "ready" as const,
  holdAction: null,
}

describe("resolveHudState", () => {
  it("menyembunyikan HUD saat kamera belum aktif atau model gagal", () => {
    expect(resolveHudState({ ...BASE, cameraActive: false })).toBe("hidden")
    expect(
      resolveHudState({ ...BASE, cameraActive: false, holdAction: "snap" })
    ).toBe("hidden")
    expect(resolveHudState({ ...BASE, status: "failed" })).toBe("hidden")
    expect(
      resolveHudState({ ...BASE, status: "failed", phase: "complete" })
    ).toBe("hidden")
  })

  it("menahan selalu menang atas keadaan lain", () => {
    expect(resolveHudState({ ...BASE, holdAction: "snap" })).toBe("holding")
    expect(
      resolveHudState({ ...BASE, enabled: false, holdAction: "retake" })
    ).toBe("holding")
    expect(
      resolveHudState({ ...BASE, status: "loading", holdAction: "snap" })
    ).toBe("holding")
  })

  it("sakelar mati: mati saat siap, selesai saat semua slot terisi", () => {
    expect(resolveHudState({ ...BASE, enabled: false })).toBe("off")
    expect(
      resolveHudState({ ...BASE, enabled: false, phase: "complete" })
    ).toBe("done")
    expect(
      resolveHudState({ ...BASE, enabled: false, phase: "countdown" })
    ).toBe("hidden")
  })

  it("menampilkan status memuat hanya saat pratinjau siap", () => {
    expect(resolveHudState({ ...BASE, status: "loading" })).toBe("loading")
    expect(
      resolveHudState({ ...BASE, status: "loading", phase: "countdown" })
    ).toBe("hidden")
  })

  it("siap: siap saat pratinjau siap, selesai saat semua slot terisi, sisanya sembunyi", () => {
    expect(resolveHudState(BASE)).toBe("ready")
    expect(resolveHudState({ ...BASE, phase: "complete" })).toBe("done")
    expect(resolveHudState({ ...BASE, phase: "countdown" })).toBe("hidden")
    expect(resolveHudState({ ...BASE, phase: "capturing" })).toBe("hidden")
    expect(resolveHudState({ ...BASE, phase: "pause" })).toBe("hidden")
    expect(resolveHudState({ ...BASE, phase: "holding" })).toBe("hidden")
  })

  it("status idle saat sakelar menyala tidak menampilkan apa pun", () => {
    expect(resolveHudState({ ...BASE, status: "idle" })).toBe("hidden")
  })
})

describe("GestureHUD", () => {
  it("keadaan siap menyebut perintahnya", () => {
    render(<GestureHUD state="ready" />)
    expect(screen.getByRole("status")).toBeTruthy()
    expect(screen.getByText("Angkat dua jari, tahan sebentar")).toBeTruthy()
  })

  it("keadaan memuat menyebut sedang menyiapkan", () => {
    render(<GestureHUD state="loading" />)
    expect(screen.getByText("Menyiapkan gesture...")).toBeTruthy()
  })

  it("keadaan mati menyebut jalan lain", () => {
    render(<GestureHUD state="off" />)
    expect(screen.getByText("Gesture mati. Pakai tombol kamera.")).toBeTruthy()
  })

  it("keadaan selesai menyebut jumlah foto", () => {
    render(<GestureHUD state="done" shotCount={4} />)
    expect(screen.getByText("4 foto siap dihias")).toBeTruthy()
  })

  it("keadaan tersembunyi tidak merender apa pun", () => {
    const { container } = render(<GestureHUD state="hidden" />)
    expect(container.firstChild).toBeNull()
  })

  it("keadaan menahan mengisi batang sesuai progres", () => {
    const { container } = render(<GestureHUD state="holding" progress={0.35} />)
    expect(screen.getByText("Terdeteksi. Tahan...")).toBeTruthy()

    const bar = container.querySelector<HTMLDivElement>("div[style]")
    expect(bar?.style.width).toBe("35%")
  })

  it("progres nol dan penuh dipotong ke 0 dan 100 persen", () => {
    const kosong = render(<GestureHUD state="holding" progress={0} />)
    expect(
      kosong.container.querySelector<HTMLDivElement>("div[style]")?.style.width
    ).toBe("0%")
    kosong.unmount()

    const penuh = render(<GestureHUD state="holding" progress={1} />)
    expect(
      penuh.container.querySelector<HTMLDivElement>("div[style]")?.style.width
    ).toBe("100%")
  })
})
