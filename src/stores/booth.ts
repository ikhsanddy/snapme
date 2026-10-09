"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { create } from "zustand"

import { LAYOUTS, type LayoutId } from "@/lib/layouts"

/* ARCHITECTURE §5: state sesi booth. Baru yang sudah dipakai yang dimuat:
   layout terpilih, foto per slot, dan pengaturan perangkat. `editor`, `live`,
   `share`, dan `relay` ditambahkan milestone pemiliknya. */

export interface BoothSettings {
  gestureEnabled: boolean
  cameraDeviceId: string | null
}

/** Satu foto tersimpan di memori sebagai dataURL JPEG (IndexedDB menyusul di M5). */
export interface Shot {
  still: string
  capturedAt: number
}

type Shots = (Shot | null)[]

interface BoothState {
  layoutId: LayoutId | null
  shots: Shots
  settings: BoothSettings
  setLayout: (id: LayoutId) => void
  setShot: (index: number, shot: Shot) => void
  setCameraDevice: (deviceId: string) => void
  reset: () => void
}

/* Invarian: `shots.length` selalu sama dengan `shotCount` layout terpilih. */
function freshShots(id: LayoutId): Shots {
  return Array<Shot | null>(LAYOUTS[id].shotCount).fill(null)
}

function freshState() {
  return {
    layoutId: null,
    shots: [] as Shots,
    settings: { gestureEnabled: true, cameraDeviceId: null },
  }
}

export const useBoothStore = create<BoothState>((set) => ({
  ...freshState(),
  setLayout: (id) => set({ layoutId: id, shots: freshShots(id) }),
  setShot: (index, shot) =>
    set((state) => {
      const shots = state.shots.slice()
      shots[index] = shot
      return { shots }
    }),
  setCameraDevice: (deviceId) =>
    set((state) => ({
      settings: { ...state.settings, cameraDeviceId: deviceId },
    })),
  reset: () => set(freshState()),
}))

export function countFilled(shots: Shots): number {
  return shots.reduce((total, shot) => (shot === null ? total : total + 1), 0)
}

export function allFilled(shots: Shots): boolean {
  return shots.length > 0 && shots.every((shot) => shot !== null)
}

/** ARCHITECTURE §5: langkah booth tanpa prasyarat dialihkan ke langkah yang belum selesai. */
export function useRequireLayout(): boolean {
  const router = useRouter()
  const layoutId = useBoothStore((state) => state.layoutId)

  useEffect(() => {
    if (layoutId === null) {
      router.replace("/booth/layout")
    }
  }, [layoutId, router])

  return layoutId !== null
}

/** Langkah setelah foto tanpa semua slot terisi dialihkan kembali ke Ambil Foto. */
export function useRequireShots(): boolean {
  const router = useRouter()
  const ready = useBoothStore((state) => allFilled(state.shots))

  useEffect(() => {
    if (!ready) {
      router.replace("/booth/capture")
    }
  }, [ready, router])

  return ready
}
