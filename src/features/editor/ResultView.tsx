"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
import {
  completeStrip,
  requestStrip,
  uploadStripStill,
  type StripUpload,
} from "@/features/share/api"
import { ShareCard } from "@/features/share/ShareCard"
import { clearStripToken, saveStripToken } from "@/features/share/stripToken"
import { useQrImageUrl } from "@/features/share/useQrImage"
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
   Berkas ini hanya boleh dimuat lewat `next/dynamic` (ARCHITECTURE §9).

   M6 menambah alur bagikan (SH-04, SH-06). Ekspor dijalankan ulang setelah QR
   siap melalui antrean satu jalur: panggung diubah ukurannya saat ekspor, jadi
   dua ekspor tidak boleh berjalan bersamaan. Setelah QR ada di gambar, berkas
   diunggah ke URL bertanda tangan dan rute complete memasang tanggal
   kedaluwarsanya. */

const PREVIEW_WIDTH_STRIP = 216
const PREVIEW_WIDTH_GRID = 320
/* Ekspor mount menunggu gambar slot (dan QR) selesai didekode; batas ini
   menjaga halaman tidak menggantung bila salah satu gambar gagal. */
const IMAGE_WAIT_TIMEOUT_MS = 8_000
const IMAGE_WAIT_STEP_MS = 50

/* Takhtanya tidak mendengar apa pun (`listening={false}`), jadi pengendali
   pilihan tidak pernah dipanggil. */
const IGNORE = () => {}

/** Ekspor menyalin kanvas saat ini, jadi setiap gambar bernama di dalam grup
 *  harus sudah terpasang. */
async function waitForImages(group: KonvaGroup, names: string[]): Promise<void> {
  const deadline = Date.now() + IMAGE_WAIT_TIMEOUT_MS
  while (Date.now() < deadline) {
    const ready = names.every((name) => {
      const nodes = group.find(`.${name}`)
      return (
        nodes.length > 0 &&
        nodes.every((node) => (node as KonvaImageNode).image() !== undefined)
      )
    })
    if (ready) {
      return
    }
    const { promise, resolve } = Promise.withResolvers<void>()
    window.setTimeout(resolve, IMAGE_WAIT_STEP_MS)
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
  const share = useBoothStore((state) => state.share)
  const setShareStrip = useBoothStore((state) => state.setShareStrip)
  const reset = useBoothStore((state) => state.reset)

  const stageRef = useRef<KonvaStage>(null)
  const groupRef = useRef<KonvaGroup>(null)
  const busyRef = useRef(false)
  const againRef = useRef(false)
  const lastKeyRef = useRef<string | null>(null)
  const runRef = useRef<(() => Promise<void>) | null>(null)
  /* URL unggah sekali pakai dari POST /api/strips, menunggu gambar ber-QR. */
  const pendingUploadRef = useRef<{ id: string; upload: StripUpload } | null>(
    null
  )

  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [linking, setLinking] = useState(false)

  /* QR baru digambar setelah linknya ada; sebelum itu kotak QR tidak ikut
     diekspor supaya strip yang diunduh tidak berisi glif penanda. */
  const qrImageUrl = useQrImageUrl(share)
  const qr = qrImageUrl === null ? undefined : { imageUrl: qrImageUrl }
  const shareStrip = share.strip

  const layout = getLayout(layoutId)
  const previewWidth =
    layout.canvas.width > 600 ? PREVIEW_WIDTH_GRID : PREVIEW_WIDTH_STRIP

  /** SH-06: mengunggah gambar ber-QR lalu menandai stripnya selesai. */
  const finishShare = useCallback(
    async (exported: string) => {
      const pending = pendingUploadRef.current
      if (
        pending === null ||
        shareStrip === null ||
        shareStrip.id !== pending.id ||
        shareStrip.expiresAt !== null
      ) {
        return
      }
      try {
        const blob = await (await fetch(exported)).blob()
        await uploadStripStill(pending.upload, blob)
        const completed = await completeStrip(pending.id)
        pendingUploadRef.current = null
        setShareStrip({ id: pending.id, expiresAt: completed.expiresAt })
        toast.success("Link strip dibuat.")
      } catch (error) {
        /* Baris draf yang yatim dibersihkan cron dalam 24 jam; token di
           perangkat dibuang supaya tidak ada tombol hapus yang menyesatkan. */
        pendingUploadRef.current = null
        clearStripToken(pending.id)
        setShareStrip(null)
        toast.error(
          error instanceof Error ? error.message : "Unggahan gagal. Coba lagi."
        )
      }
    },
    [shareStrip, setShareStrip]
  )

  const runExport = useCallback(async () => {
    /* Link sudah dibuat tetapi QR-nya belum siap: tunggu render berikutnya
       supaya strip yang diunggah tidak pernah kehilangan QR-nya. */
    if (shareStrip !== null && qrImageUrl === null) {
      return
    }
    const stage = stageRef.current
    const group = groupRef.current
    if (stage === null || group === null) {
      setFailed(true)
      return
    }
    const key = `${layoutId}|${effectId}|${qrImageUrl ?? ""}`
    if (lastKeyRef.current === key) {
      return
    }
    try {
      await waitForImages(
        group,
        qrImageUrl === null ? ["slot-photo"] : ["slot-photo", "qr-plate"]
      )
      const exported = await exportStrip(stage, group, {
        canvas: layout.canvas,
        effect: getEffect(effectId).params,
      })
      setDataUrl(exported)
      setSheetUrl(await composePrintSheet(exported, layoutId))
      setFailed(false)
      lastKeyRef.current = key
      await finishShare(exported)
    } catch {
      setFailed(true)
    }
  }, [effectId, finishShare, layout, layoutId, qrImageUrl, shareStrip])

  useEffect(() => {
    runRef.current = runExport
  })

  /* Antrean ekspor: satu ekspor berjalan pada satu waktu, dan permintaan yang
     datang di tengah ekspor dijalankan sekali lagi setelahnya. */
  useEffect(() => {
    async function pump() {
      if (busyRef.current) {
        againRef.current = true
        return
      }
      busyRef.current = true
      try {
        do {
          againRef.current = false
          await runRef.current?.()
        } while (againRef.current)
      } finally {
        busyRef.current = false
      }
    }
    void pump()
  }, [effectId, layoutId, qrImageUrl])

  /** SE-02 (dipakai SH-04): dialog persetujuan sudah dijawab, sekarang minta
   *  id dan URL unggah, lalu simpan token hapus di perangkat. */
  async function handleCreateLink() {
    setLinking(true)
    try {
      const created = await requestStrip(layoutId)
      saveStripToken(created.id, created.deleteToken)
      pendingUploadRef.current = { id: created.id, upload: created.upload }
      setShareStrip({ id: created.id, expiresAt: null })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Link belum bisa dibuat. Coba lagi sebentar lagi."
      )
    } finally {
      setLinking(false)
    }
  }

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
              {shareStrip === null
                ? "Semua diproses di perangkat ini. Tidak ada yang diunggah."
                : "Strip kamu ada di link pribadi. Tidak ada yang lain diunggah."}
            </p>
          </>
        }
        right={
          <div className="mt-auto flex flex-col gap-3">
            {share.qrEnabled || shareStrip !== null ? (
              <ShareCard
                strip={shareStrip}
                busy={linking}
                onCreate={handleCreateLink}
              />
            ) : null}

            <div className="flex flex-col gap-2">
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
                  Berkas belum bisa disiapkan. Muat ulang halaman, lalu coba
                  lagi.
                </p>
              ) : null}
            </div>
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
            qr={qr}
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
