import Link from "next/link"
import { Sparkle } from "@phosphor-icons/react/ssr"

/* DESIGN-SYSTEM §10.1: wordmark baris atas. Kotak violet, ikon Sparkle, nama Unbounded 900. */
export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex w-fit items-center gap-2.5 rounded-thumb text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet"
    >
      <span className="flex size-10 items-center justify-center rounded-thumb border-2 border-ink bg-violet text-paper">
        <Sparkle weight="bold" className="size-[22px]" aria-hidden />
      </span>
      <span className="font-display text-2xl font-black tracking-[-0.02em]">
        snapme
      </span>
    </Link>
  )
}
