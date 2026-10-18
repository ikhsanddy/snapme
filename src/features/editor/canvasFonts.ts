/* Fon untuk kanvas. `next/font` menghasilkan nama keluarga ber-hash
   (`__Unbounded_ab12cd`), jadi nama konkretnya dibaca dari elemen probe yang
   memakai utilitas token DESIGN-SYSTEM §13, bukan ditulis ulang di sini. */

type FontRole = "display" | "sans" | "mono"

const PROBE_CLASS: Record<FontRole, string> = {
  display: "font-display",
  sans: "font-sans",
  mono: "font-mono",
}

/* Tiga peran tetap, jadi tabelnya Record, bukan Map. */
const familyCache: Partial<Record<FontRole, string>> = {}

export function resolveFontFamily(role: FontRole): string {
  const cached = familyCache[role]
  if (cached !== undefined) {
    return cached
  }

  const probe = document.createElement("span")
  probe.className = PROBE_CLASS[role]
  probe.textContent = "snapme"
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  document.body.appendChild(probe)
  const family = window.getComputedStyle(probe).fontFamily
  probe.remove()

  if (family.length > 0) {
    familyCache[role] = family
  }
  return family
}

/* Berat dan ukuran yang benar-benar dipakai teks kanvas (kaki strip, tanggal,
   teks pengguna). Memuatnya lebih dulu mencegah Konva menggambar dengan fon
   cadangan lalu tidak pernah menggambar ulang. */
const LOAD_SPECS: [FontRole, string][] = [
  ["display", "900 40px"],
  ["mono", "700 28px"],
  ["sans", "700 44px"],
]

export async function ensureFontsReady(): Promise<void> {
  const specs = LOAD_SPECS.map(
    ([role, spec]) => `${spec} ${resolveFontFamily(role)}`
  )
  await Promise.all(
    specs.map((spec) => document.fonts.load(spec).catch(() => []))
  )
  await document.fonts.ready
}
