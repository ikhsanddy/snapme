"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Toggle as TogglePrimitive } from "radix-ui"

const toggleVariants = cva(
  cn(
    "group/toggle inline-flex items-center justify-center gap-2 rounded-pill border-2 border-ink whitespace-nowrap select-none",
    "bg-paper font-sans font-bold text-ink",
    "transition-[background-color,color] duration-[120ms] outline-none",
    "not-data-[state=on]:hover:bg-cream",
    "data-[state=on]:bg-ink data-[state=on]:text-paper",
    "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet",
    "aria-invalid:border-danger",
    "disabled:pointer-events-none disabled:border-dashed disabled:bg-cream disabled:text-muted",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
  ),
  {
    variants: {
      size: {
        default: "h-11 px-5 text-[15px]",
        sm: "h-11 px-4 text-[15px]",
        lg: "h-14 px-7 text-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Toggle({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
