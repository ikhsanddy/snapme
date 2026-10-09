"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { create } from "zustand"

import type { LayoutId } from "@/lib/layouts"

/* ARCHITECTURE §5: state sesi booth. M1 hanya memuat yang sudah dipakai:
   layout terpilih dan pengaturan perangkat. `shots`, `editor`, `live`,
   `share`, dan `relay` ditambahkan milestone pemiliknya. */

export interface BoothSettings {
  gestureEnabled: boolean
  cameraDeviceId: string | null
}

interface BoothState {
  layoutId: LayoutId | null
  settings: BoothSettings
  setLayout: (id: LayoutId) => void
  reset: () => void
}

function freshState() {
  return {
    layoutId: null,
    settings: { gestureEnabled: true, cameraDeviceId: null },
  }
}

export const useBoothStore = create<BoothState>((set) => ({
  ...freshState(),
  setLayout: (id) => set({ layoutId: id }),
  reset: () => set(freshState()),
}))

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
