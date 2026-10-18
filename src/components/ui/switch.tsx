"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-pill border-2 border-ink outline-none",
        "transition-colors duration-[120ms]",
        "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet",
        "aria-invalid:border-danger",
        "data-checked:bg-violet data-unchecked:bg-cream",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-7 rounded-pill border-2 border-ink bg-paper transition-transform duration-[120ms] data-checked:translate-x-6 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
