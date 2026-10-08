"use client"

import * as React from "react"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "group/tabs-list inline-flex w-fit items-center justify-center gap-1 rounded-pill border-2 border-ink bg-paper p-1 data-vertical:flex-col",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-pill border-2 border-ink bg-paper px-5 whitespace-nowrap select-none",
        "font-sans font-bold text-[15px] text-ink",
        "transition-[background-color,color] duration-[120ms] outline-none",
        "not-data-[state=active]:hover:bg-cream",
        "data-[state=active]:bg-ink data-[state=active]:text-paper",
        "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet",
        "disabled:pointer-events-none disabled:border-dashed disabled:bg-cream disabled:text-muted",
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 rounded-thumb text-sm focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
