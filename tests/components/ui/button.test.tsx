import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Button } from "@/components/ui/button"

const VARIANTS = {
  primary: ["bg-primary", "text-primary-foreground"],
  secondary: ["bg-secondary", "text-secondary-foreground"],
  neutral: ["bg-paper", "text-ink"],
  ghost: ["bg-transparent", "text-ink"],
} as const

describe("Button", () => {
  for (const [variant, classes] of Object.entries(VARIANTS)) {
    it(`varian ${variant} memakai isi dan teks dari token`, () => {
      render(
        <Button variant={variant as keyof typeof VARIANTS}>Mulai Foto</Button>
      )

      const button = screen.getByRole("button", { name: "Mulai Foto" })

      for (const className of [
        ...classes,
        "rounded-pill",
        "border-2",
        "border-ink",
        "shadow-hard",
        "font-sans",
        "font-bold",
        "hover:shadow-hard-hover",
        "hover:-translate-x-px",
        "hover:-translate-y-px",
        "active:translate-x-1",
        "active:translate-y-1",
        "active:shadow-none",
      ]) {
        expect(button.className).toContain(className)
      }
    })
  }

  it("nonaktif memakai isi cream, garis putus-dutus, dan tanpa bayangan", () => {
    render(<Button disabled>Lanjut Hias</Button>)

    const button = screen.getByRole("button", { name: "Lanjut Hias" })

    expect((button as HTMLButtonElement).disabled).toBe(true)
    for (const className of [
      "disabled:bg-cream",
      "disabled:text-muted",
      "disabled:border-dashed",
      "disabled:shadow-none",
    ]) {
      expect(button.className).toContain(className)
    }
  })

  it("ukuran mengikuti token tinggi 44 px (sm) dan 56 px (lg)", () => {
    render(
      <>
        <Button size="sm">Kecil</Button>
        <Button size="lg">Besar</Button>
      </>
    )

    expect(screen.getByRole("button", { name: "Kecil" }).className).toContain(
      "h-11"
    )
    expect(screen.getByRole("button", { name: "Besar" }).className).toContain(
      "h-14"
    )
  })
})
