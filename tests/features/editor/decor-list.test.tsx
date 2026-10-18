import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { DecorList } from "@/features/editor/DecorList"
import { useBoothStore } from "@/stores/booth"

/* M4 (DESIGN-SYSTEM §11): padanan daftar untuk keyboard dan pembaca layar.
   Kanvas tidak diuji di sini; berkas ini menjaga bahwa tiap operasi hias bisa
   diselesaikan tanpa penunjuk. */

describe("DecorList", () => {
  beforeEach(() => {
    useBoothStore.getState().reset()
  })

  it("tidak dirender selama strip belum dihias", () => {
    const { container } = render(<DecorList />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole("region", { name: "Isi strip" })).toBeNull()
  })

  it("menampilkan stiker baru beserta posisinya", () => {
    useBoothStore.getState().addSticker("star")
    render(<DecorList />)

    expect(screen.getByText("Stiker Bintang")).toBeTruthy()
    expect(screen.getByText("x 300 · y 900 · 120 px · -6°")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Pindah kanan: Bintang" })
    ).toBeTruthy()
  })

  it("memindahkan dan menghapus stiker lewat tombol", () => {
    useBoothStore.getState().addSticker("heart")
    render(<DecorList />)

    fireEvent.click(screen.getByRole("button", { name: "Pindah kanan: Hati" }))
    expect(screen.getByText("x 308 · y 900 · 120 px · -6°")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Pindah atas: Hati" }))
    expect(screen.getByText("x 308 · y 892 · 120 px · -6°")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Putar: Hati" }))
    expect(screen.getByText("x 308 · y 892 · 120 px · 9°")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Perbesar: Hati" }))
    expect(screen.getByText("x 308 · y 892 · 132 px · 9°")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Perkecil: Hati" }))
    expect(screen.getByText("x 308 · y 892 · 120 px · 9°")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Hapus: Hati" }))
    expect(screen.queryByText("Stiker Hati")).toBeNull()
    expect(useBoothStore.getState().stickers).toEqual([])
  })

  it("menampilkan teks strip dengan tombol ukuran dan hapus", () => {
    useBoothStore.getState().setStripText("halo")
    render(<DecorList />)

    expect(screen.getByText("Teks halo")).toBeTruthy()
    expect(screen.getByText("ukuran 44 px")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Perbesar: Teks halo" }))
    expect(useBoothStore.getState().texts[0].fontSize).toBe(48)

    fireEvent.click(screen.getByRole("button", { name: "Hapus: Teks halo" }))
    expect(useBoothStore.getState().texts).toEqual([])
  })
})
