"use client"

import { useEffect } from "react"

import { useBoothStore } from "@/stores/booth"
import {
  clearSession,
  loadSession,
  saveSession,
  serializeSession,
  validateRecord,
} from "./sessionDb"

/* FR-14: memulihkan sesi dari IndexedDB saat kerangka booth dipasang, lalu
   menyimpannya kembali dengan jeda supaya setiap perubahan kecil tidak menulis
   ke disk. Dipasang di `src/app/booth/layout.tsx`, jadi berlaku untuk semua
   langkah booth. */

const SAVE_DELAY_MS = 400

export function SessionSync() {
  useEffect(() => {
    let cancelled = false
    let timer: number | null = null
    let unsubscribe = () => {}

    async function hydrate() {
      const stored = await loadSession()
      if (cancelled) {
        return
      }
      const record = validateRecord(stored)

      /* Rekaman hanya dipakai bila store masih segar: alur galeri dari Welcome
         mengisi store sebelum IndexedDB selesai dibaca, dan itu tidak boleh
         tertimpa. */
      if (record !== null && useBoothStore.getState().layoutId === null) {
        useBoothStore.setState({
          layoutId: record.layoutId,
          shots: record.shots,
          frameId: record.frameId,
          effectId: record.effectId,
          stickers: record.stickers,
          texts: record.texts,
          showDate: record.showDate,
          share: record.share,
          relay: record.relay ?? null,
          localOnly: record.localOnly === true,
        })
      } else if (stored !== null && record === null) {
        /* Rekaman rusak atau dari versi lain: dibuang. */
        void clearSession()
      }
      useBoothStore.setState({ sessionReady: true })

      unsubscribe = useBoothStore.subscribe(() => {
        if (timer !== null) {
          window.clearTimeout(timer)
        }
        timer = window.setTimeout(() => {
          void saveSession(serializeSession(useBoothStore.getState()))
        }, SAVE_DELAY_MS)
      })
    }

    void hydrate()
    return () => {
      cancelled = true
      unsubscribe()
      if (timer !== null) {
        window.clearTimeout(timer)
      }
    }
  }, [])

  return null
}
