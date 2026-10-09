"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { DownloadSimple, Lock, Printer } from "@phosphor-icons/react"
import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Image as KonvaImageNode } from "konva/lib/shapes/Image"
import type { Stage as KonvaStage } from "konva/lib/Stage"
import { Stage } from "react-konva"
import { toast } from "sonner"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { clearSession } from "@/features/session/sessionDb"
import { getLayout, type LayoutId } from "@/lib/layouts"
import { countFilled, useBoothStore } from "@/stores/booth"
import { StripStage } from "./StripStage"
import { downloadStrip, exportStrip, formatStripFilename } from "./exportStrip"
import { getEffect, getFrame } from "./presets"
import { composePrintSheet } from "./sheet"

/* FR-11 dan FR-12: halaman Hasil. Ekspor terjadi sekali saat mount dengan
   panggung tersembunyi, jadi tombol unduh dan cetak hanya menyerahkan berkas
   yang sudah jadi. Lembar 4R selalu dikomposisi di sini supaya CSS cetak
   (globals.css) tinggal menampilkan satu gambar. Halaman tanpa berkas acuan:
   disusun dari Booth Shell dan komponen DESIGN-SYSTEM §9.
   Berkas ini hanya boleh dimuat lewat `next/dynamic` (ARCHITECTURE §9). */

const PREVIEW_WIDTH_STRIP = 216
const PREVIEW_WIDTH_GRID = 320
/* Ekspor mount menunggu gambar slot selesai didekode; batas ini menjaga
   halaman tidak menggantung bila salah satu gambar gagal. */
const PHOTO_WAIT_TIMEOUT_MS = 8_000
const PHOTO_WAIT_STEP_MS = 50

/* Takhtanya tidak mendengar apa pun (`listening={false}`), jadi pengendali
   pilihan tidak pernah dipanggil. */
const IGNORE = () => {}

/** Ekspor menyalin kanvas saat ini, jadi gambar slot harus sudah terpasang. */
async function waitForSlotPhotos(group: KonvaGroup): Promise<void> {
  const deadline = Date.now() + PHOTO_WAIT_TIMEOUT_MS
  while (Date.now() < deadline) {
    const nodes = group.find(".slot-photo")
    if (
      nodes.length > 0 &&
      nodes.every(
        (node) => (node as KonvaImageNode).image() !== undefined
      )
    ) {
      return
    }
    const { promise, resolve } = Promise.withResolvers<void>()
    window.setTimeout(resolve, PHOTO_WAIT_STEP_MS)
    await promise
  }
  throw new Error("Foto belum siap diekspor")
}

export default function ResultView({ layoutId }: { layoutId: LayoutId }) {
  const router = useRouter()
  const shots = useBoothStore((state) => state.shots)
  const frameId = useBoothStore((state) => state.frameId)
  const effectId = useBoothStore((state) => state.effectId)
  const stickers = useBoothStore((state) => state.stickers)
  const texts = useBoothStore((state) => state.texts)
  const showDate = useBoothStore((state) => state.showDate)
  const reset = useBoothStore((state) => state.reset)

  const stageRef = useRef<KonvaStage>(null)
  const groupRef = useRef<KonvaGroup>(null)
  const startedRef = useRef(false)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const layout = getLayout(layoutId)
  const previewWidth =
    layout.canvas.width > 600 ? PREVIEW_WIDTH_GRID : PREVIEW_WIDTH_STRIP

  useEffect(() => {
    /* StrictMode memasang efek dua kali di pengembangan; ekspor hanya boleh
       berjalan sekali supaya panggung tidak disetel ukurannya dua kali. */
    if (startedRef.current) {
      return
    }
    startedRef.current = true

    async function prepare() {
      const stage = stageRef.current
      const group = groupRef.current
      if (stage === null || group === null) {
        setFailed(true)
        return
      }
      try {
        await waitForSlotPhotos(group)
        const exported = await exportStrip(stage, group, {
          canvas: layout.canvas,
          effect: getEffect(effectId).params,
        })
        setDataUrl(exported)
        setSheetUrl(await composePrintSheet(exported, layoutId))
      } catch {
        setFailed(true)
      }
    }

    void prepare()
  }, [effectId, layout, layoutId])

  function handleDownload() {
    if (dataUrl === null) {
      return
    }
    downloadStrip(dataUrl, formatStripFilename(new Date()))
    toast.success("Strip tersimpan di perangkatmu.")
  }

  function handleRestart() {
    /* FR-14: rekaman di perangkat dihapus lebih dulu, lalu sesi di memori. */
    void clearSession()
    reset()
    router.replace("/booth/layout")
  }

  const preparing = dataUrl === null && !failed

  return (
    <>
      <BoothPanel
        title="Hasil"
        backHref="/booth/customize"
        actions={<Badge variant="lime">{`${countFilled(shots)} foto`}</Badge>}
        left={
          <div className="flex flex-col gap-3 rounded-card border-2 border-ink bg-paper p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px]">
              <dt className="self-center font-mono text-xs font-bold tracking-[0.06em] text-muted uppercase">
                Layout
              </dt>
              <dd className="font-bold">{layout.label}</dd>
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
          </div>
        }
        center={
          <>
            <div className="flex justify-center rounded-stage border-3 border-ink bg-cream p-6 md:p-9">
              {dataUrl === null ? (
                <div
                  className="flex items-center justify-center rounded-thumb border-2 border-dashed border-muted"
                  style={{
                    width: previewWidth,
                    aspectRatio: `${layout.canvas.width} / ${layout.canvas.height}`,
                  }}
                >
                  <span className="sr-only">Menyiapkan hasil</span>
                </div>
              ) : (
                /* DataURL hasil ekspor, bukan aset: next/image tidak dipakai. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={dataUrl}
                  alt="Pratinjau strip"
                  style={{ width: previewWidth }}
                  className="h-auto border-2 border-ink"
                />
              )}
            </div>
            <p className="text-center font-mono text-xs text-muted">
              {`Ekspor ${layout.canvas.width} x ${layout.canvas.height} px`}
            </p>
            <p className="flex items-center justify-center gap-2 text-sm text-muted">
              <Lock weight="bold" className="size-5 shrink-0" aria-hidden />
              Semua diproses di perangkat ini. Tidak ada yang diunggah.
            </p>
          </>
        }
        right={
          <div className="mt-auto flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              disabled={dataUrl === null}
              onClick={handleDownload}
            >
              <DownloadSimple
                weight="bold"
                className="size-[22px]"
                aria-hidden
              />
              {preparing ? "Menyiapkan berkas..." : "Selesai & Unduh"}
            </Button>
            <Button
              variant="neutral"
              className="w-full"
              disabled={sheetUrl === null}
              onClick={() => window.print()}
            >
              <Printer weight="bold" className="size-[22px]" aria-hidden />
              Cetak 4R
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleRestart}>
              Mulai dari awal
            </Button>
            {failed ? (
              <p className="text-sm leading-[1.4] text-danger" role="alert">
                Berkas belum bisa disiapkan. Muat ulang halaman, lalu coba lagi.
              </p>
            ) : null}
          </div>
        }
      />

      {/* Panggung ekspor di luar layar: sumber dataUrl di atas. */}
      <div className="absolute top-0 left-[-9999px]" aria-hidden>
        <Stage
          ref={stageRef}
          width={previewWidth}
          height={layout.canvas.height * (previewWidth / layout.canvas.width)}
          listening={false}
        >
          <StripStage
            layoutId={layoutId}
            shots={shots}
            frame={getFrame(frameId)}
            effect={getEffect(effectId).params}
            stickers={stickers}
            texts={texts}
            showDate={showDate}
            scale={previewWidth / layout.canvas.width}
            groupRef={groupRef}
            onSelect={IGNORE}
            onChangeSticker={IGNORE}
            onChangeText={IGNORE}
          />
        </Stage>
      </div>

      {/* FR-12: satu halaman 4 x 6 inci. Portal ke `body` supaya CSS cetak
          bisa menghilangkan seluruh isi halaman dan menyisakan lembar ini;
          tersembunyi di layar lewat `hidden`, ditampilkan blok `@media print`
          di globals.css. */}
      {sheetUrl === null
        ? null
        : createPortal(
            <div data-print-sheet="4r" className="hidden">
              {/* DataURL lembar cetak, bukan aset: next/image tidak dipakai. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sheetUrl} alt="Lembar cetak 4R" />
            </div>,
            document.body
          )}
    </>
  )
}
