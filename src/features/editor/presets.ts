/* ARCHITECTURE §6 dan DESIGN-SYSTEM §10.3: data murni untuk hias strip.
   Berkas ini TIDAK mengimpor Konva supaya bisa dipakai lapisan UI, store, dan
   uji tanpa memuat pustaka kanvas. Nilai warna ditulis sebagai nama variabel
   token, bukan heks: kanvas memakai `resolveTokenColor` untuk membacanya
   (DESIGN-SYSTEM §14: tidak ada nilai mentah di luar globals.css). */

export interface FramePreset {
  id: string
  label: string
  /** Nama variabel token untuk latar strip. */
  bg: string
  /** Garis tepi tiap slot foto. */
  slotBorder: string
  /** Warna wordmark "snapme" di kaki strip. */
  wordmark: string
}

/* Urutan tetap. Setiap pasangan teks dan latar sudah ada di tabel kontras
   DESIGN-SYSTEM §2 (ink di paper/lime/pink/violet-soft, lime di ink,
   paper di violet). */
export const FRAMES: FramePreset[] = [
  {
    id: "klasik",
    label: "Klasik",
    bg: "--color-paper",
    slotBorder: "--color-ink",
    wordmark: "--color-ink",
  },
  {
    id: "malam",
    label: "Malam",
    bg: "--color-ink",
    slotBorder: "--color-paper",
    wordmark: "--color-lime",
  },
  {
    id: "limau",
    label: "Limau",
    bg: "--color-lime",
    slotBorder: "--color-ink",
    wordmark: "--color-ink",
  },
  {
    id: "gulali",
    label: "Gulali",
    bg: "--color-pink",
    slotBorder: "--color-ink",
    wordmark: "--color-ink",
  },
  {
    id: "ungu",
    label: "Ungu",
    bg: "--color-violet",
    slotBorder: "--color-paper",
    wordmark: "--color-paper",
  },
  {
    id: "permen",
    label: "Permen",
    bg: "--color-violet-soft",
    slotBorder: "--color-ink",
    wordmark: "--color-ink",
  },
]

/** Id yang tidak dikenal jatuh ke preset pertama, jadi kanvas tidak pernah
 *  kehabisan warna. */
export function getFrame(id: string): FramePreset {
  return FRAMES.find((frame) => frame.id === id) ?? FRAMES[0]
}

/* Efek foto memakai filter bawaan Konva supaya hasilnya seragam antar browser
   (ARCHITECTURE §3). `cssPreview` hanya untuk swatch di panel pilihan. */
export type EffectParams =
  | { kind: "none" }
  | { kind: "grayscale" }
  | { kind: "sepia" }
  | { kind: "pop" }
  | { kind: "pixelate"; size: number }
  | { kind: "invert" }
  | { kind: "soften" }

export interface EffectPreset {
  id: string
  label: string
  /** Filter CSS untuk pratinjau swatch. Kosong bila tidak ada padanannya. */
  cssPreview: string
  params: EffectParams
}

export const EFFECTS: EffectPreset[] = [
  { id: "asli", label: "Asli", cssPreview: "", params: { kind: "none" } },
  {
    id: "hitam-putih",
    label: "Hitam Putih",
    cssPreview: "grayscale(1)",
    params: { kind: "grayscale" },
  },
  {
    id: "retro",
    label: "Retro",
    cssPreview: "sepia(0.85)",
    params: { kind: "sepia" },
  },
  {
    id: "pop",
    label: "Pop",
    cssPreview: "saturate(1.6) contrast(1.15)",
    params: { kind: "pop" },
  },
  {
    id: "piksel",
    label: "Piksel",
    cssPreview: "",
    params: { kind: "pixelate", size: 12 },
  },
  {
    id: "negatif",
    label: "Negatif",
    cssPreview: "invert(1)",
    params: { kind: "invert" },
  },
  {
    id: "lembut",
    label: "Lembut",
    cssPreview: "blur(1px) brightness(1.08)",
    params: { kind: "soften" },
  },
]

export function getEffect(id: string): EffectPreset {
  return EFFECTS.find((effect) => effect.id === id) ?? EFFECTS[0]
}

export interface StickerAsset {
  id: string
  /** Berkas di `public/stickers/`. */
  file: string
  label: string
}

/* DESIGN-SYSTEM §8: stiker berkas SVG, warna datar dari palet §2, garis tepi
   ink, tanpa gradasi. Dua belas motif Y2K. */
export const STICKERS: StickerAsset[] = [
  { id: "star", file: "star.svg", label: "Bintang" },
  { id: "heart", file: "heart.svg", label: "Hati" },
  { id: "flower", file: "flower.svg", label: "Bunga" },
  { id: "bolt", file: "bolt.svg", label: "Kilat" },
  { id: "smiley", file: "smiley.svg", label: "Senyum" },
  { id: "cloud", file: "cloud.svg", label: "Awan" },
  { id: "rainbow", file: "rainbow.svg", label: "Pelangi" },
  { id: "cassette", file: "cassette.svg", label: "Kaset" },
  { id: "crown", file: "crown.svg", label: "Mahkota" },
  { id: "bubble", file: "bubble.svg", label: "Gelembung" },
  { id: "glasses", file: "glasses.svg", label: "Kacamata" },
  { id: "candy", file: "candy.svg", label: "Permen" },
]
