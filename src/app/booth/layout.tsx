import type { ReactNode } from "react"

import { Stepper } from "@/components/booth/Stepper"
import { Wordmark } from "@/components/site/Wordmark"
import { SessionSync } from "@/features/session/SessionSync"

/* DESIGN-SYSTEM §5: kerangka semua langkah booth. SessionSync (FR-14) dipasang
   di sini supaya seluruh langkah booth memakai sesi yang dipulihkan. */
export default function BoothLayout(props: LayoutProps<"/booth">) {
  return (
    <div className="stage-grid flex min-h-dvh flex-1 flex-col">
      <SessionSync />
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
