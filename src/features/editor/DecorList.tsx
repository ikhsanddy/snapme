"use client"

import type { ReactNode } from "react"
import {
  ArrowClockwise,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Trash,
  type Icon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { useBoothStore, type StickerInstance, type StripText } from "@/stores/booth"
import { STICKERS } from "./presets"

/* DESIGN-SYSTEM §11: kanvas tidak terbaca pembaca layar, jadi tiap stiker dan
   teks punya barisnya sendiri dengan tombol pindah, ukuran, putar, dan hapus.
   Seluruh penyuntingan bisa selesai tanpa penunjuk; Transformer hanya jalur
   tambahan. */

const STEP = 8
const WIDTH_STEP = 12
const FONT_STEP = 4
const ROTATE_STEP = 15

function IconAction({
  label,
  icon: ActionIcon,
  onClick,
}: {
  label: string
  icon: Icon
  onClick: () => void
}) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} onClick={onClick}>
      <ActionIcon weight="bold" className="size-5" aria-hidden />
    </Button>
  )
}

function RowShell({
  children,
  readout,
}: {
  children: ReactNode
  readout: string
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border-2 border-ink bg-paper px-3 py-2">
      <span className="flex min-w-0 flex-1 flex-col">
        {children}
        <span className="font-mono text-xs text-muted">{readout}</span>
      </span>
    </li>
  )
}

function StickerRow({
  sticker,
  label,
}: {
  sticker: StickerInstance
  label: string
}) {
  const updateSticker = useBoothStore((state) => state.updateSticker)
  const removeSticker = useBoothStore((state) => state.removeSticker)

  return (
    <RowShell
      readout={`x ${Math.round(sticker.x)} · y ${Math.round(sticker.y)} · ${Math.round(
        sticker.width
      )} px · ${Math.round(sticker.rotation)}°`}
    >
      <span className="font-bold">Stiker {label}</span>
      <span className="mt-1 flex flex-wrap gap-1">
        <IconAction
          label={`Pindah kiri: ${label}`}
          icon={ArrowLeft}
          onClick={() => updateSticker(sticker.id, { x: sticker.x - STEP })}
        />
        <IconAction
          label={`Pindah kanan: ${label}`}
          icon={ArrowRight}
          onClick={() => updateSticker(sticker.id, { x: sticker.x + STEP })}
        />
        <IconAction
          label={`Pindah atas: ${label}`}
          icon={ArrowUp}
          onClick={() => updateSticker(sticker.id, { y: sticker.y - STEP })}
        />
        <IconAction
          label={`Pindah bawah: ${label}`}
          icon={ArrowDown}
          onClick={() => updateSticker(sticker.id, { y: sticker.y + STEP })}
        />
        <IconAction
          label={`Perbesar: ${label}`}
          icon={MagnifyingGlassPlus}
          onClick={() =>
            updateSticker(sticker.id, { width: sticker.width + WIDTH_STEP })
          }
        />
        <IconAction
          label={`Perkecil: ${label}`}
          icon={MagnifyingGlassMinus}
          onClick={() =>
            updateSticker(sticker.id, { width: sticker.width - WIDTH_STEP })
          }
        />
        <IconAction
          label={`Putar: ${label}`}
          icon={ArrowClockwise}
          onClick={() =>
            updateSticker(sticker.id, { rotation: sticker.rotation + ROTATE_STEP })
          }
        />
        <IconAction
          label={`Hapus: ${label}`}
          icon={Trash}
          onClick={() => removeSticker(sticker.id)}
        />
      </span>
    </RowShell>
  )
}

function TextRow({ text }: { text: StripText }) {
  const updateText = useBoothStore((state) => state.updateText)
  const removeText = useBoothStore((state) => state.removeText)
  const label = `Teks ${text.value}`

  return (
    <RowShell readout={`ukuran ${Math.round(text.fontSize)} px`}>
      <span className="font-bold">{label}</span>
      <span className="mt-1 flex flex-wrap gap-1">
        <IconAction
          label={`Perbesar: ${label}`}
          icon={MagnifyingGlassPlus}
          onClick={() =>
            updateText(text.id, { fontSize: text.fontSize + FONT_STEP })
          }
        />
        <IconAction
          label={`Perkecil: ${label}`}
          icon={MagnifyingGlassMinus}
          onClick={() =>
            updateText(text.id, { fontSize: text.fontSize - FONT_STEP })
          }
        />
        <IconAction
          label={`Hapus: ${label}`}
          icon={Trash}
          onClick={() => removeText(text.id)}
        />
      </span>
    </RowShell>
  )
}

export function DecorList() {
  const stickers = useBoothStore((state) => state.stickers)
  const texts = useBoothStore((state) => state.texts)

  if (stickers.length === 0 && texts.length === 0) {
    return null
  }

  return (
    <section
      aria-label="Isi strip"
      className="mx-auto flex w-full max-w-[480px] flex-col gap-3"
    >
      <h3 className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
        Isi strip
      </h3>
      <ul className="flex flex-col gap-2">
        {stickers.map((sticker) => (
          <StickerRow
            key={sticker.id}
            sticker={sticker}
            label={
              STICKERS.find((asset) => asset.id === sticker.assetId)?.label ??
              sticker.assetId
            }
          />
        ))}
        {texts.map((text) => (
          <TextRow key={text.id} text={text} />
        ))}
      </ul>
    </section>
  )
}
