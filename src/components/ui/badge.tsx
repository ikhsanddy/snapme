import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §9 (Chip / Badge): gaya `label`, pil, garis 2 px. */
const badgeVariants = cva(
  cn(
    "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border-2 border-ink px-3 py-1",
    "font-mono text-xs font-bold tracking-[0.06em] uppercase whitespace-nowrap",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        neutral: "bg-cream text-ink",
        lime: "bg-lime text-ink",
        pink: "bg-pink text-ink",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
