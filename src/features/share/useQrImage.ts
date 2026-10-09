"use client"

import { useEffect, useState } from "react"

import type { ShareState } from "@/stores/booth"
import { makeQrDataUrl } from "./makeQr"

/* SH-04: data URL QR untuk kaki strip. QR baru ada gunanya setelah link dibuat
   (`share.strip`), dan hasilnya disimpan bersama id yang menghasilkannya
   supaya nilai lama tidak pernah dipakai untuk id baru. Pola ini sama dengan
   useHtmlImage: hasil hanya dikembalikan bila sumbernya masih cocok. */

interface QrTarget {
  id: string
  url: string
}

export function useQrImageUrl(share: ShareState): string | null {
  const id = share.strip?.id ?? null
  const [target, setTarget] = useState<QrTarget | null>(null)

  useEffect(() => {
    if (id === null) {
      return
    }
    let active = true
    makeQrDataUrl(`${window.location.origin}/s/${id}`)
      .then((url) => {
        if (active) {
          setTarget({ id, url })
        }
      })
      .catch(() => {
        /* Tanpa QR, kotak di kaki strip tetap menampilkan glif penanda. */
      })
    return () => {
      active = false
    }
  }, [id])

  if (id === null || target === null || target.id !== id) {
    return null
  }
  return target.url
}

export function useQrPlate(share: ShareState): { imageUrl: string | null } | undefined {
  const imageUrl = useQrImageUrl(share)
  return share.qrEnabled ? { imageUrl } : undefined
}
