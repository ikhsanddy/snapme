"use client"

import { useRef, useState } from "react"
import { Check, DownloadSimple, Sticker as StickerIcon } from "@phosphor-icons/react"
import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Stage as KonvaStage } from "konva/lib/Stage"
import { toast } from "sonner"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { downloadStrip, exportStrip, formatStripFilename } from "./exportStrip"
import { getEffect, getFrame } from "./presets"

/* DESIGN-SYSTEM §10.3: halaman Hias Strip. Rel kiri pilihan hias (lembar bawah
   di layar sempit), tengah kanvas strip, rel kanan ringkasan dan aksi utama.
   Kartu Strip Hidup dan QR di strip menyusul di M6 dan M7.
   Berkas ini dan seluruh isi `features/editor` hanya dimuat lewat import()
   dinamis dari halaman, supaya Konva tidak ikut bundel `/` dan `/booth/capture`. */

export default function CustomizeEditor({ layoutId }: { layoutId: LayoutId }) {
  const shots = useBoothStore((state) => state.shots)
  const frameId = useBoothStore((state) => state.frameId)
  const effectId = useBoothStore((state) => state.effectId)
  const stickers = useBoothStore((state) => state.stickers)

  const stageRef = useRef<KonvaStage>(null)
  const groupRef = useRef<KonvaGroup>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleDownload() {
    const stage = stageRef.current
    const group = groupRef.current
    if (stage === null || group === null || exporting) {
      return
    }

    setExporting(true)
    try {
      const dataUrl = await exportStrip(stage, group, {
        canvas: getLayout(layoutId).canvas,
        effect: getEffect(effectId).params,
      })
      downloadStrip(dataUrl, formatStripFilename(new Date()))
      toast.success("Strip tersimpan di perangkatmu.")
    } catch {
      toast.error("Strip gagal disiapkan. Coba lagi sebentar.")
    } finally {
      setExporting(false)
    }
  }

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
              Ekspor 600 x 1800 px (2 x 6 inci, 300 dpi)
            </p>
            <DecorList />
          </>
        }
        right={
          <>
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
              <Button
                size="lg"
                className="w-full"
                disabled={exporting}
                onClick={handleDownload}
              >
                <DownloadSimple
                  weight="bold"
                  className="size-[22px]"
                  aria-hidden
                />
                {exporting ? "Menyiapkan berkas..." : "Selesai & Unduh"}
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
