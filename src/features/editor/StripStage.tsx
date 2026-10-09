"use client"

import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Image as KonvaImageNode } from "konva/lib/shapes/Image"
import type { Node as KonvaNode } from "konva/lib/Node"
import type { Text as KonvaTextNode } from "konva/lib/shapes/Text"
import { Group, Image as KonvaImage, Layer, Rect, Text } from "react-konva"

import { getLayout, type LayoutId, type Rect as SlotRect } from "@/lib/layouts"
import type {
  Shot,
  StickerInstance,
  StickerPatch,
  StripText,
  TextPatch,
} from "@/stores/booth"
import { resolveFontFamily } from "./canvasFonts"
import { applyEffect } from "./filters"
import { STICKERS, type EffectParams, type FramePreset } from "./presets"
import { resolveTokenColor } from "./tokenColor"
import { useHtmlImage } from "./useHtmlImage"

/* DESIGN-SYSTEM §10.3: isi strip di atas kanvas. Semua koordinat di berkas ini
   memakai ruang strip 600 x 1800 dari `lib/layouts.ts`; panggungnya sendiri yang
   diskalakan (StripCanvas), jadi strip-3 bekerja tanpa cabang khusus.
   Berkas ini hanya boleh dimuat lewat `next/dynamic` (ARCHITECTURE §9). */

const STRIP_RADIUS = 24
const SLOT_RADIUS = 10
const STRIP_BORDER = 8
const SLOT_BORDER = 6
const WORDMARK_SIZE = 40
const DATE_SIZE = 28
/* Tinggi baris wordmark dan tanggal di kaki strip. Sisanya dipakai teks
   pengguna (FR-10), supaya keduanya tidak saling menimpa. */
const FOOTER_ROW = 100

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export type SelectionKind = "sticker" | "text"

export interface StripSelection {
  kind: SelectionKind
  id: string
  node: KonvaNode
}

export interface StripStageProps {
  layoutId: LayoutId
  shots: (Shot | null)[]
  frame: FramePreset
  effect: EffectParams
  stickers: StickerInstance[]
  texts: StripText[]
  showDate: boolean
  /** Skala panggung: `lebar tampilan / lebar strip`. */
  scale: number
  groupRef: RefObject<KonvaGroup | null>
  onSelect: (selection: StripSelection) => void
  onChangeSticker: (id: string, patch: StickerPatch) => void
  onChangeText: (id: string, patch: TextPatch) => void
  /** Transformer dari StripCanvas: satu-satunya bagian yang tidak ikut ekspor. */
  children?: ReactNode
}

/* Putaran dari Transformer bisa kelipatan 360 atau negatif; yang disimpan ke
   store selalu 0 sampai 359 supaya daftar "Isi strip" enak dibaca. */
function normalizeRotation(degrees: number): number {
  return Math.round(((degrees % 360) + 360) % 360)
}

function SlotPhoto({
  shot,
  rect,
  effect,
}: {
  shot: Shot | null
  rect: SlotRect
  effect: EffectParams
}) {
  const image = useHtmlImage(shot?.still)
  const nodeRef = useRef<KonvaImageNode>(null)

  useEffect(() => {
    const node = nodeRef.current
    if (node === null) {
      return
    }
    /* Selama gambar baru dimuat, cache lama harus dibuang: kalau tidak, foto
       sebelumnya masih terlihat dari kanvas cache. */
    if (image === undefined) {
      node.clearCache()
      return
    }
    applyEffect(node, effect)
  }, [image, effect])

  return (
    <KonvaImage
      ref={nodeRef}
      name="slot-photo"
      image={image}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      listening={false}
    />
  )
}

function StickerNode({
  sticker,
  onSelect,
  onChange,
}: {
  sticker: StickerInstance
  onSelect: (selection: StripSelection) => void
  onChange: (id: string, patch: StickerPatch) => void
}) {
  const asset = STICKERS.find((item) => item.id === sticker.assetId)
  const image = useHtmlImage(
    asset === undefined ? undefined : `/stickers/${asset.file}`
  )
  const ratio = image === undefined ? 1 : image.naturalHeight / image.naturalWidth

  function commit(node: KonvaImageNode) {
    const ratioAfter = node.height() / node.width()
    const width = node.width() * node.scaleX()
    /* Skala dipindahkan ke atribut ukuran supaya store tetap satu-satunya
       sumber kebenaran dan Transformer tidak menumpuk skala. */
    node.width(width)
    node.height(width * ratioAfter)
    node.scaleX(1)
    node.scaleY(1)
    onChange(sticker.id, {
      x: node.x(),
      y: node.y(),
      rotation: normalizeRotation(node.rotation()),
      width,
    })
  }

  return (
    <KonvaImage
      id={`sticker:${sticker.id}`}
      name="selectable"
      image={image}
      x={sticker.x}
      y={sticker.y}
      width={sticker.width}
      height={sticker.width * ratio}
      rotation={sticker.rotation}
      draggable
      onClick={(event) =>
        onSelect({
          kind: "sticker",
          id: sticker.id,
          node: event.target as KonvaNode,
        })
      }
      onDragEnd={(event) => {
        const node = event.target as KonvaImageNode
        onChange(sticker.id, { x: node.x(), y: node.y() })
      }}
      onTransformEnd={(event) => commit(event.target as KonvaImageNode)}
    />
  )
}

function TextNode({
  text,
  boxWidth,
  fill,
  fontFamily,
  onSelect,
  onChange,
}: {
  text: StripText
  boxWidth: number
  fill: string
  fontFamily: string
  onSelect: (selection: StripSelection) => void
  onChange: (id: string, patch: TextPatch) => void
}) {
  /* `x` di store adalah titik tengah kotak teks (lihat komentar StripText),
     sedangkan node Konva diposisikan dari tepi kiri. */
  const half = boxWidth / 2

  return (
    <Text
      id={`text:${text.id}`}
      name="selectable"
      text={text.value}
      x={text.x - half}
      y={text.y}
      width={boxWidth}
      align="center"
      fontFamily={fontFamily}
      fontStyle="700"
      fontSize={text.fontSize}
      fill={fill}
      rotation={text.rotation}
      draggable
      onClick={(event) =>
        onSelect({ kind: "text", id: text.id, node: event.target as KonvaNode })
      }
      onDragEnd={(event) => {
        const node = event.target as KonvaTextNode
        onChange(text.id, { x: node.x() + half, y: node.y() })
      }}
      onTransformEnd={(event) => {
        const node = event.target as KonvaTextNode
        const fontSize = node.fontSize() * node.scaleX()
        node.fontSize(fontSize)
        node.scaleX(1)
        node.scaleY(1)
        onChange(text.id, {
          x: node.x() + half,
          y: node.y(),
          rotation: normalizeRotation(node.rotation()),
          fontSize,
        })
      }}
    />
  )
}

export function StripStage({
  layoutId,
  shots,
  frame,
  effect,
  stickers,
  texts,
  showDate,
  scale,
  groupRef,
  onSelect,
  onChangeSticker,
  onChangeText,
  children,
}: StripStageProps) {
  const layout = getLayout(layoutId)
  const ink = resolveTokenColor("--color-ink")
  /* Teks di kaki strip (wordmark, tanggal, teks pengguna) memakai warna
     wordmark frame: pasangan yang sudah lolos kontras DESIGN-SYSTEM §2 untuk
     setiap latar, sedangkan `ink` di atas latar `ink` tidak terbaca. */
  const footerFill = resolveTokenColor(frame.wordmark)

  return (
    <Layer>
      {/* Skala hanya di grup isi: Transformer tetap di ruang panggung supaya
          pegangan ubah ukurannya tidak ikut mengecil. */}
      <Group ref={groupRef} scaleX={scale} scaleY={scale}>
        <Rect
          name="strip-bg"
          width={layout.canvas.width}
          height={layout.canvas.height}
          fill={resolveTokenColor(frame.bg)}
          stroke={ink}
          strokeWidth={STRIP_BORDER}
          cornerRadius={STRIP_RADIUS}
          listening={false}
        />

        {layout.slotRects.map((rect, index) => (
          <Group
            key={`slot-${index}`}
            clipFunc={(ctx) => {
              ctx.beginPath()
              ctx.roundRect(rect.x, rect.y, rect.width, rect.height, SLOT_RADIUS)
            }}
          >
            <SlotPhoto shot={shots[index] ?? null} rect={rect} effect={effect} />
            <Rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              stroke={resolveTokenColor(frame.slotBorder)}
              strokeWidth={SLOT_BORDER}
              cornerRadius={SLOT_RADIUS}
              listening={false}
            />
          </Group>
        ))}

        <Text
          x={layout.margin}
          y={layout.footerRect.y}
          width={layout.footerRect.width / 2}
          height={FOOTER_ROW}
          verticalAlign="middle"
          text="snapme"
          fontFamily={resolveFontFamily("display")}
          fontStyle="900"
          fontSize={WORDMARK_SIZE}
          fill={footerFill}
          listening={false}
        />

        {showDate ? (
          <Text
            x={layout.footerRect.x + layout.footerRect.width / 2}
            y={layout.footerRect.y}
            width={layout.footerRect.width / 2}
            height={FOOTER_ROW}
            verticalAlign="middle"
            align="right"
            text={DATE_FORMAT.format(new Date())}
            fontFamily={resolveFontFamily("mono")}
            fontStyle="700"
            fontSize={DATE_SIZE}
            fill={footerFill}
            listening={false}
          />
        ) : null}

        {stickers.map((sticker) => (
          <StickerNode
            key={sticker.id}
            sticker={sticker}
            onSelect={onSelect}
            onChange={onChangeSticker}
          />
        ))}

        {texts.map((text) => (
          <TextNode
            key={text.id}
            text={text}
            boxWidth={layout.slot.width}
            fill={footerFill}
            fontFamily={resolveFontFamily("sans")}
            onSelect={onSelect}
            onChange={onChangeText}
          />
        ))}
      </Group>

      {children}
    </Layer>
  )
}
