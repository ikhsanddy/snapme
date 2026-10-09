"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Check, DownloadSimple, Sticker as StickerIcon } from "@phosphor-icons/react"
import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Stage as KonvaStage } from "konva/lib/Stage"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { getLayout, type LayoutId } from "@/lib/layouts"
import { countFilled, useBoothStore } from "@/stores/booth"
import { DecorList } from "./DecorList"
import { DecorPanel } from "./DecorPanel"
import StripCanvas from "./StripCanvas"
import { getEffect, getFrame } from "./presets"

/* DESIGN-SYSTEM §10.3: halaman Hias Strip. Rel kiri pilihan hias (lembar bawah
   di layar sempit), tengah kanvas strip, rel kanan kartu QR di strip, ringkasan,
   dan aksi utama. Kartu Strip Hidup menyusul di M7.
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

  const stageRef = useRef<KonvaStage>(null)
  const groupRef = useRef<KonvaGroup>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
            {/* SH-04: kartu QR di strip. Teksnya dari docs/ui-reference/
                customize.html; tidak ada aksi `tangerine` baru di sini supaya
                satu aksi utama per layar tetap "Selesai & Unduh". */}
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
