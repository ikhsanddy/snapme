"use client"

import type { LayoutId } from "@/lib/layouts"
import { hostSlotIndices, relaySlotsFor } from "@/lib/relaySlots"
import { useBoothStore, type Shot } from "@/stores/booth"

/* M8 (SE-04, SE-07, SE-10): menyiapkan sesi di perangkat teman dari foto yang
   sudah diunggah. Halaman /r/[id] merender URL baca bertanda tangan berumur
   pendek, lalu di sini berkasnya diambil, diubah menjadi dataURL seperti hasil
   kamera, dan ditaruh di slot pemiliknya. Sisanya berjalan seperti sesi biasa:
   langkah Ambil Foto mengisi slot ganjil yang masih kosong. */

export interface SlotPhoto {
  index: number
  url: string
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const reader = new FileReader()
  const { promise, resolve, reject } = Promise.withResolvers<string>()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(new Error("Foto tidak bisa dibaca."))
  reader.readAsDataURL(blob)
  return promise
}

/** Mengambil tiap foto slot dari URL bertanda tangan. Slot yang gagal diambil
 *  dilewati: sesinya tetap bisa dibuka, dan slot itu akan tampak kosong. */
export async function fetchSlotShots(
  slotPhotos: SlotPhoto[]
): Promise<{ index: number; shot: Shot }[]> {
  const loaded = await Promise.all(
    slotPhotos.map(async (slotPhoto) => {
      try {
        const response = await fetch(slotPhoto.url)
        if (!response.ok) {
          return null
        }
        const still = await blobToDataUrl(await response.blob())
        return { index: slotPhoto.index, shot: { still, capturedAt: Date.now() } }
      } catch {
        return null
      }
    })
  )
  return loaded.filter((entry): entry is { index: number; shot: Shot } => entry !== null)
}

/** SE-04: sesi teman. Layout dan foto pembuat dimuat ulang dari server supaya
 *  sesi yang hilang (perangkat atau browser lain) bisa dilanjutkan; foto yang
 *  sempat diambil teman secara lokal ikut dibuang karena gilirannya tidak bisa
 *  diambil ulang (SE-06). */
export async function bootstrapGuestSession(
  relay: { id: string; layout: LayoutId },
  slotPhotos: SlotPhoto[]
): Promise<void> {
  const slots = await fetchSlotShots(slotPhotos)
  const store = useBoothStore.getState()
  store.setLayout(relay.layout)
  for (const { index, shot } of slots) {
    useBoothStore.getState().setShot(index, shot)
  }
  useBoothStore.getState().setRelay({
    id: relay.id,
    role: "guest",
    lockedSlots: hostSlotIndices(relay.layout),
    ghostEnabled: true,
  })
}

/** Sudah adakah sesi teman yang cocok di perangkat ini (foto pembuat lengkap,
 *  layout sama, estafet yang sama)? Bila ada, bootstrap tidak perlu diulang. */
export function guestSessionMatches(id: string, layout: LayoutId): boolean {
  const state = useBoothStore.getState()
  if (
    state.layoutId !== layout ||
    state.relay?.id !== id ||
    state.relay.role !== "guest"
  ) {
    return false
  }
  return relaySlotsFor(layout)
    .filter((slot) => slot.owner === "host")
    .every((slot) => state.shots[slot.index] !== null)
}

/** SE-10 (P1): salinan lokal pembuat dari estafet yang sudah selesai. Semua
 *  slot dimuat, estafetnya dilepas, dan sesinya ditandai `localOnly` supaya
 *  tidak menawarkan unggahan yang akan menimpa versi temannya. */
export async function bootstrapLocalCopy(
  layout: LayoutId,
  slotPhotos: SlotPhoto[]
): Promise<void> {
  const slots = await fetchSlotShots(slotPhotos)
  const store = useBoothStore.getState()
  store.setLayout(layout)
  for (const { index, shot } of slots) {
    useBoothStore.getState().setShot(index, shot)
  }
  store.setRelay(null)
  store.setLocalOnly(true)
}
