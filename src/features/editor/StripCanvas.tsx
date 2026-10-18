"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Node as KonvaNode } from "konva/lib/Node"
import type { Stage as KonvaStage } from "konva/lib/Stage"
import { Stage, Transformer } from "react-konva"

import { useQrPlate } from "@/features/share/useQrImage"
import { getLayout, type LayoutId } from "@/lib/layouts"
import { STICKER_WIDTH_MIN, useBoothStore } from "@/stores/booth"
import { StripStage, type StripSelection, type StripStageProps } from "./StripStage"
import { getEffect, getFrame } from "./presets"
import { resolveTokenColor } from "./tokenColor"

/* Panggung hias. Tiga hal yang diurus di sini dan tidak di StripStage:
   ukuran tampilan, pilihan node, dan Transformer. Berkas ini hanya boleh
   dimuat lewat `next/dynamic` (ARCHITECTURE §9). */

const VIEW_WIDTH_MIN = 180
/* Acuan `customize.html` memakai strip 210 px pada semua lebar (tinggi 630 px).
   216 px menjaga skala yang sama sambil menahan aksi utama dekat lipatan layar
   pada 1280 x 900. */
const VIEW_WIDTH_MAX = 216
/* Kotak terkecil yang diterima Transformer, dalam satuan ruang strip. */
const MIN_BOX_STRIP = STICKER_WIDTH_MIN
const ANCHOR_SIZE = 16
const ANCHOR_STROKE = 2
const ANCHOR_RADIUS = 8
const BORDER_STROKE = 3

interface StripCanvasProps {
  layoutId: LayoutId
  stageRef: RefObject<KonvaStage | null>
  groupRef: RefObject<KonvaGroup | null>
  /** SH-02: pratinjau Strip Hidup dari halaman Hias. */
  live?: StripStageProps["live"]
}

export default function StripCanvas({
  layoutId,
  stageRef,
  groupRef,
  live,
}: StripCanvasProps) {
  const shots = useBoothStore((state) => state.shots)
  const frameId = useBoothStore((state) => state.frameId)
  const effectId = useBoothStore((state) => state.effectId)
  const stickers = useBoothStore((state) => state.stickers)
  const texts = useBoothStore((state) => state.texts)
  const showDate = useBoothStore((state) => state.showDate)
  /* SH-04: kotak QR ikut digambar di kanvas hias supaya pengguna melihat
     tempatnya sebelum link dibuat. */
  const qr = useQrPlate(useBoothStore((state) => state.share))
  const updateSticker = useBoothStore((state) => state.updateSticker)
  const updateText = useBoothStore((state) => state.updateText)
  const removeSticker = useBoothStore((state) => state.removeSticker)
  const removeText = useBoothStore((state) => state.removeText)

  const containerRef = useRef<HTMLDivElement>(null)
  const [viewWidth, setViewWidth] = useState(0)
  const [selection, setSelection] = useState<StripSelection | null>(null)

  /* Lebar panggung mengikuti lebar kolom tengah, dijepit 180 sampai 320 px
     supaya strip tetap terbaca di layar sempit dan tidak memakan tinggi. */
  useEffect(() => {
    const element = containerRef.current
    if (element === null) {
      return
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setViewWidth(Math.min(VIEW_WIDTH_MAX, Math.max(VIEW_WIDTH_MIN, width)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  /* Pilihan bisa menunjuk item yang sudah dihapus dari daftar "Isi strip":
     Transformer dilepas saat itu, tanpa perlu membersihkan state. */
  const selectionLive =
    selection !== null &&
    (selection.kind === "sticker"
      ? stickers.some((item) => item.id === selection.id)
      : texts.some((item) => item.id === selection.id))

  /* DESIGN-SYSTEM §11: Delete dan Backspace menghapus node terpilih. Tidak
     aktif saat fokus ada di isian teks. */
  useEffect(() => {
    if (selection === null) {
      return
    }
    const { kind, id } = selection

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return
      }
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      if (kind === "sticker") {
        removeSticker(id)
      } else {
        removeText(id)
      }
      setSelection(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selection, removeSticker, removeText])

  const layout = getLayout(layoutId)
  const scale = viewWidth / layout.canvas.width

  function handlePointerDown(event: { target: KonvaNode }) {
    const target = event.target
    const id = target.id()
    const kind = id.startsWith("sticker:")
      ? "sticker"
      : id.startsWith("text:")
        ? "text"
        : null
    if (kind !== null) {
      setSelection({ kind, id: id.slice(id.indexOf(":") + 1), node: target })
      return
    }
    /* Klik pada pegangan atau garis Transformer bukan klik pada latar. */
    if (
      target.getClassName() === "Transformer" ||
      target.getParent()?.getClassName() === "Transformer"
    ) {
      return
    }
    setSelection(null)
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[216px] [&>div]:touch-none"
    >
      {viewWidth > 0 ? (
        <Stage
          ref={stageRef}
          width={viewWidth}
          height={layout.canvas.height * scale}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
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
            live={live}
            scale={scale}
            groupRef={groupRef}
            onSelect={setSelection}
            onChangeSticker={updateSticker}
            onChangeText={updateText}
          >
            {selectionLive && selection !== null ? (
              <Transformer
                name="editor-overlay"
                nodes={[selection.node]}
                rotateEnabled
                flipEnabled={false}
                anchorSize={ANCHOR_SIZE}
                anchorStrokeWidth={ANCHOR_STROKE}
                anchorCornerRadius={ANCHOR_RADIUS}
                borderStrokeWidth={BORDER_STROKE}
                borderStroke={resolveTokenColor("--color-violet")}
                anchorStroke={resolveTokenColor("--color-violet")}
                anchorFill={resolveTokenColor("--color-paper")}
                boundBoxFunc={(oldBox, nextBox) =>
                  nextBox.width < MIN_BOX_STRIP * scale ? oldBox : nextBox
                }
              />
            ) : null}
          </StripStage>
        </Stage>
      ) : null}
    </div>
  )
}
