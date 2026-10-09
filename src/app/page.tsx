import Link from "next/link"
import {
  ArrowRight,
  FilmStrip,
  HandPalm,
  HandPeace,
  Lock,
  QrCode,
  ThumbsUp,
  Users,
} from "@phosphor-icons/react/ssr"

import { SiteHeader } from "@/components/site/SiteHeader"
import { GalleryPicker } from "@/components/site/GalleryPicker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §10.1: Welcome. Komponen server, tanpa kode kamera, gesture,
   atau kanvas (FR-01). Foto contoh digambar sebagai blok warna berlabel. */
const CONTOH_TERANG = ["bg-pink", "bg-lime", "bg-tangerine", "bg-paper"]
const CONTOH_GARIS = ["bg-lime", "bg-violet-soft", "bg-pink", "bg-tangerine"]

const LANGKAH = ["Pilih layout", "Pose di kamera", "Hias strip"]

function FotoContoh({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-[44/31] items-center justify-center rounded-sm font-mono text-[10px] font-bold text-ink",
        className
      )}
    >
      Foto contoh
    </div>
  )
}

export default function Home() {
  return (
    <div className="stage-grid flex min-h-dvh flex-1 flex-col">
      <div className="page-container flex flex-1 flex-col gap-6 py-6">
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6">
          <section className="flex flex-wrap overflow-hidden rounded-panel border-3 border-ink bg-paper shadow-hard-lg">
            <div className="checker-ribbon w-full" />
            <div className="flex flex-[1_1_440px] flex-col justify-center gap-5 p-[clamp(24px,4vw,56px)]">
              <Badge variant="lime" className="self-start">
                Photobooth di browser
              </Badge>
              <h1 className="display-xl">Foto strip tanpa antre.</h1>
              <p className="max-w-[44ch] text-lg leading-[1.5]">
                Buka kamera, pose, hias strip, lalu unduh atau cetak. Tanpa
                akun, dan fotomu tetap di perangkatmu.
              </p>
              <div className="flex flex-wrap gap-3.5 pt-1">
                <Button size="lg" asChild>
                  <Link href="/booth/layout">
                    Mulai Foto
                    <ArrowRight
                      weight="bold"
                      className="size-[22px]"
                      aria-hidden
                    />
                  </Link>
                </Button>
                <GalleryPicker />
              </div>
            </div>

            <div className="flex flex-[1_1_380px] p-6">
              <div className="relative flex min-h-[440px] flex-1 items-center justify-center gap-[clamp(12px,3vw,28px)] rounded-stage border-3 border-ink bg-violet-soft px-[clamp(14px,3vw,24px)] py-9">
                <Badge
                  variant="lime"
                  className="absolute top-[18px] right-[18px] rotate-6"
                >
                  Tanpa akun
                </Badge>

                <div className="flex w-full max-w-[148px] flex-[0_1_148px] -rotate-5 flex-col gap-2 rounded-thumb border-3 border-ink bg-ink p-2.5 pb-3 shadow-hard-violet">
                  {CONTOH_TERANG.map((warna) => (
                    <FotoContoh key={warna} className={warna} />
                  ))}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-display text-xs font-black text-paper">
                      snapme
                    </span>
                    <span className="flex size-[26px] items-center justify-center rounded-sm bg-paper text-ink">
                      <QrCode weight="bold" className="size-[18px]" aria-hidden />
                    </span>
                  </div>
                </div>

                <div className="flex w-full max-w-[148px] flex-[0_1_148px] translate-y-[18px] rotate-4 flex-col gap-2 rounded-thumb border-3 border-ink bg-paper p-2.5 pb-3 shadow-hard-lg">
                  {CONTOH_GARIS.map((warna) => (
                    <FotoContoh
                      key={warna}
                      className={cn("border-2 border-ink", warna)}
                    />
                  ))}
                  <span className="pt-0.5 font-display text-xs font-black text-ink">
                    snapme
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 pt-2">
            <h2 className="heading text-ink">Tiga cara baru buat foto bareng</h2>
            <div className="flex flex-wrap gap-5">
              <article className="flex flex-[2_1_460px] flex-wrap items-center gap-7 rounded-panel border-3 border-ink bg-ink p-7 text-paper shadow-hard-violet">
                <div className="flex flex-[1_1_240px] flex-col gap-3">
                  <Badge variant="lime" className="self-start">
                    Interaktif
                  </Badge>
                  <h3 className="title text-lime">Gesture Snap</h3>
                  <p className="max-w-[40ch] text-base leading-[1.5]">
                    Angkat dua jari dan tahan sebentar. Hitung mundur jalan
                    sendiri, jadi tidak ada yang perlu lari ke tombol.
                  </p>
                </div>
                <div className="flex flex-[1_1_220px] flex-col gap-2.5 font-bold">
                  <span className="flex items-center gap-3 rounded-card bg-lime px-3.5 py-2.5 text-ink">
                    <HandPeace weight="bold" className="size-7" aria-hidden />
                    Dua jari: foto
                  </span>
                  <span className="flex items-center gap-3 rounded-card border-2 border-paper px-3.5 py-2.5">
                    <HandPalm weight="bold" className="size-7" aria-hidden />
                    Telapak: ulang
                  </span>
                  <span className="flex items-center gap-3 rounded-card border-2 border-paper px-3.5 py-2.5">
                    <ThumbsUp weight="bold" className="size-7" aria-hidden />
                    Jempol: lanjut
                  </span>
                </div>
              </article>

              <article className="flex flex-[1_1_260px] flex-col gap-3 rounded-panel border-3 border-ink bg-violet-soft p-6 shadow-hard-lg">
                <Users weight="bold" className="size-9 text-ink" aria-hidden />
                <h3 className="title text-ink">Strip Estafet</h3>
                <p className="text-base leading-[1.5]">
                  Isi setengah strip, kirim link, lalu temanmu melengkapi dari
                  HP-nya kapan saja dalam 48 jam.
                </p>
                <div className="flex gap-1.5 pt-1" aria-hidden>
                  <div className="h-9 flex-1 rounded-sm border-2 border-ink bg-pink" />
                  <div className="h-9 flex-1 rounded-sm border-2 border-ink bg-pink" />
                  <div className="h-9 flex-1 rounded-sm border-2 border-dashed border-ink" />
                  <div className="h-9 flex-1 rounded-sm border-2 border-dashed border-ink" />
                </div>
              </article>

              <article className="flex flex-[1_1_260px] flex-col gap-3 rounded-panel border-3 border-ink bg-paper p-6 shadow-hard-lg">
                <FilmStrip
                  weight="bold"
                  className="size-9 text-ink"
                  aria-hidden
                />
                <h3 className="title text-ink">Strip Hidup</h3>
                <p className="text-base leading-[1.5]">
                  Tiap pose ikut terekam sebentar. Pindai QR di strip cetak
                  untuk melihat versi bergeraknya.
                </p>
              </article>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-panel border-3 border-ink bg-paper p-6">
            <h2 className="title text-ink">Dari kamera sampai cetak</h2>
            <div className="flex flex-wrap items-center gap-3">
              {LANGKAH.map((langkah) => (
                <span key={langkah} className="flex items-center gap-3">
                  <span className="inline-flex min-h-11 items-center rounded-pill border-2 border-ink bg-cream px-4 font-bold">
                    {langkah}
                  </span>
                  <ArrowRight weight="bold" className="size-5" aria-hidden />
                </span>
              ))}
              <span className="inline-flex min-h-11 items-center rounded-pill border-2 border-ink bg-lime px-4 font-bold">
                Unduh atau cetak
              </span>
            </div>
          </section>
        </main>

        <footer className="flex flex-wrap items-center gap-3 px-1 pt-1">
          <Lock weight="bold" className="size-[22px]" aria-hidden />
          <p className="flex-[1_1_320px] text-[15px] leading-[1.5]">
            Foto diproses di perangkatmu. Baru diunggah kalau kamu sendiri
            membuat link, lalu terhapus otomatis setelah 7 hari.
          </p>
        </footer>
      </div>
    </div>
  )
}
