"use client"

import dynamic from "next/dynamic"

/* Toaster dimuat setelah hidrasi supaya sonner tidak ikut bundel awal
   Welcome (PRD §8, LCP; rencana langkah 1 di docs/DECISIONS.md M9).
   Tetap di root layout supaya toast yang dipicu tepat sebelum navigasi
   (GalleryPicker → /booth/capture) masih tampil di halaman tujuan. */
export const DeferredToaster = dynamic(
  () => import("@/components/ui/sonner").then((m) => m.Toaster),
  { ssr: false }
)
