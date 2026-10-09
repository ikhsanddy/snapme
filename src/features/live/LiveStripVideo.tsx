"use client"

import { useReducedMotion } from "motion/react"

/* SH-05: versi hidup di halaman strip. Berkas ini sengaja tanpa Konva supaya
   halaman /s/[id] tetap ringan. Video berputar tanpa suara; saat pengguna
   meminta gerak dikurangi, pemutaran otomatis dimatikan dan kontrol browser
   yang menggantikannya (SH-02). Poster-nya strip diam, jadi halaman tetap
   menampilkan sesuatu bila videonya gagal dimuat. */
export function LiveStripVideo({ src, poster }: { src: string; poster: string }) {
  const prefersReducedMotion = useReducedMotion()
  const reduced = prefersReducedMotion === true

  return (
    <figure className="flex flex-col gap-2">
      <video
        src={src}
        poster={poster}
        aria-label="Versi hidup strip"
        muted
        loop
        playsInline
        autoPlay={!reduced}
        controls={reduced}
        preload="metadata"
        className="h-auto w-full max-w-[420px] border-2 border-ink bg-cream"
      />
      <figcaption className="text-sm text-muted">Strip Hidup</figcaption>
    </figure>
  )
}
