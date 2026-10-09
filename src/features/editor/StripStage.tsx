"use client"

import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Image as KonvaImageNode } from "konva/lib/shapes/Image"
import type { Node as KonvaNode } from "konva/lib/Node"
import type { Text as KonvaTextNode } from "konva/lib/shapes/Text"
import { Group, Image as KonvaImage, Layer, Path, Rect, Text } from "react-konva"

import {
  FOOTER_WORDMARK_ROW,
  footerTextWidth,
  getLayout,
  qrRect,
  type LayoutId,
  type Rect as SlotRect,
} from "@/lib/layouts"
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
   memakai ruang kanvas layout dari `lib/layouts.ts`; panggungnya sendiri yang
   diskalakan (StripCanvas), jadi strip-3 dan grid bekerja tanpa cabang khusus.
   Berkas ini hanya boleh dimuat lewat `next/dynamic` (ARCHITECTURE §9). */

const STRIP_RADIUS = 24
const SLOT_RADIUS = 10
const STRIP_BORDER = 8
const SLOT_BORDER = 6
const WORDMARK_SIZE = 40
const DATE_SIZE = 28
const QR_PLATE_BORDER = 2
const QR_PLATE_RADIUS = 16
/* Selama link belum dibuat, kotak QR diisi glif supaya pengguna melihat di mana
   QR akan duduk. Ukurannya 60 persen kotak. */
const QR_GLYPH_RATIO = 0.6
const QR_GLYPH_VIEWBOX = 256

/* Atribut `d` ikon `QrCode` bobot bold dari @phosphor-icons/react (viewBox
   0 0 256 256), disalin apa adanya: Konva tidak bisa merender komponen React,
   dan DESIGN-SYSTEM §8 melarang menggambar path ikon sendiri. */
const QR_GLYPH_PATH =
  "M100,36H56A20,20,0,0,0,36,56v44a20,20,0,0,0,20,20h44a20,20,0,0,0,20-20V56A20,20,0,0,0,100,36ZM96,96H60V60H96Zm4,40H56a20,20,0,0,0-20,20v44a20,20,0,0,0,20,20h44a20,20,0,0,0,20-20V156A20,20,0,0,0,100,136Zm-4,60H60V160H96ZM200,36H156a20,20,0,0,0-20,20v44a20,20,0,0,0,20,20h44a20,20,0,0,0,20-20V56A20,20,0,0,0,200,36Zm-4,60H160V60h36Zm-60,76V148a12,12,0,0,1,24,0v24a12,12,0,0,1-24,0Zm84-8a12,12,0,0,1-12,12H196v32a12,12,0,0,1-12,12H148a12,12,0,0,1,0-24h24V148a12,12,0,0,1,24,0v4h12A12,12,0,0,1,220,164Z"

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
  /** SH-04: QR di kaki strip. Tidak ada prop ini berarti fitur mati; `imageUrl`
   *  null berarti kotak QR masih menampilkan glif penanda. */
  qr?: { imageUrl: string | null }
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
  maxCenterX,
  fill,
  fontFamily,
  onSelect,
  onChange,
}: {
  text: StripText
  boxWidth: number
  /** Batas kanan titik tengah teks saat QR menempati kaki strip: nilai store
   *  tidak diubah, hanya tampilannya yang dijepit supaya teks panjang tetap
   *  membungkus di kiri QR. */
  maxCenterX?: number
  fill: string
  fontFamily: string
  onSelect: (selection: StripSelection) => void
  onChange: (id: string, patch: TextPatch) => void
}) {
  /* `x` di store adalah titik tengah kotak teks (lihat komentar StripText),
     sedangkan node Konva diposisikan dari tepi kiri. */
  const center = maxCenterX === undefined ? text.x : Math.min(text.x, maxCenterX)
  const half = boxWidth / 2

  return (
    <Text
      id={`text:${text.id}`}
      name="selectable"
      text={text.value}
      x={center - half}
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
  qr,
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
  const qrImage = useHtmlImage(qr?.imageUrl ?? undefined)
  const qrBox = qr === undefined ? null : qrRect(layout)
  /* Tanggal dan teks pengguna selalu satu baris dengan kodratnya: selebar kaki,
     atau menyempit di kiri QR. */
  const footerWidth = footerTextWidth(layout, qrBox !== null)
  const glyphSize = qrBox === null ? 0 : qrBox.width * QR_GLYPH_RATIO

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
          height={FOOTER_WORDMARK_ROW}
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
            x={layout.footerRect.x}
            y={layout.footerRect.y}
            width={footerWidth}
            height={FOOTER_WORDMARK_ROW}
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

        {/* SH-04: QR di kanan kaki strip. Digambar setelah wordmark dan tanggal
            supaya menutupi keduanya bila ruangnya bertabrakan, dan sebelum
            stiker karena stiker boleh menutupi QR atas pilihan pengguna. */}
        {qrBox === null ? null : (
          <Group
            listening={false}
            /* Sudut membulat mengikuti acuan customize.html; gambarnya ikut
               terjepit di sudut, dan itu hanya memakan zona tenang QR. Jepitan
               dilebihkan setengah garis tepi supaya garis 2 px-nya utuh. */
            clipFunc={(ctx) => {
              const inset = QR_PLATE_BORDER / 2
              ctx.beginPath()
              ctx.roundRect(
                qrBox.x - inset,
                qrBox.y - inset,
                qrBox.width + QR_PLATE_BORDER,
                qrBox.height + QR_PLATE_BORDER,
                QR_PLATE_RADIUS + inset
              )
            }}
          >
            <Rect
              x={qrBox.x}
              y={qrBox.y}
              width={qrBox.width}
              height={qrBox.height}
              fill={resolveTokenColor("--color-paper")}
              stroke={ink}
              strokeWidth={QR_PLATE_BORDER}
              cornerRadius={QR_PLATE_RADIUS}
            />
            {qrImage === undefined ? (
              <Path
                data={QR_GLYPH_PATH}
                x={qrBox.x + (qrBox.width - glyphSize) / 2}
                y={qrBox.y + (qrBox.height - glyphSize) / 2}
                scaleX={glyphSize / QR_GLYPH_VIEWBOX}
                scaleY={glyphSize / QR_GLYPH_VIEWBOX}
                fill={ink}
              />
            ) : (
              <KonvaImage
                name="qr-plate"
                image={qrImage}
                x={qrBox.x}
                y={qrBox.y}
                width={qrBox.width}
                height={qrBox.height}
              />
            )}
          </Group>
        )}

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
            boxWidth={footerWidth}
            maxCenterX={
              qrBox === null
                ? undefined
                : layout.footerRect.x + footerWidth / 2
            }
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
