"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  Check,
  DownloadSimple,
  Pause,
  Play,
  Sticker as StickerIcon,
} from "@phosphor-icons/react"
import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Stage as KonvaStage } from "konva/lib/Stage"
import { useReducedMotion } from "motion/react"

import { BoothPanel } from "@/features/booth/BoothPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { CLIP_FRAME_COUNT } from "@/features/capture/clipRecorder"
import { useClipTicker } from "@/features/live/useClipTicker"
import { track } from "@/lib/analytics"
import { getLayout, type LayoutId } from "@/lib/layouts"
import { cn } from "@/lib/utils"
import { countFilled, hasLiveClips, useBoothStore } from "@/stores/booth"
import { DecorList } from "./DecorList"
import { DecorPanel } from "./DecorPanel"
import StripCanvas from "./StripCanvas"
import { getEffect, getFrame } from "./presets"

/* DESIGN-SYSTEM §10.3: halaman Hias Strip. Rel kiri pilihan hias (lembar bawah
   di layar sempit), tengah kanvas strip, rel kanan kartu Strip Hidup lalu QR di
   strip, ringkasan, dan aksi utama.
   Berkas ini dan seluruh isi `features/editor` hanya dimuat lewat import()
   dinamis dari halaman, supaya Konva tidak ikut bundel `/` dan `/booth/capture`. */

export default function CustomizeEditor({ layoutId }: { layoutId: LayoutId }) {
  const shots = useBoothStore((state) => state.shots)
  const frameId = useBoothStore((state) => state.frameId)
  const effectId = useBoothStore((state) => state.effectId)
  const stickers = useBoothStore((state) => state.stickers)
  const qrEnabled = useBoothStore((state) => state.share.qrEnabled)
  const shareStrip = useBoothStore((state) => state.share.strip)
  const setQrEnabled = useBoothStore((state) => state.setQrEnabled)
  const liveEnabled = useBoothStore((state) => state.live.enabled)
  const setLiveEnabled = useBoothStore((state) => state.setLiveEnabled)
  /* M8: sesi teman tidak pernah mengunggah QR, dan salinan lokal pembuat
     (SE-10) tidak boleh menimpa versi temannya. Di dua keadaan itu kartu QR
     disembunyikan, dan versi hidup hanya jadi unduhan lokal. */
  const relay = useBoothStore((state) => state.relay)
  const localOnly = useBoothStore((state) => state.localOnly)
  const hidesUpload = relay?.role === "guest" || localOnly

  const stageRef = useRef<KonvaStage>(null)
  const groupRef = useRef<KonvaGroup>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  /* PRD §4: "Strip Hidup menambah nilai" dihitung dari sesi yang benar-benar
     menyalakannya, jadi menyalakan-mematikan-menyalakan lagi tetap satu
     peristiwa per kunjungan halaman Hias. */
  const liveTracked = useRef(false)

  const handleLiveToggle = (enabled: boolean) => {
    setLiveEnabled(enabled)
    if (enabled && !liveTracked.current) {
      liveTracked.current = true
      track("live_enabled")
    }
  }

  /* SH-02: pratinjau berputar selama sakelarnya nyala, kecuali pengguna
     meminta gerak dikurangi. Di situ klip ditampilkan diam dengan tombol
     Putar, dan `userPlay` menjadi izin eksplisitnya. */
  const hasClips = hasLiveClips(shots)
  const prefersReducedMotion = useReducedMotion()
  const [userPlay, setUserPlay] = useState(false)
  const playing =
    liveEnabled && hasClips && (userPlay || prefersReducedMotion === false)
  const clipIndex = useClipTicker(playing, CLIP_FRAME_COUNT)

  const layout = getLayout(layoutId)

  return (
    <>
      <BoothPanel
        title="Hias Strip"
        backHref="/booth/capture"
        actions={
          <Badge variant="lime">
            <Check weight="bold" aria-hidden />
            {`${countFilled(shots)} foto siap`}
          </Badge>
        }
        left={
          <>
            <Button
              variant="neutral"
              className="w-full md:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              <StickerIcon weight="bold" className="size-[18px]" aria-hidden />
              Hiasan
            </Button>
            <div className="hidden md:block">
              <DecorPanel />
            </div>
          </>
        }
        center={
          <>
            <div className="flex justify-center rounded-stage border-3 border-ink bg-cream p-6 md:p-9">
              <StripCanvas
                layoutId={layoutId}
                stageRef={stageRef}
                groupRef={groupRef}
                live={
                  liveEnabled && hasClips
                    ? {
                        frames: shots.map((shot) => shot?.clip ?? null),
                        index: playing ? clipIndex : -1,
                        chrome: true,
                      }
                    : undefined
                }
              />
            </div>
            <p className="text-center font-mono text-xs text-muted">
              {`Ekspor ${layout.canvas.width} x ${layout.canvas.height} px (${layout.canvas.width / 300} x ${layout.canvas.height / 300} inci, 300 dpi)`}
            </p>
            <DecorList />
          </>
        }
        right={
          <>
            {/* SH-02: kartu Strip Hidup, urutan pertama rel kanan mengikuti
                docs/ui-reference/customize.html. Sakelar selalu disertai teks
                keadaan (DESIGN-SYSTEM §9). */}
            <div className="flex flex-col gap-2 rounded-card border-2 border-ink bg-paper p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-extrabold">
                  Strip Hidup
                </h2>
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "rounded-pill border-2 border-ink px-2.5 py-0.5 font-mono text-xs font-bold tracking-[0.06em] text-ink uppercase",
                      liveEnabled ? "bg-lime" : "bg-cream"
                    )}
                  >
                    {liveEnabled ? "Nyala" : "Mati"}
                  </span>
                  <Switch
                    checked={liveEnabled}
                    disabled={!hasClips || shareStrip !== null}
                    onCheckedChange={handleLiveToggle}
                    aria-label="Strip Hidup"
                  />
                </div>
              </div>
              <p className="text-[15px] leading-[1.4]">
                {!hasClips
                  ? "Klip hanya terekam saat memotret lewat kamera."
                  : hidesUpload
                    ? "Tiap foto diputar sebagai klip pendek di perangkat ini. Versi hidupnya tidak ikut diunggah."
                    : "Tiap foto diputar sebagai klip pendek di halaman strip."}
              </p>
              {liveEnabled && hasClips && shareStrip === null && !hidesUpload ? (
                <p
                  role="status"
                  className="rounded-thumb border-2 border-ink bg-lime px-2.5 py-2 text-sm leading-[1.4]"
                >
                  Versi hidup ikut diunggah saat kamu membuat link.
                </p>
              ) : null}
              {liveEnabled && hasClips && prefersReducedMotion === true ? (
                <Button
                  variant="neutral"
                  size="sm"
                  aria-pressed={userPlay}
                  onClick={() => setUserPlay((current) => !current)}
                >
                  {userPlay ? (
                    <Pause weight="bold" className="size-[18px]" aria-hidden />
                  ) : (
                    <Play weight="bold" className="size-[18px]" aria-hidden />
                  )}
                  {userPlay ? "Jeda" : "Putar"}
                </Button>
              ) : null}
            </div>

            {/* SH-04: kartu QR di strip. Teksnya dari docs/ui-reference/
                customize.html; tidak ada aksi `tangerine` baru di sini supaya
                satu aksi utama per layar tetap "Selesai & Unduh".
                M8: teman tidak mengunggah QR, dan salinan lokal pembuat juga
                tidak, jadi kartunya disembunyikan di dua keadaan itu. */}
            {hidesUpload ? null : (
              <div className="flex flex-col gap-2 rounded-card border-2 border-ink bg-paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-base font-extrabold">
                    QR di strip
                  </h2>
                  <Switch
                    checked={qrEnabled || shareStrip !== null}
                    disabled={shareStrip !== null}
                    onCheckedChange={setQrEnabled}
                    aria-label="QR di strip"
                  />
                </div>
                <p className="text-[15px] leading-[1.4]">
                  QR membuka halaman strip. Fotomu diunggah ke link pribadi dan
                  terhapus otomatis setelah 7 hari.
                </p>
                {shareStrip !== null ? (
                  <p
                    role="status"
                    className="rounded-thumb border-2 border-ink bg-lime px-2.5 py-2 text-sm leading-[1.4]"
                  >
                    Link sudah dibuat di langkah Hasil.
                  </p>
                ) : qrEnabled ? (
                  <p
                    role="status"
                    className="rounded-thumb border-2 border-ink bg-lime px-2.5 py-2 text-sm leading-[1.4]"
                  >
                    Kamu akan dimintai izin unggah saat mengunduh.
                  </p>
                ) : null}
              </div>
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px]">
              <dt className="self-center font-mono text-xs font-bold tracking-[0.06em] text-muted uppercase">
                Frame
              </dt>
              <dd className="font-bold">{getFrame(frameId).label}</dd>
              <dt className="self-center font-mono text-xs font-bold tracking-[0.06em] text-muted uppercase">
                Efek
              </dt>
              <dd className="font-bold">{getEffect(effectId).label}</dd>
              <dt className="self-center font-mono text-xs font-bold tracking-[0.06em] text-muted uppercase">
                Stiker
              </dt>
              <dd className="font-bold">{stickers.length}</dd>
            </dl>

            <div className="mt-auto">
              <Button size="lg" className="w-full" asChild>
                <Link href="/booth/result">
                  <DownloadSimple
                    weight="bold"
                    className="size-[22px]"
                    aria-hidden
                  />
                  Selesai &amp; Unduh
                </Link>
              </Button>
            </div>
          </>
        }
      />

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Hiasan</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pb-6">
            <DecorPanel />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
