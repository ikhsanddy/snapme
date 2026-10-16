"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  /* Nama aksesibel diteruskan ke tiap gagang, bukan ke wadahnya: Radix hanya
     memberi nama sendiri saat ada dua gagang atau lebih ("Minimum"/"Maximum"),
     jadi dengan satu gagang `role="slider"` akan tanpa nama dan lolos sebagai
     pelanggaran `aria-input-field-name`. DESIGN-SYSTEM §11: tidak ada kontrol
     tanpa nama aksesibel. */
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-pill border-2 border-ink bg-cream select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-violet select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={ariaLabel}
          className="relative block size-5 shrink-0 rounded-pill border-2 border-ink bg-paper outline-none select-none transition-colors duration-[120ms] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
