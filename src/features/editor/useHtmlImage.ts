import { useEffect, useState } from "react"

/* Pengganti paket `use-image` (DECISIONS M4): satu berkas, tanpa dependensi.
   Hasil hanya dikembalikan saat `src`-nya masih cocok, supaya foto yang diulang
   tidak menampilkan gambar lama selama dataURL baru dimuat. */

interface LoadedImage {
  src: string
  image: HTMLImageElement
}

export function useHtmlImage(
  src: string | undefined
): HTMLImageElement | undefined {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null)

  useEffect(() => {
    if (src === undefined) {
      return
    }

    let active = true
    const image = new window.Image()
    image.onload = () => {
      if (active) {
        setLoaded({ src, image })
      }
    }
    image.src = src

    return () => {
      active = false
      image.onload = null
    }
  }, [src])

  return loaded !== null && loaded.src === src ? loaded.image : undefined
}
