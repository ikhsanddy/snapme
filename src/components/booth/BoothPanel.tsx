import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react/ssr"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* DESIGN-SYSTEM §5: Booth Shell, panel utama tiap langkah booth.
   Rel kiri dan kanan opsional; tata letak menyesuaikan rel yang ada. */
interface BoothPanelProps {
  title: string
  backHref: string
  chip?: ReactNode
  actions?: ReactNode
  left?: ReactNode
  center: ReactNode
  right?: ReactNode
}

const COLUMNS = {
  both: "lg:grid-cols-[minmax(200px,264px)_minmax(0,1fr)_minmax(240px,304px)]",
  left: "lg:grid-cols-[minmax(200px,264px)_minmax(0,1fr)]",
  right: "lg:grid-cols-[minmax(0,1fr)_minmax(240px,304px)]",
  none: "lg:grid-cols-1",
} as const

export function BoothPanel({
  title,
  backHref,
  chip,
  actions,
  left,
  center,
  right,
}: BoothPanelProps) {
  const rails = left && right ? "both" : left ? "left" : right ? "right" : "none"

  return (
    <main className="overflow-hidden rounded-panel border-3 border-ink bg-paper shadow-hard-lg">
      <div className="flex flex-wrap items-center gap-3.5 border-b-3 border-ink px-5 py-3.5">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Kembali">
            <ArrowLeft weight="bold" className="size-5" aria-hidden />
          </Link>
        </Button>
        <h1 className="display-lg">{title}</h1>
        {chip}
        {actions ? (
          <div className="ml-auto flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-5 p-5",
          rails === "none"
            ? "grid-cols-1"
            : cn("grid-cols-1 md:grid-cols-2", COLUMNS[rails])
        )}
      >
        {left ? (
          <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
            {left}
          </div>
        ) : null}

        <div
          className={cn(
            "order-1 flex min-w-0 flex-col gap-4",
            rails === "none" ? undefined : "md:col-span-2 lg:col-span-1",
            rails === "right" ? "lg:order-1" : "lg:order-2"
          )}
        >
          {center}
        </div>

        {right ? (
          <div
            className={cn(
              "order-3 flex min-w-0 flex-col gap-4 lg:order-3",
              rails === "right" && "order-2 lg:order-2"
            )}
          >
            {right}
          </div>
        ) : null}
      </div>
    </main>
  )
}
