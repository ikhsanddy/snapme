import type { ReactNode } from "react"

import { Stepper } from "@/components/booth/Stepper"
import { Wordmark } from "@/components/site/Wordmark"

/* DESIGN-SYSTEM §5: kerangka semua langkah booth. */
export default function BoothLayout(props: LayoutProps<"/booth">) {
  return (
    <div className="stage-grid flex min-h-dvh flex-1 flex-col">
      <div className="page-container flex min-h-dvh flex-1 flex-col gap-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Wordmark />
          <Stepper />
        </header>
        {props.children as ReactNode}
      </div>
    </div>
  )
}
