"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import { create } from "zustand"

import { DEFAULT_EFFECT_ID, DEFAULT_FRAME_ID } from "@/features/editor/defaults"
import { LAYOUTS, type LayoutId } from "@/lib/layouts"

/* ARCHITECTURE §5: state sesi booth. Layout terpilih, foto per slot, pengaturan
   perangkat, dan slice editor (M4). `live`, `share`, dan `relay` ditambahkan
   milestone pemiliknya.
   Invarian bundel: berkas ini tidak boleh mengimpor Konva supaya `/` dan
   `/booth/capture` tidak ikut memuat pustaka kanvas. */

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

/** Stiker yang sudah ditempel. Koordinat ruang strip 600 x 1800; `x` dan `y`
 *  adalah sudut kiri atas, sama seperti node Konva. */
export interface StickerInstance {
  id: string
  assetId: string
  x: number
  y: number
  rotation: number
  width: number
}

/** Teks pendek FR-10. `x` adalah titik tengah kotak teks, `y` tepi atasnya,
 *  supaya teks panjang tetap terpusat di kaki strip. */
export interface StripText {
  id: string
  value: string
  x: number
  y: number
  rotation: number
  fontSize: number
}

export const STICKER_WIDTH_MIN = 48
export const STICKER_WIDTH_MAX = 480
export const TEXT_LENGTH_MAX = 24
export const TEXT_FONT_MIN = 24
export const TEXT_FONT_MAX = 96

/** Perubahan yang boleh ditulis balik dari kanvas atau daftar "Isi strip". */
export type StickerPatch = Partial<
  Pick<StickerInstance, "x" | "y" | "rotation" | "width">
>
export type TextPatch = Partial<
  Pick<StripText, "x" | "y" | "rotation" | "fontSize">
>

/* Kaki strip 4 dan 3 sama: y 1596 sampai 1800 (lib/layouts.ts). Baris wordmark
   dan tanggal memakai 100 px teratas (StripStage), jadi teks pengguna mulai
   tepat di bawahnya supaya keduanya tidak saling menimpa. */
export const TEXT_DEFAULT_Y = 1696

interface EditorState {
  frameId: string
  effectId: string
  stickers: StickerInstance[]
  texts: StripText[]
  showDate: boolean
}

interface BoothState extends EditorState {
  layoutId: LayoutId | null
  shots: Shots
  settings: BoothSettings
  setLayout: (id: LayoutId) => void
  setShot: (index: number, shot: Shot) => void
  setCameraDevice: (deviceId: string) => void
  setGestureEnabled: (enabled: boolean) => void
  setFrame: (id: string) => void
  setEffect: (id: string) => void
  addSticker: (assetId: string) => void
  updateSticker: (id: string, patch: StickerPatch) => void
  removeSticker: (id: string) => void
  setStripText: (value: string) => void
  updateText: (id: string, patch: TextPatch) => void
  removeText: (id: string) => void
  setShowDate: (shown: boolean) => void
  reset: () => void
}

/* GS-06: pilihan Gesture Snap diingat di perangkat, bukan di server. Kunci ini
   satu-satunya jejak yang ditulis ke localStorage. */
export const GESTURE_PREF_KEY = "snapme:gesture-enabled"

/** Dipanggil sekali saat halaman capture dipasang, setelah hidrasi SSR. */
export function hydrateGesturePreference(): void {
  if (typeof window === "undefined") {
    return
  }
  const stored = window.localStorage.getItem(GESTURE_PREF_KEY)
  if (stored === null) {
    return
  }
  useBoothStore.setState((state) => ({
    settings: { ...state.settings, gestureEnabled: stored === "1" },
  }))
}

/* Invarian: `shots.length` selalu sama dengan `shotCount` layout terpilih. */
function freshShots(id: LayoutId): Shots {
  return Array<Shot | null>(LAYOUTS[id].shotCount).fill(null)
}

/* Stiker baru ditempel miring 6 derajat di tengah strip (DESIGN-SYSTEM §1:
   stiker ditempel miring sebagai aksen). */
function freshState() {
  return {
    layoutId: null,
    shots: [] as Shots,
    settings: { gestureEnabled: true, cameraDeviceId: null },
    frameId: DEFAULT_FRAME_ID,
    effectId: DEFAULT_EFFECT_ID,
    stickers: [] as StickerInstance[],
    texts: [] as StripText[],
    showDate: false,
  }
}

export const useBoothStore = create<BoothState>((set) => ({
  ...freshState(),
  /* Ganti layout mengosongkan foto, jadi hiasan lama tidak boleh nyangkut:
     jumlah slot berbeda dan posisinya tidak lagi cocok. */
  setLayout: (id) =>
    set({ ...freshState(), layoutId: id, shots: freshShots(id) }),
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
  setGestureEnabled: (enabled) =>
    set((state) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(GESTURE_PREF_KEY, enabled ? "1" : "0")
      }
      return { settings: { ...state.settings, gestureEnabled: enabled } }
    }),
  setFrame: (id) => set({ frameId: id }),
  setEffect: (id) => set({ effectId: id }),
  addSticker: (assetId) =>
    set((state) => ({
      stickers: [
        ...state.stickers,
        {
          id: nanoid(8),
          assetId,
          x: 300,
          y: 900,
          rotation: -6,
          width: 120,
        },
      ],
    })),
  updateSticker: (id, patch) =>
    set((state) => ({
      stickers: state.stickers.map((sticker) =>
        sticker.id === id
          ? {
              ...sticker,
              ...patch,
              ...(patch.width === undefined
                ? {}
                : {
                    width: Math.min(
                      STICKER_WIDTH_MAX,
                      Math.max(STICKER_WIDTH_MIN, patch.width)
                    ),
                  }),
            }
          : sticker
      ),
    })),
  removeSticker: (id) =>
    set((state) => ({
      stickers: state.stickers.filter((sticker) => sticker.id !== id),
    })),
  /* FR-10: maksimal 24 karakter. `Array.from` menghitung titik kode, bukan
     satuan UTF-16, supaya emoji tidak terpotong di tengah pasangan surrogate. */
  setStripText: (value) =>
    set((state) => {
      const trimmed = Array.from(value).slice(0, TEXT_LENGTH_MAX).join("")
      if (trimmed.length === 0) {
        return { texts: [] }
      }
      const [first] = state.texts
      if (first === undefined) {
        return {
          texts: [
            {
              id: nanoid(8),
              value: trimmed,
              x: 300,
              y: TEXT_DEFAULT_Y,
              rotation: 0,
              fontSize: 44,
            },
          ],
        }
      }
      return { texts: [{ ...first, value: trimmed }] }
    }),
  updateText: (id, patch) =>
    set((state) => ({
      texts: state.texts.map((text) =>
        text.id === id
          ? {
              ...text,
              ...patch,
              ...(patch.fontSize === undefined
                ? {}
                : {
                    fontSize: Math.min(
                      TEXT_FONT_MAX,
                      Math.max(TEXT_FONT_MIN, patch.fontSize)
                    ),
                  }),
            }
          : text
      ),
    })),
  removeText: (id) =>
    set((state) => ({ texts: state.texts.filter((text) => text.id !== id) })),
  setShowDate: (shown) => set({ showDate: shown }),
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
