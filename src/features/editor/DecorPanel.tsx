"use client"

import { useState } from "react"
import {
  Check,
  FrameCorners,
  Palette,
  Sticker as StickerIcon,
  TextT,
} from "@phosphor-icons/react"

import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { TEXT_LENGTH_MAX, useBoothStore } from "@/stores/booth"
import { EFFECTS, FRAMES, STICKERS, type EffectPreset } from "./presets"

/* DESIGN-SYSTEM §10.3 dan acuan `customize.html`: rel kiri halaman Hias.
   Tab pil (toggle-group) dengan kisi tiga kolom. Semua kontrol bisa dipakai
   dengan keyboard; keadaan terpilih selalu diiringi lencana centang, bukan
   hanya warna (DESIGN-SYSTEM §2). */

type DecorTab = "frame" | "efek" | "stiker" | "teks"

const TABS: { value: DecorTab; label: string; icon: typeof FrameCorners }[] = [
  { value: "frame", label: "Frame", icon: FrameCorners },
  { value: "efek", label: "Efek", icon: Palette },
  { value: "stiker", label: "Stiker", icon: StickerIcon },
  { value: "teks", label: "Teks", icon: TextT },
]

const SWATCH =
  "relative box-border border-2 border-ink outline-none transition-transform duration-[120ms] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet motion-reduce:transition-none"

const FRAME_BARS = [0, 1, 2, 3]

const EFFECT_GRADIENT =
  "linear-gradient(135deg, var(--color-pink) 0%, var(--color-pink) 50%, var(--color-lime) 50%, var(--color-lime) 100%)"
const EFFECT_PIXEL =
  "repeating-conic-gradient(var(--color-pink) 0% 25%, var(--color-lime) 0% 50%)"

function effectSwatchStyle(effect: EffectPreset) {
  if (effect.params.kind === "pixelate") {
    return {
      backgroundImage: EFFECT_PIXEL,
      backgroundSize: "16px 16px",
    }
  }
  return {
    backgroundImage: EFFECT_GRADIENT,
    filter: effect.cssPreview.length > 0 ? effect.cssPreview : undefined,
  }
}

function SelectedBadge() {
  return (
    <span className="absolute -top-2.5 -right-2.5 flex size-6 items-center justify-center rounded-pill border-2 border-ink bg-violet text-paper">
      <Check weight="bold" className="size-3" aria-hidden />
    </span>
  )
}

export function DecorPanel() {
  const frameId = useBoothStore((state) => state.frameId)
  const effectId = useBoothStore((state) => state.effectId)
  const textValue = useBoothStore((state) => state.texts[0]?.value ?? "")
  const showDate = useBoothStore((state) => state.showDate)
  const setFrame = useBoothStore((state) => state.setFrame)
  const setEffect = useBoothStore((state) => state.setEffect)
  const addSticker = useBoothStore((state) => state.addSticker)
  const setStripText = useBoothStore((state) => state.setStripText)
  const setShowDate = useBoothStore((state) => state.setShowDate)

  const [tab, setTab] = useState<DecorTab>("frame")

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        value={tab}
        onValueChange={(value) => {
          if (value !== "") {
            setTab(value as DecorTab)
          }
        }}
        aria-label="Pilihan hiasan"
        className="w-full flex-wrap justify-start gap-2 rounded-none border-0 bg-transparent p-0"
      >
        {TABS.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            <item.icon weight="bold" className="size-[18px]" aria-hidden />
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {tab === "frame" ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
            Pilih frame
          </h2>
          <div className="grid grid-cols-3 gap-3.5">
            {FRAMES.map((frame) => (
              <div key={frame.id} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={frame.id === frameId}
                  aria-label={frame.label}
                  onClick={() => setFrame(frame.id)}
                  style={{ backgroundColor: `var(${frame.bg})` }}
                  className={cn(
                    SWATCH,
                    "flex aspect-[2/3] w-full flex-col gap-1 rounded-thumb p-2 pb-3.5 hover:-translate-y-px",
                    frame.id === frameId && "ring-selected"
                  )}
                >
                  {FRAME_BARS.map((bar) => (
                    <span key={bar} className="flex-1 rounded-sm bg-cream" />
                  ))}
                  {frame.id === frameId ? <SelectedBadge /> : null}
                </button>
                <span className="font-mono text-xs font-bold">
                  {frame.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "efek" ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
            Efek foto
          </h2>
          <div className="grid grid-cols-3 gap-3.5">
            {EFFECTS.map((effect) => (
              <div key={effect.id} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={effect.id === effectId}
                  aria-label={effect.label}
                  onClick={() => setEffect(effect.id)}
                  className={cn(
                    SWATCH,
                    "aspect-square w-full rounded-thumb hover:-translate-y-px",
                    effect.id === effectId && "ring-selected"
                  )}
                >
                  <span
                    className="block size-full overflow-hidden rounded-sm"
                    style={effectSwatchStyle(effect)}
                  />
                  {effect.id === effectId ? <SelectedBadge /> : null}
                </button>
                <span className="font-mono text-xs font-bold">
                  {effect.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "stiker" ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
            Stiker
          </h2>
          <div className="grid grid-cols-3 gap-3.5">
            {STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                aria-label={`Tempel ${sticker.label}`}
                onClick={() => addSticker(sticker.id)}
                className={cn(
                  SWATCH,
                  "flex aspect-square w-full items-center justify-center rounded-card bg-paper hover:-translate-y-px"
                )}
              >
                <span
                  aria-hidden
                  className="size-9 bg-center bg-contain bg-no-repeat"
                  style={{ backgroundImage: `url(/stickers/${sticker.file})` }}
                />
              </button>
            ))}
          </div>
          <p className="text-sm leading-[1.4] text-muted">
            Ketuk untuk menempel. Geser, putar, dan ubah ukurannya di strip,
            atau pakai daftar di bawah kanvas.
          </p>
        </section>
      ) : null}

      {tab === "teks" ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
            Teks strip
          </h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="strip-text" className="text-sm font-bold">
              Teks
            </label>
            <input
              id="strip-text"
              value={textValue}
              maxLength={TEXT_LENGTH_MAX}
              placeholder="Tulis sesuatu"
              onChange={(event) => setStripText(event.target.value)}
              className="h-11 rounded-pill border-2 border-ink bg-paper px-4 font-sans text-[15px] font-medium outline-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet"
            />
            <span className="font-mono text-xs text-muted">
              {Array.from(textValue).length}/{TEXT_LENGTH_MAX}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span id="strip-date-label" className="text-sm font-bold">
              Tanggal
            </span>
            <span className="flex items-center gap-2">
              <Switch
                aria-labelledby="strip-date-label"
                checked={showDate}
                onCheckedChange={setShowDate}
              />
              <span className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
                {showDate ? "Nyala" : "Mati"}
              </span>
            </span>
          </div>
        </section>
      ) : null}
    </div>
  )
}
