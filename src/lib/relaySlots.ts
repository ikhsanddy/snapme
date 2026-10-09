import { LAYOUTS, type LayoutId } from "@/lib/layouts"

/* M8 (SE-01, SE-04): siapa pemilik slot mana di strip estafet. Aturannya satu
   untuk semua layout: indeks genap (0-based) milik pembuat, ganjil milik teman.
   Pembuat selalu mengisi dua slot, jadi tombol "Estafet ke Teman" memenuhi
   syarat "minimal setengah slot terisi" di Strip 4, Strip 3, dan Grid 2 x 2.

   Fungsi murni: dipakai server (menyusun baris `relays`) dan klien (bootstrap
   sesi tamu, penguncian baki foto), tanpa menyentuh jaringan. */

export type RelayRole = "host" | "guest"

export interface RelaySlotOwner {
  index: number
  owner: RelayRole
}

export function relaySlotsFor(layoutId: LayoutId): RelaySlotOwner[] {
  return Array.from({ length: LAYOUTS[layoutId].shotCount }, (_, index) => ({
    index,
    owner: index % 2 === 0 ? "host" : "guest",
  }))
}

export function hostSlotIndices(layoutId: LayoutId): number[] {
  return relaySlotsFor(layoutId)
    .filter((slot) => slot.owner === "host")
    .map((slot) => slot.index)
}

/** SE-05: slot pembuat yang ditampilkan sebagai bayangan di pratinjau kamera
 *  teman saat slot `targetIndex` gilirannya. Selalu slot sebelumnya (satu
 *  kolom di atas pada strip, sebelah kiri pada grid); slot pertama null. */
export function ghostSlotFor(targetIndex: number): number | null {
  return targetIndex > 0 ? targetIndex - 1 : null
}
