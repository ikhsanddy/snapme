import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §7: tekan = hover geser -1,-1 px dengan bayangan 5 px,
   aktif geser 4,4 px tanpa bayangan, transisi 120 ms. */
const press =
  "shadow-hard hover:shadow-hard-hover hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"

const buttonVariants = cva(
  cn(
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-pill border-2 border-ink whitespace-nowrap select-none",
    "font-sans font-bold transition-[transform,box-shadow,background-color] duration-[120ms] outline-none",
    "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet",
    "disabled:pointer-events-none disabled:border-dashed disabled:bg-cream disabled:text-muted disabled:shadow-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        primary: cn("bg-primary text-primary-foreground", press),
        secondary: cn("bg-secondary text-secondary-foreground", press),
        neutral: cn("bg-paper text-ink", press),
        ghost: cn("bg-transparent text-ink hover:bg-cream", press),
      },
      size: {
        default: "h-11 gap-2 px-5 text-[15px]",
        sm: "h-11 gap-2 px-4 text-[15px]",
        lg: "h-14 gap-2.5 px-7 text-lg",
        icon: "size-11",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
