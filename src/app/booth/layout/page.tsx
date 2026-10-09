"use client"

import { useRouter } from "next/navigation"
import { Check } from "@phosphor-icons/react"

import { BoothPanel } from "@/components/booth/BoothPanel"
import { Button } from "@/components/ui/button"
import { LAYOUTS, type LayoutId } from "@/lib/layouts"
import { cn } from "@/lib/utils"
import { useBoothStore } from "@/stores/booth"

/* FR-02: pilih layout menentukan jumlah foto dan rasio crop di langkah kamera. */
const DESCRIPTIONS: Record<LayoutId, string> = {
  "strip-4": "Empat pose, strip klasik 2 x 6 inci.",
  "strip-3": "Tiga pose, slot lebih tinggi untuk badan penuh.",
  "grid-2x2": "Empat pose, lembar 4R penuh.",
}

const CHOICES: LayoutId[] = ["strip-4", "strip-3", "grid-2x2"]

export default function LayoutStepPage() {
  const router = useRouter()
  const layoutId = useBoothStore((state) => state.layoutId)
  const setLayout = useBoothStore((state) => state.setLayout)

  return (
    <BoothPanel
      title="Pilih Layout"
      backHref="/"
      center={
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Pilih layout</legend>
          <div className="flex flex-wrap gap-4">
            {CHOICES.map((id) => {
              const layout = LAYOUTS[id]
              const selected = layoutId === id

              return (
                <label
                  key={id}
                  className={cn(
                    "relative flex flex-1 cursor-pointer flex-col gap-3 rounded-card border-2 border-ink bg-paper p-4",
                    "basis-[min(100%,260px)] focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-violet",
                    selected && "ring-selected"
                  )}
                >
                  <input
                    type="radio"
                    name="layout"
                    value={id}
                    checked={selected}
                    onChange={() => setLayout(id)}
                    aria-labelledby={`layout-${id}-nama`}
                    aria-describedby={`layout-${id}-catatan`}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />

                  <div
                    className={cn(
                      "grid gap-1.5 self-start rounded-thumb border-2 border-ink bg-cream p-2",
                      layout.columns === 2 ? "grid-cols-2" : "grid-cols-1"
                    )}
                  >
                    {layout.slotRects.map((rect, index) => (
                      <div
                        key={index}
                        className="w-14 rounded-sm border-2 border-ink bg-violet-soft"
                        style={{ aspectRatio: `${rect.width} / ${rect.height}` }}
                      />
                    ))}
                  </div>

                  <span id={`layout-${id}-nama`} className="title text-ink">
                    {layout.label}
                  </span>
                  <span
                    id={`layout-${id}-catatan`}
                    className="text-[15px] leading-[1.4] text-muted"
                  >
                    {DESCRIPTIONS[id]}
                  </span>
                  <span className="font-mono text-xs font-bold tracking-[0.06em] text-muted uppercase">
                    {`Ekspor ${layout.canvas.width} x ${layout.canvas.height} px`}
                  </span>

                  {selected ? (
                    <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-violet text-paper">
                      <Check weight="bold" className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>
        </fieldset>
      }
      right={
        <>
          <div className="flex flex-col gap-2 rounded-panel border-3 border-ink bg-cream p-5">
            <span className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
              Layout dipilih
            </span>
            <span className="title text-ink">
              {layoutId ? LAYOUTS[layoutId].label : "Belum dipilih"}
            </span>
            {layoutId ? (
              <span className="text-[15px] leading-[1.4] text-muted">
                {`${LAYOUTS[layoutId].shotCount} foto, ekspor ${LAYOUTS[layoutId].canvas.width} x ${LAYOUTS[layoutId].canvas.height} px.`}
              </span>
            ) : (
              <span className="text-[15px] leading-[1.4] text-muted">
                Pilih layout dulu.
              </span>
            )}
          </div>
          <Button
            size="lg"
            disabled={layoutId === null}
            className="w-full"
            onClick={() => router.push("/booth/capture")}
          >
            Mulai Foto
          </Button>
        </>
      }
    />
  )
}
